export type SecurityMode = "phi" | "one" | "zero";

export type TernaryDigit = 0 | 1 | 2;

export interface TernaryWord {
  trits: TernaryDigit[];
  length: number;
}

export interface TorsionFieldCoordinate {
  d1_site_location: string;
  d2_structure_csi_division: string;
  d3_system_csi_section: string;
  d4_schedule_phase: string;
  d5_reporting_period: string;
  d6_milestone: string;
  d7_cost_center: string;
  d8_gl_account: string;
  d9_contract_reference: string;
  d10_department: string;
  d11_team: string;
  d12_responsible_person: string;
  d13_torsion_spin: number;
}

export interface PlenumNetSecurityContext {
  mode: SecurityMode;
  enabled: boolean;
  timestamp?: string;
  witnessHash?: string;
  encryptionApplied: boolean;
  ternaryEncoded: boolean;
}

export interface PlenumNetHealthStatus {
  enabled: boolean;
  mode: SecurityMode;
  services: {
    tpu: boolean;
    timing: boolean;
    witness: boolean;
  };
}

export interface TernaryEncodingResult {
  encoded: string;
  originalLength: number;
  compressionRatio: number;
}

export interface FemtosecondTimestampResult {
  value: string;
  iso: string;
  precision: "femtosecond" | "nanosecond" | "microsecond";
}

export interface WitnessSubmission {
  hash: string;
  metadata: Record<string, unknown>;
  tenantId: string;
  entityType: string;
  entityId: string;
}

export interface WitnessReceipt {
  hash: string;
  xrplTxHash?: string;
  timestamp: FemtosecondTimestampResult;
  mode: SecurityMode;
  verified: boolean;
}

export interface PhaseRotationConfig {
  mode: SecurityMode;
  phaseOffset?: number;
  rotationCount?: number;
}

export interface PhaseRotationResult {
  encrypted: string;
  phaseOffset: number;
  mode: SecurityMode;
}

export const SECURITY_MODE_LABELS: Record<SecurityMode, string> = {
  phi: "Mode \u03C6 (Maximum Security)",
  one: "Mode 1 (Enterprise)",
  zero: "Mode 0 (Legacy/Compatibility)",
};

export const SECURITY_MODE_DESCRIPTIONS: Record<SecurityMode, string> = {
  phi: "XRPL witnessing + femtosecond timestamps + phase-rotation encryption",
  one: "Post-quantum encryption with nanosecond timestamps",
  zero: "AES-256 with ternary key schedule (legacy compatibility)",
};

export interface TorsionFieldMapping {
  dimension: number;
  domain: string;
  wbsMapping: string;
  description: string;
}

export const TORSION_FIELD_DIMENSIONS: TorsionFieldMapping[] = [
  { dimension: 1, domain: "Site/Location", wbsMapping: "Project Zone", description: "Physical site location mapping" },
  { dimension: 2, domain: "Structure", wbsMapping: "CSI Division", description: "Structural classification" },
  { dimension: 3, domain: "System", wbsMapping: "CSI Section", description: "Building system mapping" },
  { dimension: 4, domain: "Phase", wbsMapping: "Schedule Phase", description: "Project lifecycle phase" },
  { dimension: 5, domain: "Period", wbsMapping: "Reporting Period", description: "Time period classification" },
  { dimension: 6, domain: "Milestone", wbsMapping: "Key Date", description: "Critical milestone reference" },
  { dimension: 7, domain: "Cost Center", wbsMapping: "Budget Line", description: "Financial cost center" },
  { dimension: 8, domain: "Account", wbsMapping: "GL Code", description: "General ledger account" },
  { dimension: 9, domain: "Contract", wbsMapping: "PO/CO Reference", description: "Contract/purchase order" },
  { dimension: 10, domain: "Department", wbsMapping: "Org Unit", description: "Organizational department" },
  { dimension: 11, domain: "Team", wbsMapping: "Work Crew", description: "Assigned team or crew" },
  { dimension: 12, domain: "Responsible", wbsMapping: "Person", description: "Responsible individual" },
  { dimension: 13, domain: "Torsion Spin", wbsMapping: "Priority/Urgency", description: "Priority urgency spin value" },
];
