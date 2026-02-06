import type { Request, Response, NextFunction } from "express";

export type SecurityMode = "phi" | "one" | "zero";

export interface PlenumNetConfig {
  defaultSecurityMode: SecurityMode;
  enabled: boolean;
  xrplAccount?: string;
  xrplSecret?: string;
  tpuEndpoint?: string;
  timingEndpoint?: string;
  witnessEndpoint?: string;
}

export interface TernaryEncoding {
  encoded: string;
  originalLength: number;
  compressionRatio: number;
}

export interface FemtosecondTimestamp {
  value: bigint;
  iso: string;
  precision: "femtosecond" | "nanosecond" | "microsecond";
}

export interface WitnessResult {
  hash: string;
  xrplTxHash?: string;
  timestamp: FemtosecondTimestamp;
  mode: SecurityMode;
  verified: boolean;
}

export interface PhaseRotationResult {
  encrypted: string;
  phaseOffset: number;
  mode: SecurityMode;
}

const defaultConfig: PlenumNetConfig = {
  defaultSecurityMode: "one",
  enabled: process.env.ENABLE_PLENUMNET === "true",
  xrplAccount: process.env.PLENUMNET_XRPL_ACCOUNT,
  xrplSecret: process.env.PLENUMNET_XRPL_SECRET,
  tpuEndpoint: process.env.PLENUMNET_TPU_ENDPOINT || "http://localhost:9090/tpu",
  timingEndpoint: process.env.PLENUMNET_TIMING_ENDPOINT || "http://localhost:9091/timing",
  witnessEndpoint: process.env.PLENUMNET_WITNESS_ENDPOINT || "http://localhost:9092/witness",
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
    if (!this.config.enabled) return "zero";
    const valid: SecurityMode[] = ["phi", "one", "zero"];
    if (requested && valid.includes(requested as SecurityMode)) {
      return requested as SecurityMode;
    }
    return this.config.defaultSecurityMode;
  }

  async getFemtosecondTimestamp(): Promise<FemtosecondTimestamp> {
    if (!this.config.enabled) {
      return {
        value: BigInt(Date.now()) * BigInt(1_000_000_000),
        iso: new Date().toISOString(),
        precision: "microsecond",
      };
    }

    try {
      const response = await fetch(`${this.config.timingEndpoint}/now`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Timing service error: ${response.status}`);
      }

      const data = await response.json() as { value: string; iso: string; precision: string };
      return {
        value: BigInt(data.value),
        iso: data.iso,
        precision: data.precision as FemtosecondTimestamp["precision"],
      };
    } catch {
      return {
        value: BigInt(Date.now()) * BigInt(1_000_000_000),
        iso: new Date().toISOString(),
        precision: "microsecond",
      };
    }
  }

  async encodeTernary(input: Buffer): Promise<TernaryEncoding> {
    if (!this.config.enabled) {
      return {
        encoded: input.toString("base64"),
        originalLength: input.length,
        compressionRatio: 1.0,
      };
    }

    try {
      const response = await fetch(`${this.config.tpuEndpoint}/encode`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: input,
      });

      if (!response.ok) {
        throw new Error(`TPU encode error: ${response.status}`);
      }

      const data = await response.json() as TernaryEncoding;
      return data;
    } catch {
      return {
        encoded: input.toString("base64"),
        originalLength: input.length,
        compressionRatio: 1.0,
      };
    }
  }

  async decodeTernary(encoded: string): Promise<Buffer> {
    if (!this.config.enabled) {
      return Buffer.from(encoded, "base64");
    }

    try {
      const response = await fetch(`${this.config.tpuEndpoint}/decode`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: encoded,
      });

      if (!response.ok) {
        throw new Error(`TPU decode error: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch {
      return Buffer.from(encoded, "base64");
    }
  }

  async applyPhaseRotation(
    data: string,
    mode: SecurityMode
  ): Promise<PhaseRotationResult> {
    if (!this.config.enabled || mode === "zero") {
      return {
        encrypted: data,
        phaseOffset: 0,
        mode,
      };
    }

    try {
      const response = await fetch(`${this.config.tpuEndpoint}/phase-rotate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PlenumNET-Security-Mode": mode,
        },
        body: JSON.stringify({ data, mode }),
      });

      if (!response.ok) {
        throw new Error(`Phase rotation error: ${response.status}`);
      }

      return await response.json() as PhaseRotationResult;
    } catch {
      return { encrypted: data, phaseOffset: 0, mode };
    }
  }

  async witnessToXRPL(
    hash: string,
    metadata: Record<string, unknown>
  ): Promise<WitnessResult> {
    const timestamp = await this.getFemtosecondTimestamp();

    if (!this.config.enabled || !this.config.xrplAccount) {
      return {
        hash,
        timestamp,
        mode: "zero",
        verified: false,
      };
    }

    try {
      const response = await fetch(`${this.config.witnessEndpoint}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PlenumNET-Security-Mode": "phi",
        },
        body: JSON.stringify({
          hash,
          metadata,
          account: this.config.xrplAccount,
          timestamp: timestamp.value.toString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Witness service error: ${response.status}`);
      }

      const data = await response.json() as { xrplTxHash: string; verified: boolean };
      return {
        hash,
        xrplTxHash: data.xrplTxHash,
        timestamp,
        mode: "phi",
        verified: data.verified,
      };
    } catch {
      return { hash, timestamp, mode: "phi", verified: false };
    }
  }

  getSecurityHeaders(mode: SecurityMode): Record<string, string> {
    return {
      "X-PlenumNET-Security-Mode": mode,
      "X-PlenumNET-Enabled": this.config.enabled ? "true" : "false",
      "X-PlenumNET-Version": "3.0",
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

  async healthCheck(): Promise<{
    enabled: boolean;
    mode: SecurityMode;
    services: { tpu: boolean; timing: boolean; witness: boolean };
  }> {
    const checkService = async (url: string): Promise<boolean> => {
      try {
        const response = await fetch(`${url}/health`, {
          method: "GET",
          signal: AbortSignal.timeout(3000),
        });
        return response.ok;
      } catch {
        return false;
      }
    };

    if (!this.config.enabled) {
      return {
        enabled: false,
        mode: this.config.defaultSecurityMode,
        services: { tpu: false, timing: false, witness: false },
      };
    }

    const [tpu, timing, witness] = await Promise.all([
      checkService(this.config.tpuEndpoint!),
      checkService(this.config.timingEndpoint!),
      checkService(this.config.witnessEndpoint!),
    ]);

    return {
      enabled: true,
      mode: this.config.defaultSecurityMode,
      services: { tpu, timing, witness },
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
