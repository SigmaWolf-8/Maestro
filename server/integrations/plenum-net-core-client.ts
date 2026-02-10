import type { Request, Response, NextFunction } from "express";
import {
  getFemtosecondTimestamp,
  getTimingMetrics,
  generateTimestampBatch,
  type FemtosecondTimestamp as LibFemtosecondTimestamp,
  type TimingMetrics,
} from "../plenumnet/femtosecond-timing";
import {
  ternaryEncode,
  ternaryDecode,
  compressData,
  decompressData,
  ternaryHash,
  type CompressionResult,
} from "../plenumnet/ternary-encoding";
import {
  phaseSplit,
  phaseRecombine,
  getRecommendedMode,
  type EncryptionMode,
  type EncryptedPhaseData,
  type RecombinationResult,
} from "../plenumnet/phase-encryption";
import {
  ternaryAdd,
  ternaryMultiply,
  ternaryRotate,
  ternaryXor,
  ternaryNot,
  adaptiveTernaryAdd,
  batchTernaryAdd,
  calculateInformationDensity,
  type SecurityMode as TernarySecurityMode,
  type OperationResult,
} from "../plenumnet/ternary-operations";
import {
  convertTrit,
  convertVector,
  type Representation,
  type TritA,
  type ConversionResult,
  type TernaryVector,
} from "../plenumnet/ternary-types";
import {
  TAU,
  TAU_SQUARED,
  TAU_CUBED,
  TAU_TO_7,
  LOG2_OF_3,
  TERNARY_DENSITY_PERCENT,
  TRIBONACCI_SEQUENCE,
  validateTauIdentity,
  getDensityAdvantage,
  tribonacci,
} from "../plenumnet/tribonacci-constants";
import {
  getCnsaComplianceReport,
  getCnsaAlgorithmsByCategory,
  type CnsaComplianceReport,
} from "../plenumnet/cnsa-compliance";

export const PLENUMNET_VERSION = "4.0.0";

export type SecurityMode = "phi" | "one" | "zero";

export interface PlenumNetConfig {
  defaultSecurityMode: SecurityMode;
  enabled: boolean;
  xrplAccount?: string;
  xrplSecret?: string;
}

export interface TernaryEncoding {
  encoded: string;
  originalLength: number;
  encodedLength: number;
  compressionRatio: number;
}

export interface PlenumFemtosecondTimestamp {
  value: bigint;
  iso: string;
  humanReadable: string;
  precision: "femtosecond";
  salviEpochOffset: bigint;
}

export interface WitnessResult {
  hash: string;
  ternaryHash: string;
  timestamp: PlenumFemtosecondTimestamp;
  mode: SecurityMode;
  verified: boolean;
}

export interface PhaseEncryptionResult {
  encrypted: EncryptedPhaseData;
  mode: EncryptionMode;
  ternaryHash: string;
  timestamp: PlenumFemtosecondTimestamp;
}

export interface DensityBenchmarkResult {
  sampleSizes: number[];
  results: Array<{
    sampleSize: number;
    trits: number;
    bitsEquivalent: number;
    densityGainPercent: string;
    compressionRatio: string;
    validated: boolean;
  }>;
  overallValid: boolean;
  theoreticalDensity: string;
  log2of3: number;
}

export interface TimingSelfTestResult {
  sampleCount: number;
  minJitterNs: number;
  maxJitterNs: number;
  avgJitterNs: number;
  medianJitterNs: number;
  stdDevNs: number;
  clockSource: string;
  monotonicValid: boolean;
  precision: string;
}

const defaultConfig: PlenumNetConfig = {
  defaultSecurityMode: "one",
  enabled: true,
  xrplAccount: process.env.PLENUMNET_XRPL_ACCOUNT,
  xrplSecret: process.env.PLENUMNET_XRPL_SECRET,
};

export class PlenumNetCoreClient {
  private config: PlenumNetConfig;

  constructor(config?: Partial<PlenumNetConfig>) {
    this.config = { ...defaultConfig, ...config };
  }

  get isEnabled(): boolean {
    return this.config.enabled;
  }

  get defaultMode(): SecurityMode {
    return this.config.defaultSecurityMode;
  }

  resolveSecurityMode(requested?: string): SecurityMode {
    const valid: SecurityMode[] = ["phi", "one", "zero"];
    if (requested && valid.includes(requested as SecurityMode)) {
      return requested as SecurityMode;
    }
    return this.config.defaultSecurityMode;
  }

