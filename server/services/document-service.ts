import { storage } from "../storage";
import { kongService } from "../kong-service";
import { getPlenumNetClient } from "../integrations/plenum-net-core-client";
import type { EncryptedPhaseData } from "../plenumnet/phase-encryption";
import type { Document, InsertDocument, DocumentMetaTag, DocumentAuditLog, DocumentLock } from "@shared/schema";
import * as wopiService from "./wopi-host-service";

export interface DocumentUploadOptions {
  tenantId: string;
  projectId?: string;
  name: string;
  description?: string;
  category?: string;
  content?: string;
  encrypt?: boolean;
  encryptionMode?: "high_security" | "balanced" | "performance" | "adaptive";
  uploadedBy?: string;
}

export interface DocumentUploadResult {
  document: Document;
  encrypted: boolean;
  encryptionFailed?: boolean;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
  kongTimestamp?: string;
}

export interface DocumentContent {
  content: string | null;
  encrypted: boolean;
  mode?: string;
}

export interface DocumentSearchFilters {
  tenantId: string;
  projectId?: string;
  category?: string;
  status?: string;
  metaTagFilters?: Record<string, string[]>;
  searchTerm?: string;
}

export interface DocumentVersionInfo {
  documentId: string;
  version: string;
  size: number;
  lastModified: string;
  lockedBy?: string;
  lockId?: string;
  lockExpires?: string;
}

export interface BulkOperationResult {
  succeeded: string[];
  failed: Array<{ id: string; error: string }>;
}

class DocumentService {
  async upload(options: DocumentUploadOptions): Promise<DocumentUploadResult> {
    let encryptedContent: string | null = null;
    let originalSize = 0;
    let compressedSize = 0;
    let savingsPercent = 0;
    let kongTimestamp: string | null = null;
    let checksum: string | null = null;
    let encryptionFailed = false;

    let sanitizedContent = options.content;
    if (sanitizedContent) {
      sanitizedContent = sanitizedContent.replace(/\0/g, "");
      originalSize = Buffer.byteLength(sanitizedContent, "utf8");
    }

    const plenumNet = getPlenumNetClient();
    const pnTimestamp = plenumNet.getFemtosecondTimestamp();
    kongTimestamp = pnTimestamp.humanReadable;

    if (sanitizedContent && options.encrypt) {
      try {
        const mode = options.encryptionMode || "balanced";
        const encResult = plenumNet.phaseEncrypt(sanitizedContent, mode);
        const encPayload = {
          engine: "plenumnet",
          version: "4.0.0",
          mode: encResult.mode,
          phases: encResult.encrypted,
          ternaryHash: encResult.ternaryHash,
          timestamp: encResult.timestamp.humanReadable,
        };
        encryptedContent = JSON.stringify(encPayload, (_key, value) =>
          typeof value === "bigint" ? value.toString() : value
        );
        compressedSize = Buffer.byteLength(encryptedContent, "utf8");
        savingsPercent = originalSize > 0 ? ((originalSize - compressedSize) / originalSize) * 100 : 0;
        checksum = encResult.ternaryHash;
      } catch (err) {
        console.error("PlenumNET encryption failed, attempting Kong fallback:", err);
        try {
          const mode = options.encryptionMode || "balanced";
          const encResult = await kongService.encryptData(sanitizedContent, mode);
          encryptedContent = JSON.stringify({ engine: "kong", ...encResult.encrypted });
          compressedSize = encResult.encryptedSize;
          savingsPercent = originalSize > 0 ? ((originalSize - compressedSize) / originalSize) * 100 : 0;
          checksum = encResult.encrypted.checksum;
        } catch {
          encryptionFailed = true;
        }
      }
    }

    const storeEncrypted = !!encryptedContent;

    const document = await storage.createDocument({
      tenantId: options.tenantId,
      projectId: options.projectId,
      name: options.name,
      description: options.description,
      category: options.category,
      status: storeEncrypted ? "encrypted" : "draft",
      originalSizeBytes: originalSize,
      compressedSizeBytes: compressedSize > 0 ? compressedSize : null,
      isEncrypted: storeEncrypted,
      encryptionMode: storeEncrypted ? (options.encryptionMode || "balanced") : null,
      encryptedContent,
      plainContent: storeEncrypted ? null : sanitizedContent,
      checksum,
      kongTimestamp,
      savingsPercent: savingsPercent > 0 ? String(savingsPercent.toFixed(2)) : null,
    });

    await this.audit(options.tenantId, document.id, options.uploadedBy || null, "document_created", {
      name: options.name,
      encrypted: storeEncrypted,
      encryptionEngine: storeEncrypted ? "plenumnet" : null,
      size: originalSize,
    });

    return {
      document,
      encrypted: storeEncrypted,
      encryptionFailed: encryptionFailed || undefined,
      originalSize,
      compressedSize,
      savingsPercent,
      kongTimestamp: kongTimestamp || undefined,
    };
  }

