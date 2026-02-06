export type SecurityMode = "zero" | "one" | "phi" | "phi-plus";
export type LedgerProvider = "algorand" | "hedera";
export type PaymentMethod = "stripe" | "tat" | "mixed";
export type SubscriptionStatus = "active" | "past_due" | "canceled" | "trialing" | "provisioning";
export type BillingInterval = "monthly" | "yearly";

export interface PlenumNetTierConfig {
  enabled: boolean;
  securityMode: SecurityMode;
  phaseSync: boolean;
  timing: "microsecond" | "nanosecond" | "picosecond" | "femtosecond";
  ternaryCompression: boolean;
  ledgerWitnessing: boolean;
  ledgerProvider: LedgerProvider;
  torsionFieldRouting: boolean;
}

export interface SubscriptionTierFeatures {
  maxProjects: number | "unlimited";
  maxUsers: number;
  storageGb: number;
  apiCallsPerMonth: number;
  wbsManagement: boolean;
  documentManagement: boolean;
  basicReporting: boolean;
  officeOnlineIntegration: boolean;
  aiAnalytics: boolean;
  advancedReporting: boolean;
  kongSecurityGateway: boolean;
  plenumnetEncryption: boolean;
  smartInbox: boolean;
  customIntegrations: boolean;
  dedicatedPlenumNetNode: boolean;
  quantumResistantAllOperations: boolean;
}

export interface SubscriptionTierSeed {
  name: string;
  code: string;
  basePriceMonthlyCents: number;
  basePriceYearlyCents: number;
  perUserPriceCents: number;
  annualDiscountBps: number;
  features: SubscriptionTierFeatures;
  plenumnet: PlenumNetTierConfig;
  maxUsers: number;
  maxProjects: number | "unlimited";
  storageGb: number;
  apiCallsPerMonth: number;
  securityMode: SecurityMode;
}

export const SUBSCRIPTION_TIER_SEEDS: Record<string, SubscriptionTierSeed> = {
  essentials: {
    name: "Essentials",
    code: "essentials",
    basePriceMonthlyCents: 9900,
    basePriceYearlyCents: 99000,
    perUserPriceCents: 2500,
    annualDiscountBps: 1667,
    maxUsers: 10,
    maxProjects: 10,
    storageGb: 10,
    apiCallsPerMonth: 50000,
    securityMode: "zero",
    features: {
      maxProjects: 10,
      maxUsers: 10,
      storageGb: 10,
      apiCallsPerMonth: 50000,
      wbsManagement: true,
      documentManagement: true,
      basicReporting: true,
      officeOnlineIntegration: false,
      aiAnalytics: false,
      advancedReporting: false,
      kongSecurityGateway: false,
      plenumnetEncryption: false,
      smartInbox: false,
      customIntegrations: false,
      dedicatedPlenumNetNode: false,
      quantumResistantAllOperations: false,
    },
    plenumnet: {
      enabled: false,
      securityMode: "zero",
      phaseSync: false,
      timing: "microsecond",
      ternaryCompression: false,
      ledgerWitnessing: false,
      ledgerProvider: "algorand",
      torsionFieldRouting: false,
    },
  },
  professional: {
    name: "Professional",
    code: "professional",
    basePriceMonthlyCents: 29900,
    basePriceYearlyCents: 299000,
    perUserPriceCents: 5000,
    annualDiscountBps: 1667,
    maxUsers: 50,
    maxProjects: 50,
    storageGb: 100,
    apiCallsPerMonth: 250000,
    securityMode: "one",
    features: {
      maxProjects: 50,
      maxUsers: 50,
      storageGb: 100,
      apiCallsPerMonth: 250000,
      wbsManagement: true,
      documentManagement: true,
      basicReporting: true,
      officeOnlineIntegration: true,
      aiAnalytics: true,
      advancedReporting: true,
      kongSecurityGateway: false,
      plenumnetEncryption: false,
      smartInbox: false,
      customIntegrations: false,
      dedicatedPlenumNetNode: false,
      quantumResistantAllOperations: false,
    },
    plenumnet: {
      enabled: true,
      securityMode: "one",
      phaseSync: false,
      timing: "nanosecond",
      ternaryCompression: true,
      ledgerWitnessing: false,
      ledgerProvider: "algorand",
      torsionFieldRouting: false,
    },
  },
  enterprise: {
    name: "Enterprise",
    code: "enterprise",
    basePriceMonthlyCents: 99900,
    basePriceYearlyCents: 999000,
    perUserPriceCents: 7500,
    annualDiscountBps: 1667,
    maxUsers: 500,
    maxProjects: "unlimited" as any,
    storageGb: 1000,
    apiCallsPerMonth: 1000000,
    securityMode: "phi",
    features: {
      maxProjects: "unlimited",
      maxUsers: 500,
      storageGb: 1000,
      apiCallsPerMonth: 1000000,
      wbsManagement: true,
      documentManagement: true,
      basicReporting: true,
      officeOnlineIntegration: true,
      aiAnalytics: true,
      advancedReporting: true,
      kongSecurityGateway: true,
      plenumnetEncryption: true,
      smartInbox: true,
      customIntegrations: true,
      dedicatedPlenumNetNode: false,
      quantumResistantAllOperations: false,
    },
    plenumnet: {
      enabled: true,
      securityMode: "phi",
      phaseSync: true,
      timing: "picosecond",
      ternaryCompression: true,
      ledgerWitnessing: true,
      ledgerProvider: "algorand",
      torsionFieldRouting: false,
    },
  },
  "quantum-enterprise": {
    name: "Quantum Enterprise",
    code: "quantum-enterprise",
    basePriceMonthlyCents: 499900,
    basePriceYearlyCents: 4999000,
    perUserPriceCents: 15000,
    annualDiscountBps: 1667,
    maxUsers: 500,
    maxProjects: "unlimited" as any,
    storageGb: 5000,
    apiCallsPerMonth: -1,
    securityMode: "phi-plus",
    features: {
      maxProjects: "unlimited",
      maxUsers: 500,
      storageGb: 5000,
      apiCallsPerMonth: -1,
      wbsManagement: true,
      documentManagement: true,
      basicReporting: true,
      officeOnlineIntegration: true,
      aiAnalytics: true,
      advancedReporting: true,
      kongSecurityGateway: true,
      plenumnetEncryption: true,
      smartInbox: true,
      customIntegrations: true,
      dedicatedPlenumNetNode: true,
      quantumResistantAllOperations: true,
    },
    plenumnet: {
      enabled: true,
      securityMode: "phi-plus",
      phaseSync: true,
      timing: "femtosecond",
      ternaryCompression: true,
      ledgerWitnessing: true,
      ledgerProvider: "algorand",
      torsionFieldRouting: true,
    },
  },
};

