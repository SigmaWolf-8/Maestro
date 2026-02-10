export const TAU = 1.8392867552141612;
export const TAU_SQUARED = TAU * TAU;
export const TAU_CUBED = TAU * TAU * TAU;
export const TAU_TO_7 = Math.pow(TAU, 7);
export const TAU_INVERSE = 1 / TAU;
export const TAU_INVERSE_SQUARED = 1 / TAU_SQUARED;

export const LOG2_OF_3 = Math.log2(3);
export const TERNARY_DENSITY_ADVANTAGE = LOG2_OF_3 - 1;
export const TERNARY_DENSITY_PERCENT = TERNARY_DENSITY_ADVANTAGE * 100;

export const TRIBONACCI_SEQUENCE = [0, 0, 1, 1, 2, 4, 7, 13, 24, 44, 81, 149, 274, 504, 927];

export const VM_REGISTER_COUNT = 27;
export const HASH_FINALIZATION_ROUNDS = 13;
export const GC_THRESHOLD_RATIO = TAU_INVERSE_SQUARED;

export const HASH_SEED = BigInt(Math.floor(TAU_SQUARED * 1_000_000));
export const HASH_MIX = BigInt(Math.floor(TAU_TO_7 * 100));
export const HASH_MODULUS = 729n * 729n * 729n;

export const SALVI_EPOCH_ISO = '2025-04-01T00:00:00.000Z';

export function tribonacci(n: number): number {
  if (n < TRIBONACCI_SEQUENCE.length) return TRIBONACCI_SEQUENCE[n];
  let a = 0, b = 0, c = 1;
  for (let i = 3; i <= n; i++) {
    const next = a + b + c;
    a = b;
    b = c;
    c = next;
  }
  return c;
}

export function validateTauIdentity(): {
  valid: boolean;
  lhs: number;
  rhs: number;
  error: number;
} {
  const lhs = TAU_CUBED;
  const rhs = TAU_SQUARED + TAU + 1;
  const error = Math.abs(lhs - rhs);
  return {
    valid: error < 1e-10,
    lhs,
    rhs,
    error,
  };
}

export function getDensityAdvantage(tritCount: number): {
  trits: number;
  bitsEquivalent: number;
  binaryBitsNeeded: number;
  densityGainPercent: string;
  compressionRatio: string;
} {
  const bitsEquivalent = tritCount * LOG2_OF_3;
  const binaryBitsNeeded = tritCount;
  return {
    trits: tritCount,
    bitsEquivalent: Math.round(bitsEquivalent * 1000) / 1000,
    binaryBitsNeeded,
    densityGainPercent: `+${TERNARY_DENSITY_PERCENT.toFixed(2)}%`,
    compressionRatio: `${LOG2_OF_3.toFixed(3)}:1`,
  };
}
