import { db } from "../db";
import {
  archiveJobs,
  archiveItems,
  documents,
  wbsNodes,
  versionLocks,
  documentEvents,
  reviewSessions,
  reviewerAssignments,
  projects,
  type ArchiveJob,
  type ArchiveItem,
  type WbsNode,
  type Document,
  type VersionLock,
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { eventBus } from "./event-bus-service";

interface WbsTreeNode {
  wbsNode: WbsNode;
  documents: Document[];
  versionLock?: VersionLock;
  children: WbsTreeNode[];
}

class ArchiveAssemblyService {

  async createArchiveJob(params: {
    tenantId: string;
    projectId: string;
    archiveType?: "closeout" | "periodic" | "on_demand";
    assembledBy?: string;
  }): Promise<ArchiveJob> {
    const id = randomUUID();
    const [job] = await db
      .insert(archiveJobs)
      .values({
        id,
        tenantId: params.tenantId,
        projectId: params.projectId,
        status: "pending",
        archiveType: params.archiveType || "closeout",
        assembledBy: params.assembledBy,
      })
      .returning();
    return job;
  }

  async getJob(jobId: string): Promise<ArchiveJob | undefined> {
    const [job] = await db
      .select()
      .from(archiveJobs)
      .where(eq(archiveJobs.id, jobId));
    return job;
  }

  async getJobsByProject(tenantId: string, projectId: string): Promise<ArchiveJob[]> {
    return db
      .select()
      .from(archiveJobs)
      .where(and(eq(archiveJobs.tenantId, tenantId), eq(archiveJobs.projectId, projectId)))
      .orderBy(desc(archiveJobs.createdAt));
  }

  async getJobsByStatus(tenantId: string, status: string): Promise<ArchiveJob[]> {
    return db
      .select()
      .from(archiveJobs)
      .where(and(eq(archiveJobs.tenantId, tenantId), eq(archiveJobs.status, status)))
      .orderBy(desc(archiveJobs.createdAt));
  }

  async updateJobStatus(jobId: string, status: string, errorMessage?: string): Promise<ArchiveJob | undefined> {
    const [updated] = await db
      .update(archiveJobs)
      .set({
        status,
        errorMessage: errorMessage || null,
        updatedAt: new Date(),
      })
      .where(eq(archiveJobs.id, jobId))
      .returning();
    return updated;
  }

  async assembleArchive(jobId: string): Promise<ArchiveJob | undefined> {
    const job = await this.getJob(jobId);
    if (!job) throw new Error(`Archive job ${jobId} not found`);

    await this.updateJobStatus(jobId, "assembling");

    try {
      const tree = await this.walkWbsTree(job.tenantId, job.projectId);

      let totalDocuments = 0;
      let totalVersionLocked = 0;
      let totalDrafts = 0;

      const collectDocsAsync = async (nodes: WbsTreeNode[]) => {
        for (const node of nodes) {
          for (const doc of node.documents) {
            totalDocuments++;

            const vl = node.versionLock;
            const isLocked = vl && vl.documentId === doc.id;

            if (isLocked) {
              totalVersionLocked++;
            }

            const isDraft = doc.status === "draft";
            if (isDraft) {
              totalDrafts++;
            }

            const reviewHistory = await this.getDocumentReviewHistory(doc.id);
            const vlForDoc = isLocked ? vl : undefined;

            await this.addArchiveItem({
              tenantId: job.tenantId,
              archiveJobId: jobId,
              documentId: doc.id,
              wbsPath: node.wbsNode.codePath,
              documentType: doc.category || undefined,
              versionNumber: vlForDoc ? vlForDoc.lockedVersion : 1,
              isDraft,
              sha3Hash: doc.checksum || undefined,
              fileSizeBytes: doc.originalSizeBytes || undefined,
              reviewHistory,
              versionLockTimestamp: vlForDoc?.hptpLockTimestamp || undefined,
            });
          }
          await collectDocsAsync(node.children);
        }
      };

      await collectDocsAsync(tree);

      const manifest = await this.buildManifest(jobId);

      const [updated] = await db
        .update(archiveJobs)
        .set({
          totalDocuments,
          totalVersionLocked,
          totalDrafts,
          manifestJson: manifest,
          status: "signing",
          updatedAt: new Date(),
        })
        .where(eq(archiveJobs.id, jobId))
        .returning();

      return updated;
    } catch (err: any) {
      await this.updateJobStatus(jobId, "failed", err.message);
      throw err;
    }
  }

  async walkWbsTree(tenantId: string, projectId: string): Promise<WbsTreeNode[]> {
    const allNodes = await db
      .select()
      .from(wbsNodes)
      .where(and(eq(wbsNodes.tenantId, tenantId), eq(wbsNodes.projectId, projectId)))
      .orderBy(wbsNodes.codePath);

    const nodeMap = new Map<string, WbsTreeNode>();
    const roots: WbsTreeNode[] = [];

    for (const node of allNodes) {
      const docs = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.tenantId, tenantId),
            eq(documents.projectId, projectId),
          )
        );

      const nodeDocs = docs.filter((d) => {
        const meta = d.metadata as any;
        return meta?.wbsNodeId === node.id;
      });

      const locks = await db
        .select()
        .from(versionLocks)
        .where(eq(versionLocks.tenantId, tenantId));
      const versionLock = locks.find((vl) =>
        nodeDocs.some((d) => d.id === vl.documentId)
      );

      const treeNode: WbsTreeNode = {
        wbsNode: node,
        documents: nodeDocs,
        versionLock,
        children: [],
      };

      nodeMap.set(node.id, treeNode);

      if (!node.parentId || !nodeMap.has(node.parentId)) {
        roots.push(treeNode);
      } else {
        const parent = nodeMap.get(node.parentId);
        if (parent) {
          parent.children.push(treeNode);
        }
      }
    }

    return roots;
  }

  async buildManifest(jobId: string): Promise<object> {
    const job = await this.getJob(jobId);
    if (!job) throw new Error(`Archive job ${jobId} not found`);

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, job.projectId));

    const items = await this.getArchiveItems(jobId);

    const documentIndex = items.map((item) => ({
      documentId: item.documentId,
      wbsPath: item.wbsPath,
      documentType: item.documentType,
      versionNumber: item.versionNumber,
      sha3Hash: item.sha3Hash,
      classificationConfidence: item.classificationConfidence,
      reviewHistory: item.reviewHistory,
      versionLockTimestamp: item.versionLockTimestamp,
      fileSizeBytes: item.fileSizeBytes,
      isDraft: item.isDraft,
    }));

    const events = await db
      .select({
        eventType: documentEvents.eventType,
        count: sql<number>`count(*)::int`,
      })
      .from(documentEvents)
      .where(eq(documentEvents.projectId, job.projectId))
      .groupBy(documentEvents.eventType);

    const eventLogSummary: Record<string, number> = {};
    for (const e of events) {
      eventLogSummary[e.eventType] = e.count;
    }

    return {
      archiveMetadata: {
        archiveJobId: jobId,
        projectId: job.projectId,
        projectName: project?.name || null,
        archiveType: job.archiveType,
        assembledBy: job.assembledBy,
        assembledAt: new Date().toISOString(),
        wbsLevelsTraversed: job.wbsLevelsTraversed,
      },
      documentIndex,
      eventLogSummary,
      totals: {
        totalDocuments: items.length,
        totalVersionLocked: items.filter((i) => !i.isDraft && i.versionLockTimestamp).length,
        totalDrafts: items.filter((i) => i.isDraft).length,
      },
    };
  }

  private async getDocumentReviewHistory(documentId: string): Promise<any[]> {
    const sessions = await db
      .select()
      .from(reviewSessions)
      .where(eq(reviewSessions.documentId, documentId))
      .orderBy(desc(reviewSessions.createdAt));

    const history: any[] = [];

    for (const session of sessions) {
      const assignments = await db
        .select()
        .from(reviewerAssignments)
        .where(eq(reviewerAssignments.reviewSessionId, session.id));

      for (const assignment of assignments) {
        history.push({
          reviewSessionId: session.id,
          revisionNumber: session.revisionNumber,
          reviewerId: assignment.reviewerId,
          role: assignment.role,
          decision: assignment.decision,
          comments: assignment.comments,
          decidedAt: assignment.decidedAt?.toISOString() || null,
          hptpDecisionTimestamp: assignment.hptpDecisionTimestamp,
        });
      }
    }

    return history;
  }

  async addArchiveItem(params: {
    tenantId: string;
    archiveJobId: string;
    documentId: string;
    wbsPath: string;
    documentType?: string;
    versionNumber?: number;
    isDraft?: boolean;
    sha3Hash?: string;
    fileSizeBytes?: number;
    classificationConfidence?: string;
    reviewHistory?: any;
    versionLockTimestamp?: string;
  }): Promise<ArchiveItem> {
    const id = randomUUID();
    const [item] = await db
      .insert(archiveItems)
      .values({
        id,
        tenantId: params.tenantId,
        archiveJobId: params.archiveJobId,
        documentId: params.documentId,
        wbsPath: params.wbsPath,
        documentType: params.documentType || null,
        versionNumber: params.versionNumber || 1,
        isDraft: params.isDraft || false,
        sha3Hash: params.sha3Hash || null,
        fileSizeBytes: params.fileSizeBytes || null,
        classificationConfidence: params.classificationConfidence || null,
        reviewHistory: params.reviewHistory || [],
        versionLockTimestamp: params.versionLockTimestamp || null,
      })
      .returning();
    return item;
  }

  async getArchiveItems(archiveJobId: string): Promise<ArchiveItem[]> {
    return db
      .select()
      .from(archiveItems)
      .where(eq(archiveItems.archiveJobId, archiveJobId))
      .orderBy(archiveItems.wbsPath);
  }

  async getArchiveItemsByWbsPath(archiveJobId: string, wbsPathPrefix: string): Promise<ArchiveItem[]> {
    return db
      .select()
      .from(archiveItems)
      .where(
        and(
          eq(archiveItems.archiveJobId, archiveJobId),
          sql`${archiveItems.wbsPath} LIKE ${wbsPathPrefix + '%'}`,
        )
      )
      .orderBy(archiveItems.wbsPath);
  }

  async sealWithHptp(jobId: string, hptpTimestamp: string): Promise<ArchiveJob | undefined> {
    const [updated] = await db
      .update(archiveJobs)
      .set({
        hptpSealTimestamp: hptpTimestamp,
        updatedAt: new Date(),
      })
      .where(eq(archiveJobs.id, jobId))
      .returning();
    return updated;
  }

  async signArchive(
    jobId: string,
    params: { signature: string; keyId: string; securityLevel?: string }
  ): Promise<ArchiveJob | undefined> {
    const [updated] = await db
      .update(archiveJobs)
      .set({
        tldsaManifestSignature: params.signature,
        tldsaManifestKeyId: params.keyId,
        tldsaSecurityLevel: params.securityLevel || "TL-DSA-87",
        updatedAt: new Date(),
      })
      .where(eq(archiveJobs.id, jobId))
      .returning();

    if (updated) {
      try {
        await eventBus.publish({
          tenantId: updated.tenantId,
          eventType: "document.signed",
          projectId: updated.projectId,
          payload: { archiveJobId: jobId, securityLevel: params.securityLevel || "TL-DSA-87", keyId: params.keyId },
          metadata: { source: "archive-assembly" },
        });
      } catch (eventErr) {
        console.warn("[ArchiveAssembly] Failed to emit document.signed event:", eventErr);
      }
    }

    return updated;
  }

  async signArchiveItem(
    itemId: string,
    signature: string,
    keyId: string
  ): Promise<ArchiveItem | undefined> {
    const [updated] = await db
      .update(archiveItems)
      .set({
        tldsaSignature: signature,
        tldsaKeyId: keyId,
      })
      .where(eq(archiveItems.id, itemId))
      .returning();
    return updated;
  }

  async recordInteropExport(jobId: string, exportData: object): Promise<ArchiveJob | undefined> {
    const [updated] = await db
      .update(archiveJobs)
      .set({
        interopBridgeExport: exportData,
        updatedAt: new Date(),
      })
      .where(eq(archiveJobs.id, jobId))
      .returning();
    return updated;
  }

  async recordTlkemEncapsulation(jobId: string, encapsulationData: object): Promise<ArchiveJob | undefined> {
    const [updated] = await db
      .update(archiveJobs)
      .set({
        tlkemEncapsulation: encapsulationData,
        updatedAt: new Date(),
      })
      .where(eq(archiveJobs.id, jobId))
      .returning();

    if (updated) {
      try {
        await eventBus.publish({
          tenantId: updated.tenantId,
          eventType: "document.shared",
          projectId: updated.projectId,
          payload: { archiveJobId: jobId, encapsulationData },
          metadata: { source: "archive-assembly" },
        });
      } catch (eventErr) {
        console.warn("[ArchiveAssembly] Failed to emit document.shared event:", eventErr);
      }
    }

    return updated;
  }

  async sealArchive(jobId: string): Promise<ArchiveJob | undefined> {
    const [updated] = await db
      .update(archiveJobs)
      .set({
        status: "sealed",
        sealedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(archiveJobs.id, jobId))
      .returning();

    if (updated) {
      try {
        await eventBus.publish({
          tenantId: updated.tenantId,
          eventType: "document.archived",
          projectId: updated.projectId,
          payload: { archiveJobId: jobId, archiveType: updated.archiveType, totalDocuments: updated.totalDocuments },
          metadata: { source: "archive-assembly" },
        });
      } catch (eventErr) {
        console.warn("[ArchiveAssembly] Failed to emit document.archived event:", eventErr);
      }
    }

    return updated;
  }

  async getArchiveStats(tenantId: string): Promise<{
    totalArchives: number;
    byStatus: Record<string, number>;
    totalDocumentsArchived: number;
    averageArchiveSize: number;
  }> {
    const allJobs = await db
      .select()
      .from(archiveJobs)
      .where(eq(archiveJobs.tenantId, tenantId));

    const byStatus: Record<string, number> = {};
    let totalDocs = 0;
    let totalSize = 0;
    let sizeCount = 0;

    for (const job of allJobs) {
      byStatus[job.status] = (byStatus[job.status] || 0) + 1;
      totalDocs += job.totalDocuments || 0;
      if (job.archiveSizeBytes) {
        totalSize += job.archiveSizeBytes;
        sizeCount++;
      }
    }

    return {
      totalArchives: allJobs.length,
      byStatus,
      totalDocumentsArchived: totalDocs,
      averageArchiveSize: sizeCount > 0 ? Math.round(totalSize / sizeCount) : 0,
    };
  }

  async verifyArchiveIntegrity(jobId: string): Promise<{ valid: boolean; issues: string[] }> {
    const items = await this.getArchiveItems(jobId);
    const issues: string[] = [];

    for (const item of items) {
      if (!item.sha3Hash) {
        issues.push(`Item ${item.id} (doc ${item.documentId}) missing SHA-3 hash`);
      }
      if (!item.tldsaSignature) {
        issues.push(`Item ${item.id} (doc ${item.documentId}) missing TL-DSA signature`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

export const archiveAssembly = new ArchiveAssemblyService();