  async getById(documentId: string): Promise<Document | undefined> {
    return storage.getDocument(documentId);
  }

  async getByTenant(tenantId: string): Promise<Document[]> {
    return storage.getDocuments(tenantId);
  }

  async getByProject(projectId: string): Promise<Document[]> {
    return storage.getDocumentsByProject(projectId);
  }

  async search(filters: DocumentSearchFilters): Promise<Document[]> {
    let docs: Document[];

    if (filters.metaTagFilters && Object.keys(filters.metaTagFilters).length > 0) {
      docs = await storage.getDocumentsWithMetaTags(filters.tenantId, filters.metaTagFilters);
    } else if (filters.projectId) {
      docs = await storage.getDocumentsByProject(filters.projectId);
    } else {
      docs = await storage.getDocuments(filters.tenantId);
    }

    if (filters.category) {
      docs = docs.filter((d) => d.category === filters.category);
    }
    if (filters.status) {
      docs = docs.filter((d) => d.status === filters.status);
    }
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      docs = docs.filter(
        (d) =>
          (d.name && d.name.toLowerCase().includes(term)) ||
          (d.description && d.description.toLowerCase().includes(term))
      );
    }

    return docs;
  }

  async update(documentId: string, updates: Partial<Document>, userId?: string): Promise<Document | undefined> {
    const existing = await storage.getDocument(documentId);
    if (!existing) return undefined;

    const lockStatus = await this.isLocked(documentId);
    if (lockStatus.locked) {
      throw new Error(`Document is locked by another session (lock: ${lockStatus.lock!.lockId})`);
    }

    const updated = await storage.updateDocument(documentId, updates);
    if (updated) {
      await this.audit(existing.tenantId, documentId, userId || null, "document_updated", {
        fields: Object.keys(updates),
      });
    }
    return updated;
  }

  async delete(documentId: string, userId?: string): Promise<boolean> {
    const existing = await storage.getDocument(documentId);
    if (!existing) return false;

    const lockStatus = await this.isLocked(documentId);
    if (lockStatus.locked) {
      throw new Error(`Document is locked by another session (lock: ${lockStatus.lock!.lockId})`);
    }

    await storage.deleteDocumentMetaTags(documentId);
    const deleted = await storage.deleteDocument(documentId);

    if (deleted) {
      await this.audit(existing.tenantId, documentId, userId || null, "document_deleted", {
        name: existing.name,
      });
    }
    return deleted;
  }

  async bulkDelete(documentIds: string[], userId?: string): Promise<BulkOperationResult> {
    const succeeded: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of documentIds) {
      try {
        const deleted = await this.delete(id, userId);
        if (deleted) {
          succeeded.push(id);
        } else {
          failed.push({ id, error: "Document not found" });
        }
      } catch (err: any) {
        failed.push({ id, error: err.message });
      }
    }
    return { succeeded, failed };
  }

  async decrypt(documentId: string): Promise<DocumentContent> {
    const doc = await storage.getDocument(documentId);
    if (!doc) throw new Error("Document not found");

    if (!doc.isEncrypted || !doc.encryptedContent) {
      return { content: doc.plainContent, encrypted: false };
    }

    const encrypted = JSON.parse(doc.encryptedContent);

    if (encrypted.engine === "plenumnet") {
      const plenumNet = getPlenumNetClient();
      const phases = encrypted.phases;
      if (phases.primaryPhase?.timestamp?.femtoseconds) {
        phases.primaryPhase.timestamp.femtoseconds = BigInt(phases.primaryPhase.timestamp.femtoseconds);
        phases.primaryPhase.timestamp.salviEpochOffset = BigInt(phases.primaryPhase.timestamp.salviEpochOffset || "0");
      }
      if (phases.secondaryPhase?.timestamp?.femtoseconds) {
        phases.secondaryPhase.timestamp.femtoseconds = BigInt(phases.secondaryPhase.timestamp.femtoseconds);
        phases.secondaryPhase.timestamp.salviEpochOffset = BigInt(phases.secondaryPhase.timestamp.salviEpochOffset || "0");
      }
      if (phases.guardianPhase?.timestamp?.femtoseconds) {
        phases.guardianPhase.timestamp.femtoseconds = BigInt(phases.guardianPhase.timestamp.femtoseconds);
        phases.guardianPhase.timestamp.salviEpochOffset = BigInt(phases.guardianPhase.timestamp.salviEpochOffset || "0");
      }
      const result = plenumNet.phaseDecrypt(phases as EncryptedPhaseData);
      if (!result.success) {
        throw new Error(`PlenumNET decryption failed: ${result.error}`);
      }
      return { content: result.data || null, encrypted: true, mode: encrypted.mode };
    }

    const result = await kongService.decryptData(encrypted);
    return { content: result.data, encrypted: true, mode: result.mode };
  }

  async reEncrypt(
    documentId: string,
    newMode: "high_security" | "balanced" | "performance" | "adaptive",
    userId?: string
  ): Promise<DocumentUploadResult> {
    const content = await this.decrypt(documentId);
    if (!content.content) throw new Error("No content to re-encrypt");

    const doc = await storage.getDocument(documentId);
    if (!doc) throw new Error("Document not found");

    const plenumNet = getPlenumNetClient();
    const encResult = plenumNet.phaseEncrypt(content.content, newMode);
    const encPayload = {
      engine: "plenumnet",
      version: "4.0.0",
      mode: encResult.mode,
      phases: encResult.encrypted,
      ternaryHash: encResult.ternaryHash,
      timestamp: encResult.timestamp.humanReadable,
    };
    const encryptedContent = JSON.stringify(encPayload, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value
    );
    const originalSize = Buffer.byteLength(content.content, "utf8");
    const compressedSize = Buffer.byteLength(encryptedContent, "utf8");
    const savingsPercent = originalSize > 0 ? ((originalSize - compressedSize) / originalSize) * 100 : 0;

    const updated = await storage.updateDocument(documentId, {
      isEncrypted: true,
      encryptionMode: newMode,
      encryptedContent,
      plainContent: null,
      originalSizeBytes: originalSize,
      compressedSizeBytes: compressedSize,
      checksum: encResult.ternaryHash,
      savingsPercent: String(savingsPercent.toFixed(2)),
      status: "encrypted",
    });

    await this.audit(doc.tenantId, documentId, userId || null, "document_re_encrypted", {
      newMode,
      oldMode: doc.encryptionMode,
      engine: "plenumnet",
    });

    return {
      document: updated!,
      encrypted: true,
      originalSize,
      compressedSize,
      savingsPercent,
    };
  }

  // --- Meta Tags ---

  async getMetaTags(documentId: string): Promise<DocumentMetaTag[]> {
    return storage.getDocumentMetaTags(documentId);
  }

  async setMetaTags(
    documentId: string,
    tags: Array<{ dimensionType: string; wbsCodeId?: string | null; customValue?: string | null }>,
    userId?: string
  ): Promise<DocumentMetaTag[]> {
    const doc = await storage.getDocument(documentId);
    if (!doc) throw new Error("Document not found");

    const saved = await storage.setDocumentMetaTags(documentId, tags);

    await this.audit(doc.tenantId, documentId, userId || null, "meta_tags_updated", {
      tagCount: tags.length,
    });

    return saved;
  }

  async removeMetaTags(documentId: string, userId?: string): Promise<boolean> {
    const doc = await storage.getDocument(documentId);
    if (!doc) throw new Error("Document not found");

    const result = await storage.deleteDocumentMetaTags(documentId);

    await this.audit(doc.tenantId, documentId, userId || null, "meta_tags_cleared", {});

    return result;
  }

  // --- WOPI / Office Online ---

  async generateWopiToken(documentId: string, userId: string, readOnly: boolean = false) {
    const doc = await storage.getDocument(documentId);
    if (!doc) throw new Error("Document not found");
    if (!wopiService.isOfficeDocument(doc.name)) {
      throw new Error("Not a supported Office document type");
    }

    return wopiService.generateAccessToken(userId, documentId, !readOnly);
  }

  async getWopiFileInfo(documentId: string, userId: string) {
    return wopiService.getFileInfo(documentId, userId);
  }

  async getVersionInfo(documentId: string): Promise<DocumentVersionInfo | null> {
    const doc = await storage.getDocument(documentId);
    if (!doc) return null;

    const lock = await storage.getDocumentLock(documentId);

    return {
      documentId,
      version: doc.updatedAt ? new Date(doc.updatedAt).getTime().toString() : Date.now().toString(),
      size: doc.originalSizeBytes || 0,
      lastModified: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
      lockedBy: lock?.userId || undefined,
      lockId: lock?.lockId || undefined,
      lockExpires: lock?.expiresAt ? new Date(lock.expiresAt).toISOString() : undefined,
    };
  }

  async isLocked(documentId: string): Promise<{ locked: boolean; lock?: DocumentLock }> {
    const lock = await storage.getDocumentLock(documentId);
    if (!lock || !lock.isActive) return { locked: false };

    if (lock.expiresAt && new Date(lock.expiresAt) < new Date()) {
      await storage.deleteDocumentLock(documentId);
      return { locked: false };
    }

    return { locked: true, lock };
  }

  // --- Audit Logs ---

  async getAuditLogs(documentId: string): Promise<DocumentAuditLog[]> {
    return storage.getDocumentAuditLogs(documentId);
  }

  private async audit(
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
      console.error("Document audit log error:", err);
    }
  }

  // --- Statistics ---

  async getTenantDocumentStats(tenantId: string): Promise<{
    totalDocuments: number;
    encryptedCount: number;
    totalSizeBytes: number;
    compressedSizeBytes: number;
    categoryCounts: Record<string, number>;
    statusCounts: Record<string, number>;
  }> {
    const docs = await storage.getDocuments(tenantId);

    const stats = {
      totalDocuments: docs.length,
      encryptedCount: 0,
      totalSizeBytes: 0,
      compressedSizeBytes: 0,
      categoryCounts: {} as Record<string, number>,
      statusCounts: {} as Record<string, number>,
    };

    for (const doc of docs) {
      if (doc.isEncrypted) stats.encryptedCount++;
      stats.totalSizeBytes += doc.originalSizeBytes || 0;
      stats.compressedSizeBytes += doc.compressedSizeBytes || 0;

      const cat = doc.category || "uncategorized";
      stats.categoryCounts[cat] = (stats.categoryCounts[cat] || 0) + 1;

      const status = doc.status || "unknown";
      stats.statusCounts[status] = (stats.statusCounts[status] || 0) + 1;
    }

    return stats;
  }
}

export const documentService = new DocumentService();
