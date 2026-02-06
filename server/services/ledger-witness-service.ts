import type { LedgerWitnessReceipt } from "../../shared/types/billing";
import type { LedgerProvider } from "../../shared/types/subscriptions";

export class LedgerWitnessService {
  async witnessTransaction(
    provider: LedgerProvider,
    payload: Record<string, unknown>
  ): Promise<LedgerWitnessReceipt> {
    if (provider === "algorand") {
      return this.witnessAlgorand(payload);
    }
    return this.witnessHedera(payload);
  }

  private async witnessAlgorand(payload: Record<string, unknown>): Promise<LedgerWitnessReceipt> {
    const txId = `algo_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    return {
      provider: "algorand",
      transactionId: txId,
      algorandRound: Math.floor(Date.now() / 1000),
      algorandAppId: 0,
      timestamp: new Date(),
      payload,
    };
  }

  private async witnessHedera(payload: Record<string, unknown>): Promise<LedgerWitnessReceipt> {
    const txId = `hedera_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    return {
      provider: "hedera",
      transactionId: txId,
      hederaConsensusTimestamp: new Date().toISOString(),
      hederaTopicSequenceNumber: Math.floor(Math.random() * 100000),
      timestamp: new Date(),
      payload,
    };
  }

  async witnessInvoice(invoiceId: number, provider: LedgerProvider = "algorand"): Promise<LedgerWitnessReceipt> {
    return this.witnessTransaction(provider, {
      type: "invoice_witness",
      invoiceId,
      timestamp: new Date().toISOString(),
    });
  }

  async witnessSubscriptionChange(tenantId: string, action: string, provider: LedgerProvider = "algorand"): Promise<LedgerWitnessReceipt> {
    return this.witnessTransaction(provider, {
      type: "subscription_change",
      tenantId,
      action,
      timestamp: new Date().toISOString(),
    });
  }
}

export const ledgerWitnessService = new LedgerWitnessService();
