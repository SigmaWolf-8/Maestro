export type TritA = -1 | 0 | 1;
export type TritB = 0 | 1 | 2;
export type TritC = 1 | 2 | 3;

export type Trit = TritA | TritB | TritC;

export type Representation = 'A' | 'B' | 'C';

export interface TernaryValue {
  value: Trit;
  representation: Representation;
  meaning: 'False' | 'Neutral' | 'True';
}

export interface TernaryVector {
  values: Trit[];
  representation: Representation;
  length: number;
}

export interface ConversionResult {
  original: TernaryValue;
  converted: TernaryValue;
  bijection: string;
}

export function getTritMeaning(value: Trit, representation: Representation): 'False' | 'Neutral' | 'True' {
  switch (representation) {
    case 'A':
      if (value === -1) return 'False';
      if (value === 0) return 'Neutral';
      return 'True';
    case 'B':
      if (value === 0) return 'False';
      if (value === 1) return 'Neutral';
      return 'True';
    case 'C':
      if (value === 1) return 'False';
      if (value === 2) return 'Neutral';
      return 'True';
    default:
      return 'Neutral';
  }
}

export function isValidTrit(value: number, representation: Representation): boolean {
  switch (representation) {
    case 'A':
      return value === -1 || value === 0 || value === 1;
    case 'B':
      return value === 0 || value === 1 || value === 2;
    case 'C':
      return value === 1 || value === 2 || value === 3;
    default:
      return false;
  }
}

export function convertTrit(value: Trit, from: Representation, to: Representation): ConversionResult {
  let converted: Trit;
  let bijection: string;

  if (from === to) {
    converted = value;
    bijection = 'identity';
  } else if (from === 'A' && to === 'B') {
    converted = (value + 1) as TritB;
    bijection = 'f(a) = a + 1';
  } else if (from === 'A' && to === 'C') {
    converted = (value + 2) as TritC;
    bijection = 'f(a) = a + 2';
  } else if (from === 'B' && to === 'A') {
    converted = (value - 1) as TritA;
    bijection = 'f(b) = b - 1';
  } else if (from === 'B' && to === 'C') {
    converted = (value + 1) as TritC;
    bijection = 'f(b) = b + 1';
  } else if (from === 'C' && to === 'A') {
    converted = (value - 2) as TritA;
    bijection = 'f(c) = c - 2';
  } else if (from === 'C' && to === 'B') {
    converted = (value - 1) as TritB;
    bijection = 'f(c) = c - 1';
  } else {
    throw new Error(`Invalid conversion: ${from} to ${to}`);
  }

  return {
    original: {
      value,
      representation: from,
      meaning: getTritMeaning(value, from)
    },
    converted: {
      value: converted,
      representation: to,
      meaning: getTritMeaning(converted, to)
    },
    bijection
  };
}

export function convertVector(values: Trit[], from: Representation, to: Representation): TernaryVector {
  const converted = values.map(v => convertTrit(v, from, to).converted.value);
  return {
    values: converted,
    representation: to,
    length: converted.length
  };
}
