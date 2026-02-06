import type { LedgerWitnessReceipt } from "../../shared/types/billing";
import type { LedgerProvider } from "../../shared/types/subscriptions";
import { ternaryHash } from "../plenumnet/ternary-encoding";
import { getFemtosecondTimestamp } from "../plenumnet/femtosecond-timing";
import { getLedgerAdapter, getLedgerStatus } from "./ledger-adapters";

export class LedgerWitnessService {
  getAdapterStatus() {
    return getLedgerStatus();
  }

  async witnessTransaction(
    provider: LedgerProvider,
    payload: Record<string, unknown>
  ): Promise<LedgerWitnessReceipt> {
    const payloadHash = ternaryHash(JSON.stringify(payload));
    const timestamp = getFemtosecondTimestamp();
    const adapter = getLedgerAdapter(provider);
    const result = await adapter.witness(payloadHash, {
      femtosecondTime: timestamp.humanReadable,
    });

    if (provider === "algorand") {
      return {
        provider: "algorand",
        transactionId: result.transactionId,
        algorandRound: result.blockHeight,
        algorandAppId: parseInt(process.env.ALGORAND_APP_ID || "0", 10),
        timestamp: new Date(),
        payload: {
          ...payload,
          ternaryHash: payloadHash,
          femtosecondTime: timestamp.humanReadable,
          witnessMode: result.mode,
          networkId: result.networkId,
        },
      };
    }

    return {
      provider: "hedera",
      transactionId: result.transactionId,
      hederaConsensusTimestamp: result.consensusTimestamp,
      hederaTopicSequenceNumber: result.sequenceNumber,
      timestamp: new Date(),
      payload: {
        ...payload,
        ternaryHash: payloadHash,
        femtosecondTime: timestamp.humanReadable,
        witnessMode: result.mode,
        networkId: result.networkId,
      },
    };
  }

  async verifyTransaction(provider: LedgerProvider, transactionId: string) {
    const adapter = getLedgerAdapter(provider);
    return adapter.verify(transactionId);
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
