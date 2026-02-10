import { storage } from "../storage";
import type { DocumentLock } from "@shared/schema";

export interface WopiFileInfo {
  BaseFileName: string;
  OwnerId: string;
  Size: number;
  SHA256: string;
  Version: string;
  SupportsUpdate: boolean;
  UserCanWrite: boolean;
  UserCanNotWriteRelative: boolean;
  SupportsLocks: boolean;
  SupportsGetLock: boolean;
  ReadOnly: boolean;
  UserFriendlyName: string;
  LastModifiedTime: string;
  CloseUrl?: string;
  HostEditUrl?: string;
  HostViewUrl?: string;
  DownloadUrl?: string;
  FileSharingUrl?: string;
  FileExtension?: string;
  BreadcrumbBrandName?: string;
  BreadcrumbBrandUrl?: string;
  BreadcrumbDocName?: string;
}

export interface WopiAccessToken {
  token: string;
  tokenTtl: number;
  userId: string;
  fileId: string;
  permissions: string[];
}

export interface WopiLockResult {
  success: boolean;
  lockId?: string;
  existingLockId?: string;
  error?: string;
  statusCode: number;
}

export interface WopiFileResult {
  success: boolean;
  version?: string;
  error?: string;
  statusCode: number;
}

const accessTokenStore = new Map<string, WopiAccessToken>();

const LOCK_DURATION_MS = 30 * 60 * 1000;

