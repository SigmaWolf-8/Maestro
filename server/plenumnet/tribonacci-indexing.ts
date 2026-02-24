import { db } from "../db";
import { sql } from "drizzle-orm";
import {
  TRIBONACCI_SEQUENCE,
  tribonacci,
  TAU,
  TAU_SQUARED,
  HASH_SEED,
  HASH_MIX,
  HASH_MODULUS,
  HASH_FINALIZATION_ROUNDS,
} from "./tribonacci-constants";

const SHARD_COUNT = 28;
const WBS_DIMENSION_COUNT = 13;

export interface TribonacciHashResult {
  input: string;
  hash: string;
  shardIndex: number;
  shardCount: number;
  wbsDimensionMapping: number;
}

export interface TribIdResult {
  id: string;
  shardIndex: number;
  timestamp: number;
  sequencePosition: number;
}

export interface ShardLookupResult {
  shardIndex: number;
  workerIndex: number;
  coverageStart: number;
  coverageEnd: number;
  dimensionMappings: number[];
}

export function tradHash28(input: string): number {
  let hash = Number(HASH_SEED);
  for (let i = 0; i < input.length; i++) {
    hash = ((hash * Number(HASH_MIX)) + input.charCodeAt(i)) % Number(HASH_MODULUS);
    hash = hash ^ (hash >> 7);
  }
  for (let r = 0; r < HASH_FINALIZATION_ROUNDS; r++) {
    hash = ((hash * Number(HASH_MIX)) + r) % Number(HASH_MODULUS);
  }
  return Math.abs(hash) % SHARD_COUNT;
}

export function tribonacciHash(input: string): TribonacciHashResult {
  const shardIndex = tradHash28(input);

  let hashAccum = HASH_SEED;
  for (let i = 0; i < input.length; i++) {
    hashAccum = (hashAccum * HASH_MIX + BigInt(input.charCodeAt(i))) % HASH_MODULUS;
    hashAccum = hashAccum ^ (hashAccum >> 7n);
  }
  for (let r = 0; r < HASH_FINALIZATION_ROUNDS; r++) {
    hashAccum = (hashAccum * HASH_MIX + BigInt(r)) % HASH_MODULUS;
  }
  const hashHex = hashAccum.toString(16).padStart(12, "0");

  const wbsDimensionMapping = shardIndex % WBS_DIMENSION_COUNT;

  return {
    input,
    hash: hashHex,
    shardIndex,
    shardCount: SHARD_COUNT,
    wbsDimensionMapping,
  };
}

let sequenceCounter = 0;

export function generateTribId(prefix: string = "trib"): TribIdResult {
  const now = Date.now();
  sequenceCounter = (sequenceCounter + 1) % 1000000;

  const shardIndex = tradHash28(`${prefix}-${now}-${sequenceCounter}`);

  const tribPart = tribonacci(7 + (shardIndex % 8));
  const timePart = (now % 1000000000).toString(36);
  const seqPart = sequenceCounter.toString(36).padStart(4, "0");
  const shardPart = shardIndex.toString(36).padStart(2, "0");

  const id = `${prefix}_${shardPart}${timePart}${seqPart}_t${tribPart}`;

  return {
    id,
    shardIndex,
    timestamp: now,
    sequencePosition: sequenceCounter,
  };
}

export function nextWorker(currentShard: number): number {
  const tauStep = Math.floor(TAU * 7) % SHARD_COUNT;
  return (currentShard + tauStep) % SHARD_COUNT;
}

export function skipLookup(shardIndex: number): ShardLookupResult {
  const coverageWidth = Math.floor(Number(HASH_MODULUS) / SHARD_COUNT);
  const coverageStart = shardIndex * coverageWidth;
  const coverageEnd = coverageStart + coverageWidth - 1;

  const workerIndex = Math.floor(shardIndex / Math.ceil(SHARD_COUNT / WBS_DIMENSION_COUNT));

  const dimensionMappings: number[] = [];
  for (let d = 0; d < WBS_DIMENSION_COUNT; d++) {
    if ((shardIndex + d) % WBS_DIMENSION_COUNT === d % WBS_DIMENSION_COUNT ||
        shardIndex % WBS_DIMENSION_COUNT === d) {
      dimensionMappings.push(d);
    }
  }

  return {
    shardIndex,
    workerIndex,
    coverageStart,
    coverageEnd,
    dimensionMappings,
  };
}

export function getShardForWbsCode(codePath: string, tenantId: string): number {
  return tradHash28(`${tenantId}:${codePath}`);
}

export function getShardDistribution(keys: string[]): Map<number, string[]> {
  const distribution = new Map<number, string[]>();
  for (const key of keys) {
    const shard = tradHash28(key);
    if (!distribution.has(shard)) {
      distribution.set(shard, []);
    }
    distribution.get(shard)!.push(key);
  }
  return distribution;
}

