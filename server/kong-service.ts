const KONG_BASE_URL = 'https://kong-9e76b3c08eusfq1zu.kongcloud.dev';

export interface TimestampResponse {
  success: boolean;
  timestamp: {
    femtoseconds: string;
    humanReadable: string;
    isoDate: string;
    precision: string;
    salviEpochOffset: string;
  };
  epoch: {
    salviEpoch: string;
    description: string;
  };
}

export interface PhaseEncryptedData {
  mode: string;
  encrypted: string;
  primaryPhase: number;
  secondaryOffset: number;
  checksum: string;
}

export interface PhaseEncryptResponse {
  success: boolean;
  encrypted: PhaseEncryptedData;
  originalSize: number;
  encryptedSize: number;
}

export interface PhaseDecryptResponse {
  success: boolean;
  data: string;
  mode: string;
}

export interface TernaryConvertResponse {
  success: boolean;
  original: number;
  from: string;
  to: string;
  result: number;
}

export interface DemoStats {
  totalRuns: number;
  avgSavings: string;
  totalDataProcessed: number;
  totalSavings: number;
  recentBenchmarks: Array<{
    id: number;
    sessionId: string;
    datasetName: string;
    binarySizeBytes: number;
    ternarySizeBytes: number;
    savingsPercent: number;
    processingTimeMs: number;
    createdAt: string;
  }>;
}

class KongService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = KONG_BASE_URL;
  }

  async getTimestamp(): Promise<TimestampResponse> {
    const response = await fetch(`${this.baseUrl}/api/timing/timestamp`);
    if (!response.ok) {
      throw new Error(`Kong timing API error: ${response.status}`);
    }
    return response.json() as Promise<TimestampResponse>;
  }

  async encryptData(data: string, mode: 'high_security' | 'balanced' | 'performance' | 'adaptive' = 'balanced'): Promise<PhaseEncryptResponse> {
    const response = await fetch(`${this.baseUrl}/api/phase/split`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, mode })
    });
    if (!response.ok) {
      throw new Error(`Kong phase encrypt API error: ${response.status}`);
    }
    return response.json() as Promise<PhaseEncryptResponse>;
  }

  async decryptData(encrypted: PhaseEncryptedData): Promise<PhaseDecryptResponse> {
    const response = await fetch(`${this.baseUrl}/api/phase/recombine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ encrypted })
    });
    if (!response.ok) {
      throw new Error(`Kong phase decrypt API error: ${response.status}`);
    }
    return response.json() as Promise<PhaseDecryptResponse>;
  }

  async getPhaseConfig(mode: 'high_security' | 'balanced' | 'performance' | 'adaptive' = 'balanced'): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/phase/config/${mode}`);
    if (!response.ok) {
      throw new Error(`Kong phase config API error: ${response.status}`);
    }
    return response.json();
  }

  async convertTernary(value: number, from: 'A' | 'B' | 'C', to: 'A' | 'B' | 'C'): Promise<TernaryConvertResponse> {
    const response = await fetch(`${this.baseUrl}/api/ternary/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value, from, to })
    });
    if (!response.ok) {
      throw new Error(`Kong ternary convert API error: ${response.status}`);
    }
    return response.json() as Promise<TernaryConvertResponse>;
  }

  async getDemoStats(): Promise<DemoStats> {
    const response = await fetch(`${this.baseUrl}/api/demo/stats`);
    if (!response.ok) {
      throw new Error(`Kong demo stats API error: ${response.status}`);
    }
    return response.json() as Promise<DemoStats>;
  }

  async getApiDocs(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/docs`);
    if (!response.ok) {
      throw new Error(`Kong docs API error: ${response.status}`);
    }
    return response.json();
  }

  async compressData(data: string): Promise<{ compressed: string; originalSize: number; compressedSize: number; savingsPercent: number }> {
    const originalSize = Buffer.byteLength(data, 'utf8');
    
    const encryptResult = await this.encryptData(data, 'performance');
    
    const compressedSize = encryptResult.encryptedSize;
    const savingsPercent = originalSize > 0 
      ? ((originalSize - compressedSize) / originalSize) * 100 
      : 0;

    return {
      compressed: JSON.stringify(encryptResult.encrypted),
      originalSize,
      compressedSize,
      savingsPercent
    };
  }

  async decompressData(compressedData: string): Promise<string> {
    const encrypted = JSON.parse(compressedData) as PhaseEncryptedData;
    const result = await this.decryptData(encrypted);
    return result.data;
  }
}

export const kongService = new KongService();
