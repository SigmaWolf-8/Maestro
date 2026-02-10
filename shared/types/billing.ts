import type { SecurityMode, LedgerProvider, SubscriptionStatus } from "./subscriptions";

export interface InvoiceLineItem {
  description: string;
  amount: number;
  quantity: number;
  unitPrice: number;
  category: "base" | "users" | "overage" | "plenumnet" | "ledger_witnessing" | "tax";
}

export interface BillingCalculation {
  basePlanCents: number;
  additionalUsers: number;
  userChargesCents: number;
  overageChargesCents: number;
  plenumnetChargesCents: number;
  ledgerWitnessingChargesCents: number;
  subtotalCents: number;
  taxRateBps: number;
  taxAmountCents: number;
  totalCents: number;
  currency: "CAD";
  province?: string;
  taxBreakdown?: TaxBreakdown;
}

export interface TaxBreakdown {
  gst: number;
  hst: number;
  pst: number;
  qst: number;
  totalTaxCents: number;
  province: string;
}

export interface CanadianProvinceTax {
  code: string;
  name: string;
  gstRateBps: number;
  hstRateBps: number;
  pstRateBps: number;
  qstRateBps: number;
  regime: "GST" | "HST" | "GST+PST" | "GST+QST";
}

export interface LedgerWitnessReceipt {
  provider: LedgerProvider;
  transactionId: string;
  algorandRound?: number;
  algorandAppId?: number;
  hederaConsensusTimestamp?: string;
  hederaTopicSequenceNumber?: number;
  timestamp: Date;
  payload: Record<string, unknown>;
}

export interface UsageSummary {
  activeUsers: number;
  currentProjects: number;
  storageUsedGb: number;
  apiCallsThisMonth: number;
  ternaryOperations: number;
  phaseSyncEvents: number;
  algorandWitnessEvents: number;
  hederaWitnessEvents: number;
  femtosecondTimingEvents: number;
  phaseAlignmentEfficiency: number;
}

export interface UsageLimitStatus {
  metric: string;
  current: number;
  limit: number;
  percentUsed: number;
  exceeded: boolean;
  warningThreshold: boolean;
}

export interface TenantEntitlement {
  tenantId: string;
  planCode: string;
  planName: string;
  status: SubscriptionStatus;
  securityMode: SecurityMode;
  features: Record<string, boolean>;
  usage: UsageSummary;
  limits: UsageLimitStatus[];
  plenumnetEnabled: boolean;
  ledgerProvider: LedgerProvider;
}

export interface OnboardingStep {
  step: number;
  name: string;
  status: "pending" | "in_progress" | "complete" | "error";
  details?: string;
}

export interface OnboardingResult {
  success: boolean;
  tenantId: string;
  adminUserId: string;
  subscriptionId: number;
  loginUrl: string;
  steps: OnboardingStep[];
  nextActions: string[];
}

export interface PricingConfigEntry {
  key: string;
  value: string;
  valueType: "string" | "integer" | "boolean" | "json";
  visibility: "PUBLIC" | "PRIVATE";
  description?: string;
}

export const DEFAULT_PRICING_CONFIG: PricingConfigEntry[] = [
  { key: "default_currency", value: "CAD", valueType: "string", visibility: "PUBLIC", description: "Default billing currency" },
  { key: "trial_days", value: "14", valueType: "integer", visibility: "PUBLIC", description: "Trial period in days" },
  { key: "annual_discount_bps", value: "1667", valueType: "integer", visibility: "PUBLIC", description: "Annual billing discount in basis points (16.67%)" },
  { key: "tax_province_default", value: "ON", valueType: "string", visibility: "PRIVATE", description: "Default province for tax calculation" },
  { key: "stripe_tax_behavior", value: "exclusive", valueType: "string", visibility: "PRIVATE", description: "Stripe tax behavior (exclusive/inclusive)" },
  { key: "ternary_op_price_per_100k_cents", value: "1000", valueType: "integer", visibility: "PRIVATE", description: "Price per 100k ternary ops (in cents)" },
  { key: "ternary_op_free_tier", value: "1000000", valueType: "integer", visibility: "PRIVATE", description: "Free tier ternary ops per month" },
  { key: "algorand_witness_price_cents", value: "20", valueType: "integer", visibility: "PRIVATE", description: "Price per Algorand witness event (in cents)" },
  { key: "hedera_witness_price_cents", value: "30", valueType: "integer", visibility: "PRIVATE", description: "Price per Hedera witness event (in cents)" },
  { key: "femtosecond_premium_cents", value: "5000", valueType: "integer", visibility: "PRIVATE", description: "Monthly femtosecond timing premium (in cents)" },
  { key: "gst_rate_bps", value: "500", valueType: "integer", visibility: "PRIVATE", description: "GST rate in basis points (5%)" },
];
