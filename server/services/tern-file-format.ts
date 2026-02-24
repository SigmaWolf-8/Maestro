import { deflateSync, inflateSync } from "zlib";
import {
  ternaryEncode,
  ternaryDecode,
  runLengthCompress,
  runLengthDecompress,
  ternaryHash,
} from "../plenumnet/ternary-encoding";
import {
  phaseSplit,
  phaseRecombine,
  type EncryptionMode,
  type EncryptedPhaseData,
} from "../plenumnet/phase-encryption";

const TERN_MAGIC = Buffer.from("TERN");
const TERN_VERSION = 1;

export interface TernHeader {
  version: number;
  originalFilename: string;
  mimeType: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  hash: string;
  encrypted: boolean;
  encryptionMode?: EncryptionMode;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface TernFile {
  header: TernHeader;
  data: string;
  encryptedPhase?: EncryptedPhaseData;
}

export interface TernEncodeResult {
  ternData: string;
  header: TernHeader;
  savings: number;
}

export interface TernDecodeResult {
  success: boolean;
  data: Buffer;
  header: TernHeader;
  error?: string;
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

export function encodeTernFile(
  fileData: Buffer,
  filename: string,
  mimeType: string,
  options: { encrypt?: boolean; encryptionMode?: EncryptionMode; metadata?: Record<string, any> } = {}
): TernEncodeResult {
  const originalSize = fileData.length;

  const zlibCompressed = deflateSync(fileData, { level: 6 });
  const ternaryEncoded = ternaryEncode(zlibCompressed);
  const rleCompressed = runLengthCompress(ternaryEncoded);

  const compressedSize = rleCompressed.length;
  const compressionRatio = originalSize > 0
    ? ((originalSize - compressedSize) / originalSize) * 100
    : 0;

  const hash = ternaryHash(fileData.toString("base64").substring(0, 1024));

  const header: TernHeader = {
    version: TERN_VERSION,
    originalFilename: filename,
    mimeType,
    originalSize,
    compressedSize,
    compressionRatio,
    hash,
    encrypted: !!options.encrypt,
    encryptionMode: options.encrypt ? (options.encryptionMode || "balanced") : undefined,
    createdAt: new Date().toISOString(),
    metadata: options.metadata,
  };

  let dataBase64 = rleCompressed.toString("base64");

  const ternFile: TernFile = { header, data: dataBase64 };

  if (options.encrypt) {
    const mode = options.encryptionMode || "balanced";
    ternFile.encryptedPhase = phaseSplit(dataBase64, mode);
    ternFile.data = "";
  }

  const headerJson = JSON.stringify(header);
  const headerBuffer = Buffer.from(headerJson, "utf-8");
  const headerLenBuffer = Buffer.alloc(4);
  headerLenBuffer.writeUInt32BE(headerBuffer.length, 0);

  const dataPayload = options.encrypt
    ? Buffer.from(JSON.stringify(ternFile.encryptedPhase, bigIntReplacer), "utf-8")
    : Buffer.from(dataBase64, "base64");

  const fullTern = Buffer.concat([
    TERN_MAGIC,
    headerLenBuffer,
    headerBuffer,
    dataPayload,
  ]);

  const ternData = fullTern.toString("base64");

  return {
    ternData,
    header,
    savings: compressionRatio,
  };
}

export function decodeTernFile(ternData: string): TernDecodeResult {
  try {
    const fullBuffer = Buffer.from(ternData, "base64");

    const magic = fullBuffer.subarray(0, 4);
    if (!magic.equals(TERN_MAGIC)) {
      return {
        success: false,
        data: Buffer.alloc(0),
        header: {} as TernHeader,
        error: "Invalid TERN magic bytes",
      };
    }

    const headerLen = fullBuffer.readUInt32BE(4);
    const headerJson = fullBuffer.subarray(8, 8 + headerLen).toString("utf-8");
    const header: TernHeader = JSON.parse(headerJson);

    const dataPayload = fullBuffer.subarray(8 + headerLen);

    let rleCompressed: Buffer;

    if (header.encrypted) {
      const encryptedPhaseJson = dataPayload.toString("utf-8");
      const encryptedPhase: EncryptedPhaseData = JSON.parse(encryptedPhaseJson, bigIntReviver);
      const result = phaseRecombine(encryptedPhase);
      if (!result.success || !result.data) {
        return {
          success: false,
          data: Buffer.alloc(0),
          header,
          error: `Phase decryption failed: ${result.error}`,
        };
      }
      rleCompressed = Buffer.from(result.data, "base64");
    } else {
      rleCompressed = dataPayload;
    }

    const ternaryEncoded = runLengthDecompress(rleCompressed);
    const zlibCompressed = ternaryDecode(ternaryEncoded);
    const originalData = inflateSync(zlibCompressed);

    return {
      success: true,
      data: originalData,
      header,
    };
  } catch (err: any) {
    return {
      success: false,
      data: Buffer.alloc(0),
      header: {} as TernHeader,
      error: `TERN decode error: ${err.message}`,
    };
  }
}

export function isTernFormat(data: string): boolean {
  try {
    const buf = Buffer.from(data, "base64");
    if (buf.length < 8) return false;
    return buf.subarray(0, 4).equals(TERN_MAGIC);
  } catch {
    return false;
  }
}

export function getTernHeaderFromData(ternData: string): TernHeader | null {
  try {
    const buf = Buffer.from(ternData, "base64");
    if (buf.length < 8 || !buf.subarray(0, 4).equals(TERN_MAGIC)) return null;
    const headerLen = buf.readUInt32BE(4);
    const headerJson = buf.subarray(8, 8 + headerLen).toString("utf-8");
    return JSON.parse(headerJson);
  } catch {
    return null;
  }
}

export function getSupportedMimeTypes(): string[] {
  return [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "text/html",
    "application/json",
    "application/xml",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/svg+xml",
  ];
}
