import { db } from "../db";
import {
  reviewSessions,
  reviewerAssignments,
  wbsReviewerConfig,
  versionLocks,
  documents,
  wbsNodes,
  tenantUsers,
  userGroupMembers,
  type ReviewSession,
  type ReviewerAssignment,
  type WbsReviewerConfig,
  type VersionLock,
} from "@shared/schema";
import { eq, and, desc, sql, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { eventBus } from "./event-bus-service";

class ReviewPipelineService {

  async createReviewSession(params: {
    tenantId: string;
    documentId: string;
    projectId?: string;
    wbsNodeId?: string;
    revisionNumber?: number;
    reviewWindowHours?: number;
    previousSessionId?: string;
  }): Promise<ReviewSession> {
    const id = randomUUID();
    const reviewDeadline = params.reviewWindowHours
      ? new Date(Date.now() + params.reviewWindowHours * 60 * 60 * 1000)
      : null;

    const [session] = await db
      .insert(reviewSessions)
      .values({
        id,
        tenantId: params.tenantId,
        documentId: params.documentId,
        projectId: params.projectId ?? null,
        wbsNodeId: params.wbsNodeId ?? null,
        status: "staged",
        revisionNumber: params.revisionNumber ?? 1,
        reviewWindowHours: params.reviewWindowHours ?? null,
        reviewDeadline,
        previousSessionId: params.previousSessionId ?? null,
      })
      .returning();

    try {
      await eventBus.publish({
        tenantId: params.tenantId,
        eventType: "document.staged",
        documentId: params.documentId,
        projectId: params.projectId,
        payload: { reviewSessionId: id, revisionNumber: params.revisionNumber ?? 1, wbsNodeId: params.wbsNodeId },
        metadata: { source: "review-pipeline" },
      });
    } catch (eventErr) {
      console.warn("[ReviewPipeline] Failed to emit document.staged event:", eventErr);
    }

    return session;
  }

  async getSession(sessionId: string): Promise<ReviewSession | undefined> {
    const [session] = await db
      .select()
      .from(reviewSessions)
      .where(eq(reviewSessions.id, sessionId));
    return session;
  }

  async getSessionsByDocument(documentId: string): Promise<ReviewSession[]> {
    return db
      .select()
      .from(reviewSessions)
      .where(eq(reviewSessions.documentId, documentId))
      .orderBy(desc(reviewSessions.createdAt));
  }

  async getSessionsByProject(tenantId: string, projectId: string): Promise<ReviewSession[]> {
    return db
      .select()
      .from(reviewSessions)
      .where(
        and(
          eq(reviewSessions.tenantId, tenantId),
          eq(reviewSessions.projectId, projectId),
        ),
      )
      .orderBy(desc(reviewSessions.createdAt));
  }

  async getAllSessions(tenantId: string, limit = 50): Promise<ReviewSession[]> {
    return db
      .select()
      .from(reviewSessions)
      .where(eq(reviewSessions.tenantId, tenantId))
      .orderBy(desc(reviewSessions.createdAt))
      .limit(limit);
  }

  async getSessionsByStatus(tenantId: string, status: string): Promise<ReviewSession[]> {
    return db
      .select()
      .from(reviewSessions)
      .where(
        and(
          eq(reviewSessions.tenantId, tenantId),
          eq(reviewSessions.status, status),
        ),
      )
      .orderBy(desc(reviewSessions.createdAt));
  }

  async updateSessionStatus(sessionId: string, status: string): Promise<ReviewSession | undefined> {
    const [updated] = await db
      .update(reviewSessions)
      .set({ status, updatedAt: new Date() })
      .where(eq(reviewSessions.id, sessionId))
      .returning();
    return updated;
  }

  async setOnlyofficeSessionKey(sessionId: string, key: string): Promise<ReviewSession | undefined> {
    const [updated] = await db
      .update(reviewSessions)
      .set({ onlyofficeSessionKey: key, updatedAt: new Date() })
      .where(eq(reviewSessions.id, sessionId))
      .returning();
    return updated;
  }

  async startReview(sessionId: string, hptpTimestamp?: string): Promise<ReviewSession | undefined> {
    const session = await this.getSession(sessionId);
    if (!session) return undefined;

    const reviewDeadline = session.reviewWindowHours
      ? new Date(Date.now() + session.reviewWindowHours * 60 * 60 * 1000)
      : null;

    const [updated] = await db
      .update(reviewSessions)
      .set({
        status: "in_review",
        hptpSessionStart: hptpTimestamp ?? null,
        reviewDeadline,
        updatedAt: new Date(),
      })
      .where(eq(reviewSessions.id, sessionId))
      .returning();
    return updated;
  }

  async configureWbsReviewer(params: {
    tenantId: string;
    wbsNodeId: string;
    reviewerUserId?: string;
    reviewerRole?: string;
    reviewerGroupId?: string;
    isRequired?: boolean;
    reviewWindowHours?: number;
    autoEscalateHours?: number;
  }): Promise<WbsReviewerConfig> {
    const id = randomUUID();
    const [config] = await db
      .insert(wbsReviewerConfig)
      .values({
        id,
        tenantId: params.tenantId,
        wbsNodeId: params.wbsNodeId,
        reviewerUserId: params.reviewerUserId ?? null,
        reviewerRole: params.reviewerRole ?? null,
        reviewerGroupId: params.reviewerGroupId ?? null,
        isRequired: params.isRequired ?? true,
        reviewWindowHours: params.reviewWindowHours ?? 72,
        autoEscalateHours: params.autoEscalateHours ?? null,
      })
      .returning();
    return config;
  }

  async getWbsReviewerConfig(wbsNodeId: string): Promise<WbsReviewerConfig[]> {
    return db
      .select()
      .from(wbsReviewerConfig)
      .where(eq(wbsReviewerConfig.wbsNodeId, wbsNodeId));
  }

  async getWbsReviewerConfigHierarchical(tenantId: string, wbsNodeId: string): Promise<WbsReviewerConfig[]> {
    let currentNodeId: string | null = wbsNodeId;

    while (currentNodeId) {
      const configs = await db
        .select()
        .from(wbsReviewerConfig)
        .where(
          and(
            eq(wbsReviewerConfig.tenantId, tenantId),
            eq(wbsReviewerConfig.wbsNodeId, currentNodeId),
          ),
        );

      if (configs.length > 0) {
        return configs;
      }

      const [parentNode] = await db
        .select({ parentId: wbsNodes.parentId })
        .from(wbsNodes)
        .where(eq(wbsNodes.id, currentNodeId));

      currentNodeId = parentNode?.parentId ?? null;
    }

    return [];
  }

  async assignReviewers(sessionId: string): Promise<ReviewerAssignment[]> {
    const session = await this.getSession(sessionId);
    if (!session || !session.wbsNodeId) return [];

    const configs = await this.getWbsReviewerConfigHierarchical(
      session.tenantId,
      session.wbsNodeId,
    );

    const assignments: ReviewerAssignment[] = [];

    for (const config of configs) {
      if (config.reviewerUserId) {
        const assignment = await this.addReviewer(
          sessionId,
          config.reviewerUserId,
          config.reviewerRole ?? "reviewer",
        );
        assignments.push(assignment);
      }

      if (config.reviewerGroupId) {
        const members = await db
          .select()
          .from(userGroupMembers)
          .where(eq(userGroupMembers.groupId, config.reviewerGroupId));

        for (const member of members) {
          const existing = assignments.find((a) => a.reviewerId === member.userId);
          if (!existing) {
            const assignment = await this.addReviewer(
              sessionId,
              member.userId,
              config.reviewerRole ?? "reviewer",
            );
            assignments.push(assignment);
          }
        }
      }
    }

    return assignments;
  }

  async addReviewer(sessionId: string, reviewerId: string, role?: string): Promise<ReviewerAssignment> {
    const session = await this.getSession(sessionId);
    const id = randomUUID();

    const [assignment] = await db
      .insert(reviewerAssignments)
      .values({
        id,
        tenantId: session?.tenantId ?? "",
        reviewSessionId: sessionId,
        reviewerId,
        role: role ?? "reviewer",
      })
      .returning();

    return assignment;
  }

  async getAssignments(sessionId: string): Promise<ReviewerAssignment[]> {
    return db
      .select()
      .from(reviewerAssignments)
      .where(eq(reviewerAssignments.reviewSessionId, sessionId));
  }

  async getMyPendingReviews(tenantId: string, userId: string): Promise<ReviewerAssignment[]> {
    return db
      .select()
      .from(reviewerAssignments)
      .where(
        and(
          eq(reviewerAssignments.tenantId, tenantId),
          eq(reviewerAssignments.reviewerId, userId),
          isNull(reviewerAssignments.decision),
        ),
      );
  }

  async submitDecision(
    assignmentId: string,
    decision: "approved" | "approved_with_comments" | "revise_resubmit" | "rejected",
    comments?: string,
    hptpTimestamp?: string,
  ): Promise<ReviewerAssignment | undefined> {
    const [updated] = await db
      .update(reviewerAssignments)
      .set({
        decision,
        comments: comments ?? null,
        hptpDecisionTimestamp: hptpTimestamp ?? null,
        decidedAt: new Date(),
      })
      .where(eq(reviewerAssignments.id, assignmentId))
      .returning();

    if (updated) {
      const isApproved = decision === "approved" || decision === "approved_with_comments";
      const eventType = isApproved ? "document.approved" : "document.reviewed";

      try {
        const session = await this.getSession(updated.reviewSessionId);
        await eventBus.publish({
          tenantId: updated.tenantId,
          eventType,
          documentId: session?.documentId,
          projectId: session?.projectId ?? undefined,
          payload: {
            reviewSessionId: updated.reviewSessionId,
            assignmentId,
            decision,
            reviewerId: updated.reviewerId,
            comments: updated.comments,
          },
          metadata: { source: "review-pipeline" },
        });
      } catch (eventErr) {
        console.warn(`[ReviewPipeline] Failed to emit ${eventType} event:`, eventErr);
      }
    }

    return updated;
  }

  async checkAllApprovalsComplete(sessionId: string): Promise<boolean> {
    const assignments = await this.getAssignments(sessionId);
    if (assignments.length === 0) return false;

    return assignments.every(
      (a) => a.decision === "approved" || a.decision === "approved_with_comments",
    );
  }

  async getSessionDecisionSummary(sessionId: string): Promise<{
    required: number;
    approved: number;
    pending: number;
    rejected: number;
  }> {
    const assignments = await this.getAssignments(sessionId);

    return {
      required: assignments.length,
      approved: assignments.filter(
        (a) => a.decision === "approved" || a.decision === "approved_with_comments",
      ).length,
      pending: assignments.filter((a) => !a.decision).length,
      rejected: assignments.filter(
        (a) => a.decision === "rejected" || a.decision === "revise_resubmit",
      ).length,
    };
  }

  async createRevisionCycle(sessionId: string): Promise<ReviewSession | undefined> {
    const session = await this.getSession(sessionId);
    if (!session) return undefined;

    await this.updateSessionStatus(sessionId, "revision_requested");

    return this.createReviewSession({
      tenantId: session.tenantId,
      documentId: session.documentId,
      projectId: session.projectId ?? undefined,
      wbsNodeId: session.wbsNodeId ?? undefined,
      revisionNumber: (session.revisionNumber ?? 1) + 1,
      reviewWindowHours: session.reviewWindowHours ?? undefined,
      previousSessionId: session.id,
    });
  }

  async lockVersion(params: {
    documentId: string;
    reviewSessionId: string;
    lockedVersion: number;
    sha3Hash: string;
    lockedBy: string;
    hptpLockTimestamp?: string;
    tldsaSignature?: string;
    tldsaKeyId?: string;
    tldsaSecurityLevel?: string;
  }): Promise<VersionLock> {
    const session = await this.getSession(params.reviewSessionId);
    const id = randomUUID();

    const [lock] = await db
      .insert(versionLocks)
      .values({
        id,
        tenantId: session?.tenantId ?? "",
        documentId: params.documentId,
        reviewSessionId: params.reviewSessionId,
        lockedVersion: params.lockedVersion,
        sha3Hash: params.sha3Hash,
        lockedBy: params.lockedBy,
        hptpLockTimestamp: params.hptpLockTimestamp ?? null,
        tldsaSignature: params.tldsaSignature ?? null,
        tldsaKeyId: params.tldsaKeyId ?? null,
        tldsaSecurityLevel: params.tldsaSecurityLevel ?? null,
        signedAt: params.tldsaSignature ? new Date() : null,
      })
      .returning();

    try {
      await eventBus.publish({
        tenantId: session?.tenantId ?? "",
        eventType: "document.version_locked",
        documentId: params.documentId,
        projectId: session?.projectId ?? undefined,
        payload: {
          versionLockId: id,
          reviewSessionId: params.reviewSessionId,
          lockedVersion: params.lockedVersion,
          lockedBy: params.lockedBy,
          sha3Hash: params.sha3Hash,
        },
        metadata: { source: "review-pipeline" },
      });
    } catch (eventErr) {
      console.warn("[ReviewPipeline] Failed to emit document.version_locked event:", eventErr);
    }

    return lock;
  }

  async getVersionLock(documentId: string): Promise<VersionLock | undefined> {
    const [lock] = await db
      .select()
      .from(versionLocks)
      .where(eq(versionLocks.documentId, documentId))
      .orderBy(desc(versionLocks.createdAt))
      .limit(1);
    return lock;
  }

  async getVersionLockHistory(documentId: string): Promise<VersionLock[]> {
    return db
      .select()
      .from(versionLocks)
      .where(eq(versionLocks.documentId, documentId))
      .orderBy(desc(versionLocks.createdAt));
  }

  async isVersionLocked(documentId: string): Promise<boolean> {
    const lock = await this.getVersionLock(documentId);
    return !!lock;
  }

  async checkEscalations(tenantId: string): Promise<ReviewSession[]> {
    const now = new Date();

    const overdue = await db
      .select()
      .from(reviewSessions)
      .where(
        and(
          eq(reviewSessions.tenantId, tenantId),
          eq(reviewSessions.status, "in_review"),
          isNull(reviewSessions.escalatedAt),
          sql`${reviewSessions.reviewDeadline} IS NOT NULL AND ${reviewSessions.reviewDeadline} < ${now}`,
        ),
      );

    const escalated: ReviewSession[] = [];
    for (const session of overdue) {
      const [updated] = await db
        .update(reviewSessions)
        .set({ escalatedAt: now, updatedAt: now })
        .where(eq(reviewSessions.id, session.id))
        .returning();
      escalated.push(updated);
    }

    return escalated;
  }

  async getOverdueReviews(tenantId: string): Promise<ReviewSession[]> {
    const now = new Date();
    return db
      .select()
      .from(reviewSessions)
      .where(
        and(
          eq(reviewSessions.tenantId, tenantId),
          eq(reviewSessions.status, "in_review"),
          sql`${reviewSessions.reviewDeadline} IS NOT NULL AND ${reviewSessions.reviewDeadline} < ${now}`,
        ),
      )
      .orderBy(desc(reviewSessions.reviewDeadline));
  }

  async getReviewStats(tenantId: string): Promise<{
    totalSessions: number;
    byStatus: Record<string, number>;
    avgReviewTimeHours: number | null;
    approvalRate: number | null;
  }> {
    const sessions = await db
      .select()
      .from(reviewSessions)
      .where(eq(reviewSessions.tenantId, tenantId));

    const byStatus: Record<string, number> = {};
    for (const s of sessions) {
      byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    }

    const allAssignments = await db
      .select()
      .from(reviewerAssignments)
      .where(eq(reviewerAssignments.tenantId, tenantId));

    const decided = allAssignments.filter((a) => a.decidedAt);
    const approved = decided.filter(
      (a) => a.decision === "approved" || a.decision === "approved_with_comments",
    );

    let avgReviewTimeHours: number | null = null;
    const completedSessions = sessions.filter(
      (s) => s.hptpSessionStart && s.hptpSessionEnd,
    );
    if (completedSessions.length > 0) {
      const durations = completedSessions.map((s) => {
        const start = new Date(s.hptpSessionStart!).getTime();
        const end = new Date(s.hptpSessionEnd!).getTime();
        return (end - start) / (1000 * 60 * 60);
      });
      avgReviewTimeHours =
        durations.reduce((sum, d) => sum + d, 0) / durations.length;
    }

    return {
      totalSessions: sessions.length,
      byStatus,
      avgReviewTimeHours,
      approvalRate: decided.length > 0 ? approved.length / decided.length : null,
    };
  }

  async getReviewerWorkload(tenantId: string): Promise<
    Array<{ reviewerId: string; pendingCount: number }>
  > {
    const pending = await db
      .select({
        reviewerId: reviewerAssignments.reviewerId,
        pendingCount: sql<number>`count(*)::int`,
      })
      .from(reviewerAssignments)
      .where(
        and(
          eq(reviewerAssignments.tenantId, tenantId),
          isNull(reviewerAssignments.decision),
        ),
      )
      .groupBy(reviewerAssignments.reviewerId);

    return pending;
  }
}

export const reviewPipeline = new ReviewPipelineService();
