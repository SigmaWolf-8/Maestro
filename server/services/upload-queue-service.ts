import { db } from "../db";
import {
  uploadQueue,
  uploadChunks,
  type UploadQueueItem,
  type UploadChunk,
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { eventBus } from "./event-bus-service";

class UploadQueueService {
  async createUploadEntry(params: {
    tenantId: string;
    userId: string;
    fileName: string;
    fileType?: string;
    fileSizeBytes?: number;
    projectId?: string;
    wbsDestinationPath?: string;
    wbsNodeId?: string;
    sha3Hash?: string;
    hptpCaptureTimestamp?: string;
    deviceCaptureTime?: Date;
    tldsaSignature?: string;
    tldsaKeyId?: string;
    priority?: "safety" | "general";
    chunkCount?: number;
  }): Promise<UploadQueueItem> {
    const id = randomUUID();
    const chunkCount = params.chunkCount ?? 1;
    const [entry] = await db
      .insert(uploadQueue)
      .values({
        id,
        tenantId: params.tenantId,
        userId: params.userId,
        fileName: params.fileName,
        fileType: params.fileType,
        fileSizeBytes: params.fileSizeBytes,
        projectId: params.projectId,
        wbsDestinationPath: params.wbsDestinationPath,
        wbsNodeId: params.wbsNodeId,
        sha3Hash: params.sha3Hash,
        hptpCaptureTimestamp: params.hptpCaptureTimestamp,
        deviceCaptureTime: params.deviceCaptureTime,
        tldsaSignature: params.tldsaSignature,
        tldsaKeyId: params.tldsaKeyId,
        priority: params.priority ?? "general",
        chunkCount,
        chunksUploaded: 0,
        retryCount: 0,
        status: "queued",
      })
      .returning();
    return entry;
  }

  async getQueueEntry(entryId: string): Promise<UploadQueueItem | undefined> {
    const [entry] = await db
      .select()
      .from(uploadQueue)
      .where(eq(uploadQueue.id, entryId));
    return entry;
  }

  async getQueueByUser(tenantId: string, userId: string): Promise<UploadQueueItem[]> {
    return db
      .select()
      .from(uploadQueue)
      .where(and(eq(uploadQueue.tenantId, tenantId), eq(uploadQueue.userId, userId)))
      .orderBy(desc(uploadQueue.createdAt));
  }

  async getQueueByStatus(tenantId: string, status: string): Promise<UploadQueueItem[]> {
    return db
      .select()
      .from(uploadQueue)
      .where(and(eq(uploadQueue.tenantId, tenantId), eq(uploadQueue.status, status)))
      .orderBy(desc(uploadQueue.createdAt));
  }

  async getQueueByProject(tenantId: string, projectId: string): Promise<UploadQueueItem[]> {
    return db
      .select()
      .from(uploadQueue)
      .where(and(eq(uploadQueue.tenantId, tenantId), eq(uploadQueue.projectId, projectId)))
      .orderBy(desc(uploadQueue.createdAt));
  }

  async updateStatus(entryId: string, status: string, errorMessage?: string): Promise<UploadQueueItem | undefined> {
    const [updated] = await db
      .update(uploadQueue)
      .set({
        status,
        errorMessage: errorMessage ?? null,
        updatedAt: new Date(),
      })
      .where(eq(uploadQueue.id, entryId))
      .returning();
    return updated;
  }

  async markClassified(entryId: string, documentId: string): Promise<UploadQueueItem | undefined> {
    const [updated] = await db
      .update(uploadQueue)
      .set({
        status: "classified",
        documentId,
        classifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(uploadQueue.id, entryId))
      .returning();

    if (updated) {
      try {
        await eventBus.publish({
          tenantId: updated.tenantId,
          eventType: "document.classified",
          documentId,
          projectId: updated.projectId ?? undefined,
          payload: { uploadQueueId: entryId, fileName: updated.fileName },
          metadata: { source: "upload-queue" },
        });
      } catch (eventErr) {
        console.warn("[UploadQueue] Failed to emit document.classified event:", eventErr);
      }
    }

    return updated;
  }

  async createChunks(uploadQueueId: string, tenantId: string, chunkCount: number): Promise<UploadChunk[]> {
    const chunks: UploadChunk[] = [];
    for (let i = 0; i < chunkCount; i++) {
      const [chunk] = await db
        .insert(uploadChunks)
        .values({
          id: randomUUID(),
          tenantId,
          uploadQueueId,
          chunkIndex: i,
          uploaded: false,
        })
        .returning();
      chunks.push(chunk);
    }
    return chunks;
  }

  async markChunkUploaded(chunkId: string, sha3Hash?: string): Promise<UploadChunk | undefined> {
    const [updated] = await db
      .update(uploadChunks)
      .set({
        uploaded: true,
        uploadedAt: new Date(),
        sha3Hash: sha3Hash ?? null,
      })
      .where(eq(uploadChunks.id, chunkId))
      .returning();

    if (updated) {
      await db
        .update(uploadQueue)
        .set({
          chunksUploaded: sql`${uploadQueue.chunksUploaded} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(uploadQueue.id, updated.uploadQueueId));
    }

    return updated;
  }

  async getChunks(uploadQueueId: string): Promise<UploadChunk[]> {
    return db
      .select()
      .from(uploadChunks)
      .where(eq(uploadChunks.uploadQueueId, uploadQueueId))
      .orderBy(uploadChunks.chunkIndex);
  }

  async getUploadProgress(uploadQueueId: string): Promise<{ total: number; uploaded: number; percent: number }> {
    const chunks = await this.getChunks(uploadQueueId);
    const total = chunks.length;
    const uploaded = chunks.filter((c) => c.uploaded).length;
    const percent = total === 0 ? 0 : Math.round((uploaded / total) * 100);
    return { total, uploaded, percent };
  }

  async isUploadComplete(uploadQueueId: string): Promise<boolean> {
    const { total, uploaded } = await this.getUploadProgress(uploadQueueId);
    return total > 0 && uploaded === total;
  }

  async completeUpload(uploadQueueId: string): Promise<UploadQueueItem | undefined> {
    const complete = await this.isUploadComplete(uploadQueueId);
    if (!complete) return undefined;

    const [updated] = await db
      .update(uploadQueue)
      .set({
        status: "uploaded",
        updatedAt: new Date(),
      })
      .where(eq(uploadQueue.id, uploadQueueId))
      .returning();

    if (updated) {
      try {
        await eventBus.publish({
          tenantId: updated.tenantId,
          eventType: "document.uploaded",
          documentId: updated.documentId ?? undefined,
          projectId: updated.projectId ?? undefined,
          payload: { uploadQueueId, fileName: updated.fileName, fileSizeBytes: updated.fileSizeBytes },
          metadata: { source: "upload-queue" },
        });
      } catch (eventErr) {
        console.warn("[UploadQueue] Failed to emit document.uploaded event:", eventErr);
      }
    }

    return updated;
  }

  async recordVerification(entryId: string, verified: boolean): Promise<UploadQueueItem | undefined> {
    const [updated] = await db
      .update(uploadQueue)
      .set({
        signatureVerified: verified,
        status: verified ? "verifying" : "failed",
        errorMessage: verified ? null : "TL-DSA signature verification failed",
        updatedAt: new Date(),
      })
      .where(eq(uploadQueue.id, entryId))
      .returning();

    if (updated && verified) {
      try {
        await eventBus.publish({
          tenantId: updated.tenantId,
          eventType: "document.signed",
          documentId: updated.documentId ?? undefined,
          projectId: updated.projectId ?? undefined,
          payload: { uploadQueueId: entryId, signatureVerified: true },
          metadata: { source: "upload-queue" },
        });
      } catch (eventErr) {
        console.warn("[UploadQueue] Failed to emit document.signed event:", eventErr);
      }
    }

    return updated;
  }

  async getPendingVerifications(tenantId: string): Promise<UploadQueueItem[]> {
    return db
      .select()
      .from(uploadQueue)
      .where(
        and(
          eq(uploadQueue.tenantId, tenantId),
          eq(uploadQueue.status, "uploaded"),
          sql`${uploadQueue.signatureVerified} IS NULL`,
        ),
      )
      .orderBy(desc(uploadQueue.createdAt));
  }

  async getQueueStats(tenantId: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    averageTimeToSyncMs: number | null;
    failureRate: number;
  }> {
    const entries = await db
      .select()
      .from(uploadQueue)
      .where(eq(uploadQueue.tenantId, tenantId));

    const total = entries.length;
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let syncTimeTotal = 0;
    let syncTimeCount = 0;
    let failedCount = 0;

    for (const entry of entries) {
      byStatus[entry.status] = (byStatus[entry.status] ?? 0) + 1;
      const p = entry.priority ?? "general";
      byPriority[p] = (byPriority[p] ?? 0) + 1;

      if (entry.status === "failed") failedCount++;

      if (entry.status === "uploaded" && entry.createdAt && entry.updatedAt) {
        const delta = new Date(entry.updatedAt).getTime() - new Date(entry.createdAt).getTime();
        syncTimeTotal += delta;
        syncTimeCount++;
      }
    }

    return {
      total,
      byStatus,
      byPriority,
      averageTimeToSyncMs: syncTimeCount > 0 ? Math.round(syncTimeTotal / syncTimeCount) : null,
      failureRate: total > 0 ? failedCount / total : 0,
    };
  }

  async getFailedUploads(tenantId: string): Promise<UploadQueueItem[]> {
    return db
      .select()
      .from(uploadQueue)
      .where(and(eq(uploadQueue.tenantId, tenantId), eq(uploadQueue.status, "failed")))
      .orderBy(desc(uploadQueue.createdAt));
  }

  async retryUpload(entryId: string): Promise<UploadQueueItem | undefined> {
    const [updated] = await db
      .update(uploadQueue)
      .set({
        status: "queued",
        retryCount: sql`${uploadQueue.retryCount} + 1`,
        lastRetryAt: new Date(),
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(uploadQueue.id, entryId))
      .returning();
    return updated;
  }

  async cleanupCompleted(tenantId: string, olderThanDays?: number): Promise<number> {
    const days = olderThanDays ?? 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const deleted = await db
      .delete(uploadQueue)
      .where(
        and(
          eq(uploadQueue.tenantId, tenantId),
          eq(uploadQueue.status, "classified"),
          sql`${uploadQueue.updatedAt} < ${cutoff}`,
        ),
      )
      .returning();
    return deleted.length;
  }
}

export const uploadQueueService = new UploadQueueService();
