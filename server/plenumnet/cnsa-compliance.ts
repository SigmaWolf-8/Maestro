export type CnsaAlgorithmStatus = 'implemented' | 'validated' | 'pending' | 'not_applicable';

export interface CnsaAlgorithm {
  id: string;
  name: string;
  standard: string;
  category: 'key_encapsulation' | 'digital_signature' | 'symmetric' | 'hash' | 'mac' | 'stateful_signature';
  securityLevels?: number[];
  status: CnsaAlgorithmStatus;
  notes: string;
}

export interface CnsaComplianceReport {
  framework: string;
  version: string;
  totalAlgorithms: number;
  implementedCount: number;
  coveragePercent: number;
  fipsTarget: string;
  algorithms: CnsaAlgorithm[];
  generatedAt: string;
  plenumNetVersion: string;
}

const CNSA_2_0_ALGORITHMS: CnsaAlgorithm[] = [
  {
    id: 'ml-kem-512',
    name: 'ML-KEM-512',
    standard: 'FIPS 203',
    category: 'key_encapsulation',
    securityLevels: [1],
    status: 'implemented',
    notes: 'Module-Lattice-Based Key Encapsulation - Security Level 1',
  },
  {
    id: 'ml-kem-768',
    name: 'ML-KEM-768',
    standard: 'FIPS 203',
    category: 'key_encapsulation',
    securityLevels: [3],
    status: 'implemented',
    notes: 'Module-Lattice-Based Key Encapsulation - Security Level 3',
  },
  {
    id: 'ml-kem-1024',
    name: 'ML-KEM-1024',
    standard: 'FIPS 203',
    category: 'key_encapsulation',
    securityLevels: [5],
    status: 'implemented',
    notes: 'Module-Lattice-Based Key Encapsulation - Security Level 5',
  },
  {
    id: 'ml-dsa-44',
    name: 'ML-DSA-44',
    standard: 'FIPS 204',
    category: 'digital_signature',
    securityLevels: [2],
    status: 'implemented',
    notes: 'Module-Lattice-Based Digital Signature - Security Level 2',
  },
  {
    id: 'ml-dsa-65',
    name: 'ML-DSA-65',
    standard: 'FIPS 204',
    category: 'digital_signature',
    securityLevels: [3],
    status: 'implemented',
    notes: 'Module-Lattice-Based Digital Signature - Security Level 3',
  },
  {
    id: 'ml-dsa-87',
    name: 'ML-DSA-87',
    standard: 'FIPS 204',
    category: 'digital_signature',
    securityLevels: [5],
    status: 'implemented',
    notes: 'Module-Lattice-Based Digital Signature - Security Level 5',
  },
  {
    id: 'aes-256-gcm',
    name: 'AES-256-GCM',
    standard: 'FIPS 197 / SP 800-38D',
    category: 'symmetric',
    status: 'implemented',
    notes: 'Authenticated encryption with associated data',
  },
  {
    id: 'sha-384',
    name: 'SHA-384',
    standard: 'FIPS 180-4',
    category: 'hash',
    status: 'implemented',
    notes: 'Secure Hash Algorithm 384-bit',
  },
  {
    id: 'sha-512',
    name: 'SHA-512',
    standard: 'FIPS 180-4',
    category: 'hash',
    status: 'implemented',
    notes: 'Secure Hash Algorithm 512-bit',
  },
  {
    id: 'xmss',
    name: 'XMSS',
    standard: 'SP 800-208',
    category: 'stateful_signature',
    status: 'implemented',
    notes: 'eXtended Merkle Signature Scheme - stateful hash-based signatures',
  },
  {
    id: 'lms',
    name: 'LMS',
    standard: 'SP 800-208',
    category: 'stateful_signature',
    status: 'implemented',
    notes: 'Leighton-Micali Signature - stateful hash-based signatures',
  },
];

export function getCnsaComplianceReport(): CnsaComplianceReport {
  const implementedCount = CNSA_2_0_ALGORITHMS.filter(a => a.status === 'implemented' || a.status === 'validated').length;

  return {
    framework: 'CNSA 2.0',
    version: '2.0',
    totalAlgorithms: CNSA_2_0_ALGORITHMS.length,
    implementedCount,
    coveragePercent: Math.round((implementedCount / CNSA_2_0_ALGORITHMS.length) * 100),
    fipsTarget: 'FIPS 140-3 Level 1',
    algorithms: CNSA_2_0_ALGORITHMS,
    generatedAt: new Date().toISOString(),
    plenumNetVersion: '4.0.0',
  };
}

export function getCnsaAlgorithmsByCategory(): Record<string, CnsaAlgorithm[]> {
  const grouped: Record<string, CnsaAlgorithm[]> = {};
  for (const algo of CNSA_2_0_ALGORITHMS) {
    if (!grouped[algo.category]) grouped[algo.category] = [];
    grouped[algo.category].push(algo);
  }
  return grouped;
}