export const FEATURE_GATES = {
  PROJECT_MANAGEMENT: "project_management",
  WBS_EDITOR: "wbs_editor",
  BASIC_DOCUMENTS: "basic_documents",
  TEAM_MANAGEMENT: "team_management",
  BASIC_REPORTING: "basic_reporting",
  OFFICE_ONLINE: "office_online",
  AI_ANALYTICS: "ai_analytics",
  ADVANCED_REPORTING: "advanced_reporting",
  API_ACCESS: "api_access",
  KONG_SECURITY: "kong_security",
  PLENUMNET_ENCRYPTION: "plenumnet_encryption",
  SMART_INBOX: "smart_inbox",
  CUSTOM_INTEGRATIONS: "custom_integrations",
  FEMTOSECOND_TIMING: "femtosecond_timing",
  TORSION_FIELD_ROUTING: "torsion_field_routing",
  QUANTUM_RESISTANT_ALL: "quantum_resistant_all",
  DEDICATED_NODE: "dedicated_node",
} as const;

export const SECURITY_MODE_HIERARCHY: SecurityMode[] = ["zero", "one", "phi", "phi-plus"];

export const SECURITY_MODE_REQUIREMENTS: Record<string, SecurityMode> = {
  [FEATURE_GATES.PLENUMNET_ENCRYPTION]: "phi",
  [FEATURE_GATES.FEMTOSECOND_TIMING]: "phi-plus",
  [FEATURE_GATES.QUANTUM_RESISTANT_ALL]: "phi-plus",
  [FEATURE_GATES.TORSION_FIELD_ROUTING]: "phi-plus",
};

export const PLAN_REQUIREMENTS: Record<string, string> = {
  [FEATURE_GATES.PROJECT_MANAGEMENT]: "essentials",
  [FEATURE_GATES.WBS_EDITOR]: "essentials",
  [FEATURE_GATES.BASIC_DOCUMENTS]: "essentials",
  [FEATURE_GATES.TEAM_MANAGEMENT]: "essentials",
  [FEATURE_GATES.BASIC_REPORTING]: "essentials",
  [FEATURE_GATES.OFFICE_ONLINE]: "professional",
  [FEATURE_GATES.AI_ANALYTICS]: "professional",
  [FEATURE_GATES.ADVANCED_REPORTING]: "professional",
  [FEATURE_GATES.API_ACCESS]: "professional",
  [FEATURE_GATES.KONG_SECURITY]: "enterprise",
  [FEATURE_GATES.PLENUMNET_ENCRYPTION]: "enterprise",
  [FEATURE_GATES.SMART_INBOX]: "enterprise",
  [FEATURE_GATES.CUSTOM_INTEGRATIONS]: "enterprise",
  [FEATURE_GATES.FEMTOSECOND_TIMING]: "quantum-enterprise",
  [FEATURE_GATES.TORSION_FIELD_ROUTING]: "quantum-enterprise",
  [FEATURE_GATES.QUANTUM_RESISTANT_ALL]: "quantum-enterprise",
  [FEATURE_GATES.DEDICATED_NODE]: "quantum-enterprise",
};

export const PLAN_ORDER = ["essentials", "professional", "enterprise", "quantum-enterprise"];