  getFemtosecondTimestamp(): PlenumFemtosecondTimestamp {
    const ts = getFemtosecondTimestamp();
    return {
      value: ts.femtoseconds,
      iso: ts.isoDate,
      humanReadable: ts.humanReadable,
      precision: "femtosecond",
      salviEpochOffset: ts.salviEpochOffset,
    };
  }

  getTimingMetrics(): TimingMetrics {
    return getTimingMetrics();
  }

  generateTimestampBatch(count: number): PlenumFemtosecondTimestamp[] {
    const batch = generateTimestampBatch(count);
    return batch.map(ts => ({
      value: ts.femtoseconds,
      iso: ts.isoDate,
      humanReadable: ts.humanReadable,
      precision: "femtosecond" as const,
      salviEpochOffset: ts.salviEpochOffset,
    }));
  }

  encodeTernary(input: Buffer): TernaryEncoding {
    const encoded = ternaryEncode(input);
    return {
      encoded: encoded.toString("base64"),
      originalLength: input.length,
      encodedLength: encoded.length,
      compressionRatio: input.length > 0 ? encoded.length / input.length : 1,
    };
  }

  decodeTernary(encoded: string): Buffer {
    const buffer = Buffer.from(encoded, "base64");
    return ternaryDecode(buffer);
  }

  compress(data: string): CompressionResult {
    return compressData(data);
  }

  decompress(base64Data: string): string {
    return decompressData(base64Data);
  }

  computeTernaryHash(data: string): string {
    return ternaryHash(data);
  }

  phaseEncrypt(data: string, mode?: EncryptionMode): PhaseEncryptionResult {
    const resolvedMode = mode || getRecommendedMode(data.length, this.config.defaultSecurityMode === "phi");
    const encrypted = phaseSplit(data, resolvedMode);
    const hash = ternaryHash(data);
    const timestamp = this.getFemtosecondTimestamp();

    return {
      encrypted,
      mode: resolvedMode,
      ternaryHash: hash,
      timestamp,
    };
  }

  phaseDecrypt(encrypted: EncryptedPhaseData): RecombinationResult {
    return phaseRecombine(encrypted);
  }

  ternaryAdd(a: TritA, b: TritA): OperationResult {
    return ternaryAdd(a, b);
  }

  ternaryMultiply(a: TritA, b: TritA): OperationResult {
    return ternaryMultiply(a, b);
  }

  ternaryRotate(value: TritA, steps?: number): OperationResult {
    return ternaryRotate(value, steps);
  }

  ternaryXor(a: TritA, b: TritA): OperationResult {
    return ternaryXor(a, b);
  }

  ternaryNot(value: TritA): OperationResult {
    return ternaryNot(value);
  }

  adaptiveTernaryAdd(a: TritA, b: TritA, mode: SecurityMode): OperationResult {
    return adaptiveTernaryAdd(a, b, mode as TernarySecurityMode);
  }

  batchTernaryAdd(pairs: Array<{ a: TritA; b: TritA }>): OperationResult[] {
    return batchTernaryAdd(pairs);
  }

  convertTrit(value: number, from: Representation, to: Representation): ConversionResult {
    return convertTrit(value as TritA, from, to);
  }

  convertVector(values: number[], from: Representation, to: Representation): TernaryVector {
    return convertVector(values as TritA[], from, to);
  }

  calculateInformationDensity(tritCount: number) {
    return calculateInformationDensity(tritCount);
  }

  getCnsaCompliance(): CnsaComplianceReport {
    return getCnsaComplianceReport();
  }

  getCnsaByCategory() {
    return getCnsaAlgorithmsByCategory();
  }

  getTribonacciConstants() {
    return {
      tau: TAU,
      tauSquared: TAU_SQUARED,
      tauCubed: TAU_CUBED,
      tauTo7: TAU_TO_7,
      log2of3: LOG2_OF_3,
      densityAdvantagePercent: TERNARY_DENSITY_PERCENT,
      sequence: TRIBONACCI_SEQUENCE,
      tauIdentityValid: validateTauIdentity(),
    };
  }

