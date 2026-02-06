import { storage } from "../storage";

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

const accessTokenStore = new Map<string, WopiAccessToken>();

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
