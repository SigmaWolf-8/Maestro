export interface LedgerWitnessResult {
  transactionId: string;
  confirmed: boolean;
  blockHeight?: number;
  consensusTimestamp?: string;
  sequenceNumber?: number;
  networkId: string;
  mode: "live" | "development";
}

export interface LedgerAdapter {
  readonly name: string;
  readonly isConfigured: boolean;
  witness(payloadHash: string, metadata: Record<string, unknown>): Promise<LedgerWitnessResult>;
  verify(transactionId: string): Promise<{ valid: boolean; details?: Record<string, unknown> }>;
}
