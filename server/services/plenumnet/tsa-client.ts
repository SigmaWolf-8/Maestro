import * as crypto from 'crypto';

export const TSA_POLICY_OIDS = {
  DEFAULT:   '1.3.6.1.4.1.0.100.1.0',
  COMPLY:    '1.3.6.1.4.1.0.100.1.1',
  FORENSICS: '1.3.6.1.4.1.0.100.1.2',
  SENTINEL:  '1.3.6.1.4.1.0.100.1.3',
  SECURE:    '1.3.6.1.4.1.0.100.1.4',
} as const;

export type PolicyTier = keyof typeof TSA_POLICY_OIDS;

export interface TimestampRequest {
  hash: string;
  algorithm: 'sha256' | 'sha384' | 'sha512' | 'sha3-256' | 'sha3-384' | 'sha3-512';
  policy?: string;
  nonce?: string;
  includeChain?: boolean;
}

export interface TimestampResponse {
  success: boolean;
  granted: boolean;
  serialNumber: string;
  genTime: string;
  policy: string;
  policyTier: string;
  policyName: string;
  token: string;
  accuracy: { seconds: number; micros: number };
  ordering: boolean;
  hptpTimestamp: string;
  hptpPrecision: string;
  hptpSource: string;
  tldsaSignature: string | null;
  tldsaKeyId: string | null;
  merkleLeafHash: string;
  merkleRoot: string;
  verificationUrl: string;
  certificateUrl: string;
}

export interface VerificationResponse {
  valid: boolean;
  serialNumber: string;
  genTime: string;
  hashAlgorithm: string;
  policyOid: string;
  policyTier: string;
  policyName: string;
  accuracy: { seconds: number; micros: number };
  ordering: boolean;
  signerSubject: string;
  tldsaPresent: boolean;
  verificationMethod: string;
  reason?: string;
}

export interface TsaHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  hptpAvailable: boolean;
  tldsaAvailable: boolean;
  tsaKeyLoaded: boolean;
  tsaCertValid: boolean;
  dualSignEnabled: boolean;
  merkleTreeDepth: number;
}

export class PlenumNetTsaClient {
  private baseUrl: string;
  private authToken: string;

  constructor(baseUrl: string, authToken: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.authToken = authToken;
  }

  async timestampData(
    data: Buffer | string,
    policy: PolicyTier = 'DEFAULT',
  ): Promise<TimestampResponse> {
    const hash = crypto.createHash('sha256')
      .update(typeof data === 'string' ? Buffer.from(data) : data)
      .digest('hex');

    const nonce = crypto.randomBytes(16).toString('hex');

    return this.requestTimestamp({
      hash,
      algorithm: 'sha256',
      policy: TSA_POLICY_OIDS[policy],
      nonce,
      includeChain: false,
    });
  }

  async timestampDocument(
    documentBuffer: Buffer,
    policy: PolicyTier = 'FORENSICS',
  ): Promise<{ documentHash: string; timestamp: TimestampResponse }> {
    const documentHash = crypto.createHash('sha256').update(documentBuffer).digest('hex');
    const nonce = crypto.randomBytes(16).toString('hex');

    const timestamp = await this.requestTimestamp({
      hash: documentHash,
      algorithm: 'sha256',
      policy: TSA_POLICY_OIDS[policy],
      nonce,
      includeChain: true,
    });

    return { documentHash, timestamp };
  }

  async timestampEvent(
    eventPayload: Record<string, unknown>,
    policy: PolicyTier = 'DEFAULT',
  ): Promise<TimestampResponse> {
    const serialized = JSON.stringify(eventPayload, Object.keys(eventPayload).sort());
    return this.timestampData(serialized, policy);
  }

  async requestTimestamp(request: TimestampRequest): Promise<TimestampResponse> {
    return this.post<TimestampResponse>('/api/tsa/timestamp/json', request);
  }

  async verifyToken(base64Token: string): Promise<VerificationResponse> {
    return this.post<VerificationResponse>('/api/tsa/verify', { token: base64Token });
  }

  async verifyDocumentIntegrity(
    documentBuffer: Buffer,
    storedHash: string,
    storedToken?: string,
  ): Promise<{
    hashMatch: boolean;
    currentHash: string;
    storedHash: string;
    tokenVerification: VerificationResponse | null;
  }> {
    const currentHash = crypto.createHash('sha256').update(documentBuffer).digest('hex');
    const hashMatch = currentHash === storedHash;

    let tokenVerification: VerificationResponse | null = null;
    if (storedToken && hashMatch) {
      try {
        tokenVerification = await this.verifyToken(storedToken);
      } catch {
        // Verification service unavailable — hash match is still valid locally
      }
    }

    return { hashMatch, currentHash, storedHash, tokenVerification };
  }

  async checkHealth(): Promise<TsaHealthResponse> {
    return this.get<TsaHealthResponse>('/api/tsa/health');
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.authToken}`,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => response.statusText);
      throw new Error(`PlenumNET TSA error (${response.status}): ${errBody}`);
    }
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text().catch(() => '');
      throw new Error(`PlenumNET TSA returned non-JSON (${contentType}): ${text.slice(0, 200)}`);
    }
    return response.json() as Promise<T>;
  }

  private async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.authToken}`,
      },
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => response.statusText);
      throw new Error(`PlenumNET TSA error (${response.status}): ${errBody}`);
    }
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text().catch(() => '');
      throw new Error(`PlenumNET TSA returned non-JSON (${contentType}): ${text.slice(0, 200)}`);
    }
    return response.json() as Promise<T>;
  }
}