export function generateAccessToken(userId: string, fileId: string, canWrite: boolean): WopiAccessToken {
  const token = `wopi_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  const tokenTtl = Date.now() + 10 * 60 * 60 * 1000;
  const permissions = canWrite ? ["view", "edit", "save"] : ["view"];

  const accessToken: WopiAccessToken = {
    token,
    tokenTtl,
    userId,
    fileId,
    permissions,
  };

  accessTokenStore.set(token, accessToken);
  return accessToken;
}

export function validateAccessToken(token: string): WopiAccessToken | null {
  const stored = accessTokenStore.get(token);
  if (!stored) return null;
  if (Date.now() > stored.tokenTtl) {
    accessTokenStore.delete(token);
    return null;
  }
  return stored;
}

export async function getFileInfo(documentId: string, userId: string): Promise<WopiFileInfo | null> {
  const doc = await storage.getDocument(documentId);
  if (!doc) return null;

  const ext = doc.name?.split(".").pop()?.toLowerCase() || "";
  const isOfficeDoc = ["docx", "xlsx", "pptx", "doc", "xls", "ppt"].includes(ext);

  return {
    BaseFileName: doc.name || "Untitled",
    OwnerId: doc.tenantId || "system",
    Size: doc.originalSizeBytes || 0,
    SHA256: "",
    Version: doc.updatedAt ? new Date(doc.updatedAt).getTime().toString() : Date.now().toString(),
    SupportsUpdate: isOfficeDoc,
    UserCanWrite: true,
    UserCanNotWriteRelative: true,
    SupportsLocks: true,
    SupportsGetLock: true,
    ReadOnly: false,
    UserFriendlyName: userId,
    LastModifiedTime: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
    FileExtension: `.${ext}`,
    BreadcrumbBrandName: "The Maestro",
    BreadcrumbDocName: doc.name || "Untitled",
  };
}

export async function lockFile(fileId: string, lockId: string, userId: string, tenantId: string): Promise<WopiLockResult> {
  const existingLock = await storage.getDocumentLock(fileId);

  if (existingLock) {
    if (existingLock.lockId === lockId) {
      const refreshed = await storage.updateDocumentLock(existingLock.id, {
        expiresAt: new Date(Date.now() + LOCK_DURATION_MS),
      });
      await logAudit(tenantId, fileId, userId, "lock_refreshed", { lockId });
      return { success: true, lockId, statusCode: 200 };
    }
    return {
      success: false,
      existingLockId: existingLock.lockId,
      error: "File is locked by another session",
      statusCode: 409,
    };
  }

  await storage.createDocumentLock({
    fileId,
    lockId,
    userId,
    tenantId,
    expiresAt: new Date(Date.now() + LOCK_DURATION_MS),
    lockType: "exclusive",
    isActive: true,
  });

  await logAudit(tenantId, fileId, userId, "lock_acquired", { lockId });
  return { success: true, lockId, statusCode: 200 };
}

export async function unlockFile(fileId: string, lockId: string, userId: string, tenantId: string): Promise<WopiLockResult> {
  const existingLock = await storage.getDocumentLock(fileId);

  if (!existingLock) {
    return { success: true, statusCode: 200 };
  }

  if (existingLock.lockId !== lockId) {
    return {
      success: false,
      existingLockId: existingLock.lockId,
      error: "Lock ID mismatch",
      statusCode: 409,
    };
  }

  await storage.deleteDocumentLock(fileId);
  await logAudit(tenantId, fileId, userId, "lock_released", { lockId });
  return { success: true, statusCode: 200 };
}

export async function refreshLock(fileId: string, lockId: string, userId: string, tenantId: string): Promise<WopiLockResult> {
  const existingLock = await storage.getDocumentLock(fileId);

  if (!existingLock) {
    return {
      success: false,
      error: "No lock exists on this file",
      statusCode: 409,
    };
  }

  if (existingLock.lockId !== lockId) {
    return {
      success: false,
      existingLockId: existingLock.lockId,
      error: "Lock ID mismatch",
      statusCode: 409,
    };
  }

  await storage.updateDocumentLock(existingLock.id, {
    expiresAt: new Date(Date.now() + LOCK_DURATION_MS),
  });

  await logAudit(tenantId, fileId, userId, "lock_refreshed", { lockId });
  return { success: true, lockId, statusCode: 200 };
}

export async function unlockAndRelock(
  fileId: string,
  oldLockId: string,
  newLockId: string,
  userId: string,
  tenantId: string
): Promise<WopiLockResult> {
  const existingLock = await storage.getDocumentLock(fileId);

  if (!existingLock) {
    return {
      success: false,
      error: "No lock exists on this file",
      statusCode: 409,
    };
  }

  if (existingLock.lockId !== oldLockId) {
    return {
      success: false,
      existingLockId: existingLock.lockId,
      error: "Lock ID mismatch",
      statusCode: 409,
    };
  }

  await storage.updateDocumentLock(existingLock.id, {
    lockId: newLockId,
    expiresAt: new Date(Date.now() + LOCK_DURATION_MS),
  });

  await logAudit(tenantId, fileId, userId, "lock_relock", { oldLockId, newLockId });
  return { success: true, lockId: newLockId, statusCode: 200 };
}

export async function getLock(fileId: string): Promise<WopiLockResult> {
  const existingLock = await storage.getDocumentLock(fileId);

  if (!existingLock) {
    return { success: true, lockId: "", statusCode: 200 };
  }

  return { success: true, lockId: existingLock.lockId, statusCode: 200 };
}

export async function putFile(
  fileId: string,
  lockId: string | null,
  content: Buffer,
  userId: string,
  tenantId: string
): Promise<WopiFileResult> {
  const doc = await storage.getDocument(fileId);
  if (!doc) {
    return { success: false, error: "File not found", statusCode: 404 };
  }

  const existingLock = await storage.getDocumentLock(fileId);

  if (existingLock) {
    if (!lockId || existingLock.lockId !== lockId) {
      return {
        success: false,
        error: "Lock mismatch — file is locked by another session",
        statusCode: 409,
      };
    }
  }

  const version = Date.now().toString();
  await storage.updateDocument(fileId, {
    originalSizeBytes: content.length,
    updatedAt: new Date(),
  });

  await logAudit(tenantId, fileId, userId, "file_updated", {
    lockId,
    newSize: content.length,
    version,
  });

  return { success: true, version, statusCode: 200 };
}

export async function deleteFile(fileId: string, lockId: string | null, userId: string, tenantId: string): Promise<WopiFileResult> {
  const doc = await storage.getDocument(fileId);
  if (!doc) {
    return { success: false, error: "File not found", statusCode: 404 };
  }

  const existingLock = await storage.getDocumentLock(fileId);
  if (existingLock && lockId !== existingLock.lockId) {
    return { success: false, error: "File is locked", statusCode: 409 };
  }

  if (existingLock) {
    await storage.deleteDocumentLock(fileId);
  }

  await storage.deleteDocument(fileId);
  await logAudit(tenantId, fileId, userId, "file_deleted", { lockId });

  return { success: true, statusCode: 200 };
}

export async function renameFile(
  fileId: string,
  lockId: string | null,
  newName: string,
  userId: string,
  tenantId: string
): Promise<WopiFileResult & { name?: string }> {
  const doc = await storage.getDocument(fileId);
  if (!doc) {
    return { success: false, error: "File not found", statusCode: 404 };
  }

  const existingLock = await storage.getDocumentLock(fileId);
  if (existingLock && lockId !== existingLock.lockId) {
    return { success: false, error: "File is locked", statusCode: 409 };
  }

  const oldExt = doc.name?.split(".").pop() || "";
  const newExt = newName.split(".").pop() || "";
  const finalName = newExt ? newName : `${newName}.${oldExt}`;

  await storage.updateDocument(fileId, {
    name: finalName,
    updatedAt: new Date(),
  });

  await logAudit(tenantId, fileId, userId, "file_renamed", {
    oldName: doc.name,
    newName: finalName,
    lockId,
  });

  return { success: true, name: finalName, statusCode: 200 };
}

export async function getShareUrl(fileId: string, userId: string, tenantId: string): Promise<{ url: string } | null> {
  const doc = await storage.getDocument(fileId);
  if (!doc) return null;

  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "http://localhost:5000";

  const shareUrl = `${baseUrl}/documents/file-manager?doc=${fileId}`;

  await logAudit(tenantId, fileId, userId, "share_url_generated", { shareUrl });

  return { url: shareUrl };
}

async function logAudit(
  tenantId: string,
  documentId: string,
  userId: string | null,
  action: string,
  details: Record<string, any> = {}
): Promise<void> {
  try {
    await storage.createDocumentAuditLog({
      tenantId,
      documentId,
      userId,
      action,
      details,
      securityMode: "one",
    });
  } catch (err) {
    console.error("WOPI audit log error:", err);
  }
}

export function getOfficeOnlineUrl(fileExtension: string, action: "view" | "edit"): string {
  const ext = fileExtension.replace(".", "").toLowerCase();

  const actionUrls: Record<string, Record<string, string>> = {
    view: {
      docx: "https://word-view.officeapps.live.com/wv/wordviewerframe.aspx",
      doc: "https://word-view.officeapps.live.com/wv/wordviewerframe.aspx",
      xlsx: "https://view.officeapps.live.com/op/embed.aspx",
      xls: "https://view.officeapps.live.com/op/embed.aspx",
      pptx: "https://view.officeapps.live.com/op/embed.aspx",
      ppt: "https://view.officeapps.live.com/op/embed.aspx",
    },
    edit: {
      docx: "https://word-edit.officeapps.live.com/we/wordeditorframe.aspx",
      doc: "https://word-edit.officeapps.live.com/we/wordeditorframe.aspx",
      xlsx: "https://excel.officeapps.live.com/x/_layouts/xlviewerinternal.aspx",
      xls: "https://excel.officeapps.live.com/x/_layouts/xlviewerinternal.aspx",
      pptx: "https://ppt.officeapps.live.com/p/PowerPointFrame.aspx",
      ppt: "https://ppt.officeapps.live.com/p/PowerPointFrame.aspx",
    },
  };

  return actionUrls[action]?.[ext] || actionUrls.view.docx;
}

export function isOfficeDocument(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return ["docx", "xlsx", "pptx", "doc", "xls", "ppt"].includes(ext);
}

export function getDocumentType(filename: string): "word" | "excel" | "powerpoint" | "unknown" {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["docx", "doc"].includes(ext)) return "word";
  if (["xlsx", "xls"].includes(ext)) return "excel";
  if (["pptx", "ppt"].includes(ext)) return "powerpoint";
  return "unknown";
}
