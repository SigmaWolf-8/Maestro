export function ternaryEncode(binaryData: Buffer): Buffer {
  const trits: number[] = [];
  for (let i = 0; i < binaryData.length; i++) {
    let byte = binaryData[i];
    for (let j = 0; j < 5; j++) {
      trits.push(byte % 3);
      byte = Math.floor(byte / 3);
    }
  }
  return packTrits(trits);
}

function packTrits(trits: number[]): Buffer {
  const packedBytes: number[] = [];
  for (let i = 0; i < trits.length; i += 5) {
    let value = 0;
    for (let j = Math.min(4, trits.length - i - 1); j >= 0; j--) {
      value = value * 3 + (trits[i + j] || 0);
    }
    packedBytes.push(value);
  }
  return Buffer.from(packedBytes);
}

export function ternaryDecode(ternaryData: Buffer): Buffer {
  const trits: number[] = [];
  for (let i = 0; i < ternaryData.length; i++) {
    let value = ternaryData[i];
    for (let j = 0; j < 5; j++) {
      trits.push(value % 3);
      value = Math.floor(value / 3);
    }
  }

  const bytes: number[] = [];
  for (let i = 0; i < trits.length; i += 5) {
    let byte = 0;
    let multiplier = 1;
    for (let j = 0; j < 5 && i + j < trits.length; j++) {
      byte += trits[i + j] * multiplier;
      multiplier *= 3;
    }
    if (byte <= 255) {
      bytes.push(byte);
    }
  }
  return Buffer.from(bytes);
}

export function runLengthCompress(data: Buffer): Buffer {
  if (data.length === 0) return Buffer.alloc(0);

  const result: number[] = [];
  let i = 0;

  while (i < data.length) {
    let count = 1;
    while (i + count < data.length && data[i] === data[i + count] && count < 127) {
      count++;
    }

    if (count >= 3) {
      result.push(0x80 | count);
      result.push(data[i]);
      i += count;
    } else {
      let literalStart = i;
      let literalCount = 0;

      while (i < data.length && literalCount < 127) {
        let runLength = 1;
        while (i + runLength < data.length && data[i] === data[i + runLength]) {
          runLength++;
        }
        if (runLength >= 3) break;
        i++;
        literalCount++;
      }

      if (literalCount > 0) {
        result.push(literalCount);
        for (let j = 0; j < literalCount; j++) {
          result.push(data[literalStart + j]);
        }
      }
    }
  }

  return Buffer.from(result);
}

export function runLengthDecompress(data: Buffer): Buffer {
  const result: number[] = [];
  let i = 0;

  while (i < data.length) {
    const header = data[i++];

    if (header & 0x80) {
      const count = header & 0x7F;
      const value = data[i++];
      for (let j = 0; j < count; j++) {
        result.push(value);
      }
    } else {
      const count = header;
      for (let j = 0; j < count && i < data.length; j++) {
        result.push(data[i++]);
      }
    }
  }

  return Buffer.from(result);
}

export interface CompressionResult {
  originalSize: number;
  ternarySize: number;
  compressedSize: number;
  compressionRatio: number;
  compressedData: string;
}

export function compressData(input: string): CompressionResult {
  const originalBuffer = Buffer.from(input, 'utf-8');
  const originalSize = originalBuffer.length;

  const ternaryEncoded = ternaryEncode(originalBuffer);
  const ternarySize = ternaryEncoded.length;

  const rleCompressed = runLengthCompress(ternaryEncoded);
  const compressedSize = rleCompressed.length;

  const compressionRatio = originalSize > 0
    ? ((originalSize - compressedSize) / originalSize) * 100
    : 0;

  return {
    originalSize,
    ternarySize,
    compressedSize,
    compressionRatio,
    compressedData: rleCompressed.toString('base64')
  };
}

export function decompressData(base64Data: string): string {
  const compressed = Buffer.from(base64Data, 'base64');
  const ternaryEncoded = runLengthDecompress(compressed);
  const originalBuffer = ternaryDecode(ternaryEncoded);
  return originalBuffer.toString('utf-8');
}

export function ternaryHash(data: string): string {
  const buffer = Buffer.from(data, 'utf-8');
  const encoded = ternaryEncode(buffer);

  const SEED = 3383596n;
  const MIX = 5765n;
  const MODULUS = 729n * 729n * 729n;
  const FINALIZATION_ROUNDS = 13;

  let hash = SEED;
  for (let i = 0; i < encoded.length; i++) {
    hash = (hash * MIX + BigInt(encoded[i])) % MODULUS;
    hash = hash ^ (hash >> 7n);
  }

  for (let r = 0; r < FINALIZATION_ROUNDS; r++) {
    hash = (hash * MIX + BigInt(r)) % MODULUS;
  }

  return hash.toString(16).padStart(12, '0');
}
