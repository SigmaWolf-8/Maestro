import type { Request, Response, NextFunction } from "express";
import {
  getFemtosecondTimestamp,
  getTimingMetrics,
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

  convertTrit(value: number, from: Representation, to: Representation): ConversionResult {
    return convertTrit(value as TritA, from, to);
  }

  convertVector(values: number[], from: Representation, to: Representation): TernaryVector {
    return convertVector(values as TritA[], from, to);
  }

  calculateInformationDensity(tritCount: number) {
    return calculateInformationDensity(tritCount);
  }

  getSecurityHeaders(mode: SecurityMode): Record<string, string> {
    return {
      "X-PlenumNET-Security-Mode": mode,
      "X-PlenumNET-Enabled": "true",
      "X-PlenumNET-Version": "3.2.1",
      "X-PlenumNET-Engine": "libternary",
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
    services: { ternaryOps: boolean; phaseEncryption: boolean; femtosecondTiming: boolean; ternaryEncoding: boolean };
    timing: TimingMetrics;
  } {
    const timing = this.getTimingMetrics();

    return {
      enabled: this.config.enabled,
      mode: this.config.defaultSecurityMode,
      engine: "libternary",
      version: "3.2.1",
      services: {
        ternaryOps: true,
        phaseEncryption: true,
        femtosecondTiming: true,
        ternaryEncoding: true,
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
