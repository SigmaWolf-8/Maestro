export interface HptpTimestamp { timestamp: string; precision: string; [key: string]: any }
export interface TldsaKeypair { keyId: string; publicKey: string; securityLevel: string; [key: string]: any }
export interface TldsaSignature { signature: string; keyId: string; [key: string]: any }
export interface TldsaVerification { valid: boolean; [key: string]: any }
export interface TlkemKeypair { keyId: string; publicKey: string; privateKey: string; [key: string]: any }
export interface TlkemEncapsulation { ciphertext: string; sharedSecret: string; [key: string]: any }
export interface PlenumNETHealth { status: string; endpoints: any; [key: string]: any }

export class PlenumNETClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.PLENUMNET_BASE_URL || "https://plenumnet.replit.app";
  }

  private async get<T = any>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "GET",
        headers: { "Accept": "application/json" },
      });
    } catch (err: any) {
      throw new Error(`PlenumNET GET ${path} network error: ${err.message}`);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`PlenumNET GET ${path} failed (${res.status}): ${body}`);
    }
    return res.json() as Promise<T>;
  }

  private async post<T = any>(path: string, body: any): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err: any) {
      throw new Error(`PlenumNET POST ${path} network error: ${err.message}`);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`PlenumNET POST ${path} failed (${res.status}): ${body}`);
    }
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await res.text().catch(() => "");
      throw new Error(`PlenumNET POST ${path} returned non-JSON response (${contentType}): ${text.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  }

  // ── HPTP Femtosecond Timing ──

  async getTimestamp(): Promise<HptpTimestamp> {
    return this.get<HptpTimestamp>("/api/salvi/timing/timestamp");
  }

  async selfTest(): Promise<any> {
    return this.get("/api/salvi/timing/self-test");
  }

  async getErrorBudget(): Promise<any> {
    return this.get("/api/salvi/timing/error-budget");
  }

  async getTimingMetrics(): Promise<any> {
    return this.get("/api/salvi/timing/metrics");
  }

  async getBatchTimestamps(count: number): Promise<any> {
    return this.get(`/api/salvi/timing/batch/${count}`);
  }

  // ── Phase Encryption ──

  async getPhaseConfig(mode: string): Promise<any> {
    return this.get(`/api/salvi/phase/config/${mode}`);
  }

  async phaseSplit(data: string): Promise<any> {
    return this.post("/api/salvi/phase/split", { data });
  }

  async phaseRecombine(parts: any): Promise<any> {
    return this.post("/api/salvi/phase/recombine", { parts });
  }

  async getPhaseRecommendation(): Promise<any> {
    return this.get("/api/salvi/phase/recommend");
  }

  async batchPhaseSplit(items: Array<{ id: string; data: string; mode?: string }>): Promise<{
    summary: { total: number; succeeded: number; failed: number };
    results: Array<{ id: string; success: boolean; encrypted?: any; error?: string }>;
  }> {
    return this.post("/api/salvi/phase/batch/split", { items });
  }

  async batchPhaseRecombine(items: Array<{ id: string; encrypted: any }>): Promise<{
    summary: { total: number; succeeded: number; failed: number };
    results: Array<{ id: string; success: boolean; data?: string; error?: string }>;
  }> {
    return this.post("/api/salvi/phase/batch/recombine", { items });
  }

  // ── Ternary Computing ──

  async ternaryConvert(value: string, from: string, to: string): Promise<any> {
    return this.post("/api/salvi/ternary/convert", { value, from, to });
  }

  async ternaryAdd(a: string, b: string): Promise<any> {
    return this.post("/api/salvi/ternary/add", { a, b });
  }

  async ternaryMultiply(a: string, b: string): Promise<any> {
    return this.post("/api/salvi/ternary/multiply", { a, b });
  }

  async ternaryRotate(value: string, positions: number): Promise<any> {
    return this.post("/api/salvi/ternary/rotate", { value, positions });
  }

  async ternaryNot(value: string): Promise<any> {
    return this.post("/api/salvi/ternary/not", { value });
  }

  async ternaryXor(a: string, b: string): Promise<any> {
    return this.post("/api/salvi/ternary/xor", { a, b });
  }

  async ternaryBatch(operations: any[]): Promise<any> {
    return this.post("/api/salvi/ternary/batch", { operations });
  }

  async getDensity(tritCount: number): Promise<any> {
    return this.get(`/api/salvi/ternary/density/${tritCount}`);
  }

  async getDensityBenchmark(): Promise<any> {
    return this.get("/api/salvi/ternary/density-benchmark");
  }

  async verifyNoether(gauge: any): Promise<any> {
    return this.post("/api/salvi/ternary/noether-verify", { gauge });
  }

  // ── PQTI TL-DSA Signing ──

  async tldsaKeygen(securityLevel: string = "TL-DSA-87"): Promise<TldsaKeypair> {
    return this.post<TldsaKeypair>("/api/pqti/tldsa/keygen", { securityLevel });
  }

  async tldsaSign(hash: string, keyId: string, securityLevel?: string): Promise<TldsaSignature> {
    return this.post<TldsaSignature>("/api/pqti/tldsa/sign", { hash, keyId, securityLevel });
  }

  async tldsaVerify(hash: string, signature: string, keyId: string): Promise<TldsaVerification> {
    return this.post<TldsaVerification>("/api/pqti/tldsa/verify", { hash, signature, keyId });
  }

  async tldsaExport(signature: string, format?: string): Promise<any> {
    return this.post("/api/pqti/tldsa/export", { signature, format });
  }

  async tldsaGetPublicKey(keyId: string): Promise<any> {
    return this.get(`/api/pqti/tldsa/public-key/${keyId}`);
  }

  // ── PQTI TL-KEM Key Encapsulation ──

  async tlkemKeygen(securityLevel?: string): Promise<TlkemKeypair> {
    return this.post<TlkemKeypair>("/api/pqti/tlkem/keygen", { securityLevel });
  }

  async tlkemEncapsulate(publicKey: string): Promise<TlkemEncapsulation> {
    return this.post<TlkemEncapsulation>("/api/pqti/tlkem/encapsulate", { publicKey });
  }

  async tlkemDecapsulate(ciphertext: string, privateKey: string): Promise<any> {
    return this.post("/api/pqti/tlkem/decapsulate", { ciphertext, privateKey });
  }

  // ── Health ──

  async health(): Promise<PlenumNETHealth> {
    return this.get<PlenumNETHealth>("/api/pqti/health");
  }
}

export const plenumnet = new PlenumNETClient();
