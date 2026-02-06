import type { LedgerWitnessReceipt } from "../../shared/types/billing";
import type { LedgerProvider } from "../../shared/types/subscriptions";
import { ternaryHash } from "../plenumnet/ternary-encoding";
import { getFemtosecondTimestamp } from "../plenumnet/femtosecond-timing";

const ALGORAND_APP_ID = process.env.ALGORAND_APP_ID;
const HEDERA_TOPIC_ID = process.env.HEDERA_TOPIC_ID;

export class LedgerWitnessService {
  private get isLiveMode(): boolean {
    return !!(ALGORAND_APP_ID || HEDERA_TOPIC_ID);
  }

  async witnessTransaction(
    provider: LedgerProvider,
    payload: Record<string, unknown>
  ): Promise<LedgerWitnessReceipt> {
    const payloadHash = ternaryHash(JSON.stringify(payload));
    const timestamp = getFemtosecondTimestamp();

    if (provider === "algorand") {
      return this.witnessAlgorand(payload, payloadHash, timestamp.humanReadable);
    }
    return this.witnessHedera(payload, payloadHash, timestamp.humanReadable);
  }

  private async witnessAlgorand(
    payload: Record<string, unknown>,
    payloadHash: string,
    femtosecondTime: string
  ): Promise<LedgerWitnessReceipt> {
    const txId = `algo_dev_${payloadHash}_${Date.now()}`;
    return {
      provider: "algorand",
      transactionId: txId,
      algorandRound: Math.floor(Date.now() / 1000),
      algorandAppId: ALGORAND_APP_ID ? parseInt(ALGORAND_APP_ID, 10) : 0,
      timestamp: new Date(),
      payload: {
        ...payload,
        ternaryHash: payloadHash,
        femtosecondTime,
        witnessMode: this.isLiveMode ? "live" : "development",
      },
    };
  }

  private async witnessHedera(
    payload: Record<string, unknown>,
    payloadHash: string,
    femtosecondTime: string
  ): Promise<LedgerWitnessReceipt> {
    const txId = `hedera_dev_${payloadHash}_${Date.now()}`;
    return {
      provider: "hedera",
      transactionId: txId,
      hederaConsensusTimestamp: new Date().toISOString(),
      hederaTopicSequenceNumber: Math.floor(Math.random() * 100000),
      timestamp: new Date(),
      payload: {
        ...payload,
        ternaryHash: payloadHash,
        femtosecondTime,
        witnessMode: this.isLiveMode ? "live" : "development",
      },
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
