import {
  phaseSplit,
  phaseRecombine,
  type EncryptionMode,
  type EncryptedPhaseData,
} from "../plenumnet/phase-encryption";
import {
  ENCRYPTED_MARKER,
  getEncryptableFields,
} from "../security/encryption-map";

const DEFAULT_MODE: EncryptionMode = "balanced";

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

interface SerializedEncrypted {
  __marker: typeof ENCRYPTED_MARKER;
  payload: EncryptedPhaseData;
}

function isSerializedEncrypted(value: string): boolean {
  if (!value.startsWith("{")) return false;
  try {
    const parsed = JSON.parse(value, bigIntReviver);
    return parsed && parsed.__marker === ENCRYPTED_MARKER;
  } catch {
    return false;
  }
}

export function encryptField(
  value: string | null | undefined,
  mode: EncryptionMode = DEFAULT_MODE
): string | null | undefined {
  if (value === null || value === undefined || value === "") return value;
  if (isSerializedEncrypted(value)) return value;

  const encrypted = phaseSplit(value, mode);
  const wrapper: SerializedEncrypted = {
    __marker: ENCRYPTED_MARKER,
    payload: encrypted,
  };
  return JSON.stringify(wrapper, bigIntReplacer);
}

export function decryptField(
  value: string | null | undefined
): string | null | undefined {
  if (value === null || value === undefined || value === "") return value;
  if (!isSerializedEncrypted(value)) return value;

  try {
    const wrapper: SerializedEncrypted = JSON.parse(value, bigIntReviver);
    const result = phaseRecombine(wrapper.payload);
    if (result.success && result.data !== undefined) {
      return result.data;
    }
    console.error("[DataEncryption] Decryption failed:", result.error);
    return value;
  } catch (err) {
    console.error("[DataEncryption] Parse error during decryption:", err);
    return value;
  }
}

export function encryptRecord<T extends Record<string, any>>(
  tableName: string,
  record: T,
  mode: EncryptionMode = DEFAULT_MODE
): T {
  const fields = getEncryptableFields(tableName);
  if (fields.length === 0) return record;

  const encrypted: Record<string, any> = { ...record };
  for (const field of fields) {
    if (field in encrypted && typeof encrypted[field] === "string") {
      encrypted[field] = encryptField(encrypted[field], mode);
    }
  }
  return encrypted as T;
}

export function decryptRecord<T extends Record<string, any>>(
  tableName: string,
  record: T | null | undefined
): T | null | undefined {
  if (!record) return record;

  const fields = getEncryptableFields(tableName);
  if (fields.length === 0) return record;

  const decrypted: Record<string, any> = { ...record };
  for (const field of fields) {
    if (field in decrypted && typeof decrypted[field] === "string") {
      decrypted[field] = decryptField(decrypted[field]);
    }
  }
  return decrypted as T;
}

export function decryptRecords<T extends Record<string, any>>(
  tableName: string,
  records: T[]
): T[] {
  const fields = getEncryptableFields(tableName);
  if (fields.length === 0) return records;
  return records.map((r) => decryptRecord(tableName, r)!);
}

export function encryptJsonField(
  value: any,
  mode: EncryptionMode = DEFAULT_MODE
): any {
  if (value === null || value === undefined) return value;
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  return encryptField(serialized, mode);
}

export function decryptJsonField(value: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value !== "string") return value;
  const decrypted = decryptField(value);
  if (decrypted === value) return value;
  try {
    return JSON.parse(decrypted as string);
  } catch {
    return decrypted;
  }
}
