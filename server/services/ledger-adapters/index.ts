export type { LedgerAdapter, LedgerWitnessResult } from "./types";
export { AlgorandAdapter, algorandAdapter } from "./algorand-adapter";
export { HederaAdapter, hederaAdapter } from "./hedera-adapter";

import { algorandAdapter } from "./algorand-adapter";
import { hederaAdapter } from "./hedera-adapter";
import type { LedgerAdapter } from "./types";

export function getLedgerAdapter(provider: "algorand" | "hedera"): LedgerAdapter {
  return provider === "hedera" ? hederaAdapter : algorandAdapter;
}

export function getLedgerStatus() {
  return {
    algorand: {
      configured: algorandAdapter.isConfigured,
      name: algorandAdapter.name,
    },
    hedera: {
      configured: hederaAdapter.isConfigured,
      name: hederaAdapter.name,
    },
  };
}