export async function installTribonacciFunctions(): Promise<{ success: boolean; functions: string[]; error?: string }> {
  try {
    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS plenumnet`);

    await db.execute(sql`
      CREATE OR REPLACE FUNCTION plenumnet.trad_hash_28(input_text TEXT)
      RETURNS INTEGER AS $$
      DECLARE
        hash_val BIGINT := 3383596;
        mix_val BIGINT := 5765;
        mod_val BIGINT := 387420489;
        i INTEGER;
        r INTEGER;
      BEGIN
        FOR i IN 1..LENGTH(input_text) LOOP
          hash_val := ((hash_val * mix_val) + ASCII(SUBSTR(input_text, i, 1))) % mod_val;
          hash_val := hash_val # (hash_val >> 7);
        END LOOP;
        FOR r IN 0..12 LOOP
          hash_val := ((hash_val * mix_val) + r) % mod_val;
        END LOOP;
        RETURN ABS(hash_val) % 28;
      END;
      $$ LANGUAGE plpgsql IMMUTABLE
    `);

    await db.execute(sql`
      CREATE OR REPLACE FUNCTION plenumnet.tribonacci_hash(input_text TEXT)
      RETURNS TEXT AS $$
      DECLARE
        hash_val BIGINT := 3383596;
        mix_val BIGINT := 5765;
        mod_val BIGINT := 387420489;
        i INTEGER;
        r INTEGER;
      BEGIN
        FOR i IN 1..LENGTH(input_text) LOOP
          hash_val := ((hash_val * mix_val) + ASCII(SUBSTR(input_text, i, 1))) % mod_val;
          hash_val := hash_val # (hash_val >> 7);
        END LOOP;
        FOR r IN 0..12 LOOP
          hash_val := ((hash_val * mix_val) + r) % mod_val;
        END LOOP;
        RETURN LPAD(TO_HEX(ABS(hash_val)), 12, '0');
      END;
      $$ LANGUAGE plpgsql IMMUTABLE
    `);

    await db.execute(sql`
      CREATE OR REPLACE FUNCTION plenumnet.generate_trib_id(prefix TEXT DEFAULT 'trib')
      RETURNS TEXT AS $$
      DECLARE
        now_ms BIGINT;
        shard INTEGER;
        time_part TEXT;
        seq_part TEXT;
      BEGIN
        now_ms := EXTRACT(EPOCH FROM NOW())::BIGINT * 1000;
        shard := plenumnet.trad_hash_28(prefix || '-' || now_ms::TEXT || '-' || (RANDOM() * 999999)::INTEGER::TEXT);
        time_part := LPAD(TO_HEX(now_ms % 1000000000), 8, '0');
        seq_part := LPAD(TO_HEX((RANDOM() * 999999)::INTEGER), 5, '0');
        RETURN prefix || '_' || LPAD(TO_HEX(shard), 2, '0') || time_part || seq_part || '_t' || (shard % 13 + 7)::TEXT;
      END;
      $$ LANGUAGE plpgsql VOLATILE
    `);

    await db.execute(sql`
      CREATE OR REPLACE FUNCTION plenumnet.next_worker(current_shard INTEGER)
      RETURNS INTEGER AS $$
      DECLARE
        tau_step INTEGER := 12;
      BEGIN
        RETURN (current_shard + tau_step) % 28;
      END;
      $$ LANGUAGE plpgsql IMMUTABLE
    `);

    await db.execute(sql`
      CREATE OR REPLACE FUNCTION plenumnet.skip_lookup(shard_index INTEGER)
      RETURNS TABLE(
        worker_index INTEGER,
        coverage_start BIGINT,
        coverage_end BIGINT
      ) AS $$
      DECLARE
        coverage_width BIGINT := 387420489 / 28;
      BEGIN
        worker_index := shard_index / CEIL(28.0 / 13)::INTEGER;
        coverage_start := shard_index::BIGINT * coverage_width;
        coverage_end := coverage_start + coverage_width - 1;
        RETURN NEXT;
      END;
      $$ LANGUAGE plpgsql IMMUTABLE
    `);

    return {
      success: true,
      functions: [
        "plenumnet.trad_hash_28",
        "plenumnet.tribonacci_hash",
        "plenumnet.generate_trib_id",
        "plenumnet.next_worker",
        "plenumnet.skip_lookup",
      ],
    };
  } catch (error: any) {
    console.error("[TribonacciIndexing] Error installing functions:", error);
    return {
      success: false,
      functions: [],
      error: error.message,
    };
  }
}

export async function testTribonacciFunctions(): Promise<{
  success: boolean;
  results: Record<string, any>;
  error?: string;
}> {
  try {
    const hashResult = await db.execute(
      sql`SELECT plenumnet.trad_hash_28('test-wbs-code') as shard_index`
    );
    const tribHashResult = await db.execute(
      sql`SELECT plenumnet.tribonacci_hash('test-wbs-code') as hash_value`
    );
    const tribIdResult = await db.execute(
      sql`SELECT plenumnet.generate_trib_id('wbs') as trib_id`
    );
    const nextWorkerResult = await db.execute(
      sql`SELECT plenumnet.next_worker(5) as next_shard`
    );
    const skipResult = await db.execute(
      sql`SELECT * FROM plenumnet.skip_lookup(5)`
    );

    return {
      success: true,
      results: {
        trad_hash_28: (hashResult as any).rows?.[0] || hashResult,
        tribonacci_hash: (tribHashResult as any).rows?.[0] || tribHashResult,
        generate_trib_id: (tribIdResult as any).rows?.[0] || tribIdResult,
        next_worker: (nextWorkerResult as any).rows?.[0] || nextWorkerResult,
        skip_lookup: (skipResult as any).rows?.[0] || skipResult,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      results: {},
      error: error.message,
    };
  }
}
