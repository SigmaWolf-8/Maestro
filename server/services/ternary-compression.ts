import { deflateSync, inflateSync } from "zlib";
import {
  ternaryEncode,
  ternaryDecode,
  runLengthCompress,
  runLengthDecompress,
} from "../plenumnet/ternary-encoding";
import {
  phaseSplit,
  phaseRecombine,
  type EncryptionMode,
  type EncryptedPhaseData,
} from "../plenumnet/phase-encryption";

const COMPRESSED_MARKER = "__ternCompressed__";

export interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  stages: {
    zlibSize: number;
    ternarySize: number;
    rleSize: number;
  };
  encrypted: boolean;
}

export interface CompressedPayload {
  __marker: typeof COMPRESSED_MARKER;
  data: string;
  stats: CompressionStats;
  encryptedPhase?: EncryptedPhaseData;
  version: number;
}

function bigIntReplacer(_key: string, value: any): any {
  if (typeof value === "bigint") return value.toString() + "n";
  return value;
}

function bigIntReviver(_key: string, value: any): any {
  if (typeof value === "string" && /^\d+n$/.test(value)) {
    return BigInt(value.slice(0, -1));
  }
  return value;
}

export function isCompressedPayload(value: string): boolean {
  if (!value.startsWith("{")) return false;
  try {
    const parsed = JSON.parse(value);
    return parsed && parsed.__marker === COMPRESSED_MARKER;
  } catch {
    return false;
  }
}

export function compressForStorage(
  input: string,
  options: { encrypt?: boolean; encryptionMode?: EncryptionMode } = {}
): string {
  if (!input || input.length < 64) return input;

  const originalSize = Buffer.byteLength(input, "utf-8");

  const zlibCompressed = deflateSync(Buffer.from(input, "utf-8"), { level: 6 });
  const zlibSize = zlibCompressed.length;

  const ternaryEncoded = ternaryEncode(zlibCompressed);
  const ternarySize = ternaryEncoded.length;

  const rleCompressed = runLengthCompress(ternaryEncoded);
  const rleSize = rleCompressed.length;

  if (rleSize >= originalSize * 0.95) {
    return input;
  }

  const compressedBase64 = rleCompressed.toString("base64");

  const stats: CompressionStats = {
    originalSize,
    compressedSize: rleSize,
    compressionRatio: ((originalSize - rleSize) / originalSize) * 100,
    stages: { zlibSize, ternarySize, rleSize },
    encrypted: !!options.encrypt,
  };

  const payload: CompressedPayload = {
    __marker: COMPRESSED_MARKER,
    data: compressedBase64,
    stats,
    version: 1,
  };

  if (options.encrypt) {
    const mode = options.encryptionMode || "balanced";
    payload.encryptedPhase = phaseSplit(compressedBase64, mode);
    payload.data = "";
    payload.stats.encrypted = true;
  }

  return JSON.stringify(payload, bigIntReplacer);
}

export function decompressFromStorage(value: string): string {
  if (!isCompressedPayload(value)) return value;

  try {
    const payload: CompressedPayload = JSON.parse(value, bigIntReviver);

    let compressedBase64 = payload.data;

    if (payload.encryptedPhase) {
      const result = phaseRecombine(payload.encryptedPhase);
      if (!result.success || !result.data) {
        console.error("[TernaryCompression] Phase decryption failed:", result.error);
        return value;
      }
      compressedBase64 = result.data;
    }

    const rleCompressed = Buffer.from(compressedBase64, "base64");
    const ternaryEncoded = runLengthDecompress(rleCompressed);
    const zlibCompressed = ternaryDecode(ternaryEncoded);
    const original = inflateSync(zlibCompressed);

    return original.toString("utf-8");
  } catch (err) {
    console.error("[TernaryCompression] Decompression failed:", err);
    return value;
  }
}

export function compressJsonForStorage(
  value: any,
  options: { encrypt?: boolean; encryptionMode?: EncryptionMode } = {}
): string | any {
  if (value === null || value === undefined) return value;
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  if (serialized.length < 64) return value;
  return compressForStorage(serialized, options);
}

export function decompressJsonFromStorage(value: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value !== "string") return value;

  const decompressed = decompressFromStorage(value);
  if (decompressed === value) return value;

  try {
    return JSON.parse(decompressed);
  } catch {
    return decompressed;
  }
}

export function getCompressionStats(value: string): CompressionStats | null {
  if (!isCompressedPayload(value)) return null;
  try {
    const payload: CompressedPayload = JSON.parse(value);
    return payload.stats;
  } catch {
    return null;
  }
}

export function estimateCompressionRatio(input: string): {
  estimatedRatio: number;
  worthCompressing: boolean;
  inputSize: number;
} {
  const inputSize = Buffer.byteLength(input, "utf-8");
  const uniqueChars = new Set(input).size;
  const entropy = uniqueChars / Math.max(input.length, 1);
  const estimatedRatio = Math.max(0, (1 - entropy) * 60 + 15);

  return {
    estimatedRatio,
    worthCompressing: inputSize >= 64 && estimatedRatio > 10,
    inputSize,
  };
}