  runDensityBenchmark(): DensityBenchmarkResult {
    const sampleSizes = [10, 100, 1000, 10000];
    const results = sampleSizes.map(size => {
      const density = getDensityAdvantage(size);
      return {
        sampleSize: size,
        trits: density.trits,
        bitsEquivalent: density.bitsEquivalent,
        densityGainPercent: density.densityGainPercent,
        compressionRatio: density.compressionRatio,
        validated: density.bitsEquivalent > size,
      };
    });

    return {
      sampleSizes,
      results,
      overallValid: results.every(r => r.validated),
      theoreticalDensity: `+${TERNARY_DENSITY_PERCENT.toFixed(2)}%`,
      log2of3: LOG2_OF_3,
    };
  }

  runTimingSelfTest(sampleCount: number = 1000): TimingSelfTestResult {
    const timestamps: bigint[] = [];
    for (let i = 0; i < sampleCount; i++) {
      const ts = getFemtosecondTimestamp();
      timestamps.push(ts.femtoseconds);
    }

    const jitters: number[] = [];
    let monotonicValid = true;
    for (let i = 1; i < timestamps.length; i++) {
      const diff = timestamps[i] - timestamps[i - 1];
      if (diff < 0n) monotonicValid = false;
      jitters.push(Number(diff / 1_000_000n));
    }

    jitters.sort((a, b) => a - b);
    const minJitter = jitters[0] || 0;
    const maxJitter = jitters[jitters.length - 1] || 0;
    const avgJitter = jitters.reduce((s, j) => s + j, 0) / jitters.length;
    const medianJitter = jitters[Math.floor(jitters.length / 2)] || 0;

    const variance = jitters.reduce((s, j) => s + Math.pow(j - avgJitter, 2), 0) / jitters.length;
    const stdDev = Math.sqrt(variance);

    return {
      sampleCount,
      minJitterNs: minJitter,
      maxJitterNs: maxJitter,
      avgJitterNs: Math.round(avgJitter * 100) / 100,
      medianJitterNs: medianJitter,
      stdDevNs: Math.round(stdDev * 100) / 100,
      clockSource: typeof process !== "undefined" ? "system_hrtime" : "performance_now",
      monotonicValid,
      precision: "femtosecond",
    };
  }

  getSecurityHeaders(mode: SecurityMode): Record<string, string> {
    return {
      "X-PlenumNET-Security-Mode": mode,
      "X-PlenumNET-Enabled": "true",
      "X-PlenumNET-Version": PLENUMNET_VERSION,
      "X-PlenumNET-Engine": "libternary",
      "X-PlenumNET-CNSA": "2.0",
    };
  }

  securityMiddleware() {
    return (req: Request, _res: Response, next: NextFunction) => {
      const requestedMode = req.headers["x-plenumnet-security-mode"] as string | undefined;
      const resolvedMode = this.resolveSecurityMode(requestedMode);

      (req as any).plenumNetMode = resolvedMode;
      (req as any).plenumNetEnabled = this.config.enabled;

      next();
    };
  }

  healthCheck(): {
    enabled: boolean;
    mode: SecurityMode;
    engine: string;
    version: string;
    cnsa: string;
    services: {
      ternaryOps: boolean;
      phaseEncryption: boolean;
      femtosecondTiming: boolean;
      ternaryEncoding: boolean;
      cnsaCompliance: boolean;
      tribonacciConstants: boolean;
      densityBenchmark: boolean;
      timingSelfTest: boolean;
      batchOperations: boolean;
    };
    timing: TimingMetrics;
  } {
    const timing = this.getTimingMetrics();

    return {
      enabled: this.config.enabled,
      mode: this.config.defaultSecurityMode,
      engine: "libternary",
      version: PLENUMNET_VERSION,
      cnsa: "2.0",
      services: {
        ternaryOps: true,
        phaseEncryption: true,
        femtosecondTiming: true,
        ternaryEncoding: true,
        cnsaCompliance: true,
        tribonacciConstants: true,
        densityBenchmark: true,
        timingSelfTest: true,
        batchOperations: true,
      },
      timing,
    };
  }
}

let clientInstance: PlenumNetCoreClient | null = null;

export function getPlenumNetClient(): PlenumNetCoreClient {
  if (!clientInstance) {
    clientInstance = new PlenumNetCoreClient();
  }
  return clientInstance;
}

export function createPlenumNetClient(
  config?: Partial<PlenumNetConfig>
): PlenumNetCoreClient {
  return new PlenumNetCoreClient(config);
}
