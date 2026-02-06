import { TritA, Representation } from './ternary-types';

export type SecurityMode = 'phi' | 'one' | 'zero';

export interface OperationResult {
  operands: { a: number; b: number };
  operation: string;
  result: number;
  representation: Representation;
  constantTime: boolean;
  securityMode?: SecurityMode;
}

export function ternaryAdd(a: TritA, b: TritA): OperationResult {
  const aMapped = a + 1;
  const bMapped = b + 1;
  const sumMod3 = (aMapped + bMapped) % 3;
  const result = (sumMod3 - 1) as TritA;

  return {
    operands: { a, b },
    operation: 'ternary_addition',
    result,
    representation: 'A',
    constantTime: true
  };
}

export function ternaryMultiply(a: TritA, b: TritA): OperationResult {
  const aMapped = a + 1;
  const bMapped = b + 1;
  const productMod3 = (aMapped * bMapped) % 3;
  const result = (productMod3 - 1) as TritA;

  return {
    operands: { a, b },
    operation: 'ternary_multiplication',
    result,
    representation: 'A',
    constantTime: true
  };
}

export function ternaryRotate(value: TritA, steps: number = 1): OperationResult {
  const normalizedSteps = ((steps % 3) + 3) % 3;
  const mapped = value + 1;
  const rotated = (mapped + normalizedSteps) % 3;
  const result = (rotated - 1) as TritA;

  return {
    operands: { a: value, b: steps },
    operation: 'ternary_rotation',
    result,
    representation: 'A',
    constantTime: true
  };
}

export function adaptiveTernaryAdd(a: TritA, b: TritA, mode: SecurityMode): OperationResult {
  const result = ternaryAdd(a, b);

  return {
    ...result,
    operation: `adaptive_ternary_addition_${mode}`,
    securityMode: mode
  };
}

export function batchTernaryAdd(pairs: Array<{ a: TritA; b: TritA }>): OperationResult[] {
  return pairs.map(({ a, b }) => ternaryAdd(a, b));
}

export function ternaryXor(a: TritA, b: TritA): OperationResult {
  let result: TritA;

  if (a === b) {
    result = 0;
  } else if (a === 0) {
    result = b;
  } else if (b === 0) {
    result = a;
  } else {
    result = 0;
  }

  return {
    operands: { a, b },
    operation: 'ternary_xor',
    result,
    representation: 'A',
    constantTime: true
  };
}

export function ternaryNot(value: TritA): OperationResult {
  const result = (-value) as TritA;

  return {
    operands: { a: value, b: 0 },
    operation: 'ternary_not',
    result,
    representation: 'A',
    constantTime: true
  };
}

export function calculateInformationDensity(tritCount: number): {
  trits: number;
  bitsEquivalent: number;
  efficiencyGain: string;
} {
  const log2of3 = Math.log2(3);
  const bitsEquivalent = tritCount * log2of3;
  const efficiencyGain = ((log2of3 - 1) * 100).toFixed(2);

  return {
    trits: tritCount,
    bitsEquivalent: Math.round(bitsEquivalent * 100) / 100,
    efficiencyGain: `+${efficiencyGain}%`
  };
}
