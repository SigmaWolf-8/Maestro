import { Router, Request, Response } from "express";
import { z } from "zod";
import { eventBus } from "../services/event-bus-service";
import { classificationEngine } from "../services/classification-engine-service";
import { uploadQueueService } from "../services/upload-queue-service";
import { reviewPipeline } from "../services/review-pipeline-service";
import { archiveAssembly } from "../services/archive-assembly-service";
import { getDefaultTenantId } from "./tenants";

const router = Router();

async function getTenantId(req: Request): Promise<string> {
  return (req as any).tenantId || (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || await getDefaultTenantId();
}

async function getUserId(req: Request, tenantId: string): Promise<string> {
  const userId = (req as any).userId || req.body?.userId || (req.query.userId as string);
  if (userId) return userId;
  const { db } = await import("../db");
  const { tenantUsers } = await import("@shared/schema");
  const { eq } = await import("drizzle-orm");
  const users = await db.select({ id: tenantUsers.id }).from(tenantUsers).where(eq(tenantUsers.tenantId, tenantId)).limit(1);
  return users[0]?.id || "unknown";
}

const subscriberSchema = z.object({
  eventType: z.string().min(1),
  subscriberName: z.string().min(1),
  handlerPath: z.string().min(1),
  priority: z.number().int().optional(),
  filterConditions: z.record(z.any()).optional(),
});

const classifySchema = z.object({
  documentId: z.string().min(1),
  projectId: z.string().optional(),
  intakePath: z.enum(["field_capture", "bulk_zip", "email", "legacy_migration", "api_upload", "manual_upload", "onlyoffice_output", "report_generation"]),
  userProvidedWbsNodeId: z.string().optional(),
});

const createUploadSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().optional(),
  fileSizeBytes: z.number().optional(),
  projectId: z.string().optional(),
  wbsDestinationPath: z.string().optional(),
  wbsNodeId: z.string().optional(),
  sha3Hash: z.string().optional(),
  hptpCaptureTimestamp: z.string().optional(),
  tldsaSignature: z.string().optional(),
  tldsaKeyId: z.string().optional(),
  priority: z.enum(["safety", "general"]).optional(),
  chunkCount: z.number().int().min(1).optional(),
});

const createSessionSchema = z.object({
  documentId: z.string().min(1),
  projectId: z.string().optional(),
  wbsNodeId: z.string().optional(),
  reviewWindowHours: z.number().int().optional(),
});

const decisionSchema = z.object({
  decision: z.enum(["approved", "approved_with_comments", "revise_resubmit", "rejected"]),
  comments: z.string().optional(),
});

const versionLockSchema = z.object({
  documentId: z.string().min(1),
  reviewSessionId: z.string().min(1),
  lockedVersion: z.number().int().min(1),
  sha3Hash: z.string().min(1),
  lockedBy: z.string().min(1),
});

const createArchiveSchema = z.object({
  projectId: z.string().min(1),
  archiveType: z.enum(["closeout", "periodic", "on_demand"]).optional(),
});

// ==================== EVENT BUS ROUTES ====================

router.get("/api/events", async (req: Request, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const filters = {
      eventType: req.query.eventType as string | undefined,
      documentId: req.query.documentId as string | undefined,
      projectId: req.query.projectId as string | undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    };
    const events = await eventBus.getEvents(tenantId, filters);
    res.json(events);
  } catch (error: any) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: error.message || "Failed to fetch events" });
  }
});

router.get("/api/events/subscribers", async (req: Request, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const eventType = req.query.eventType as string | undefined;
    const subscribers = await eventBus.getSubscribers(tenantId, eventType);
    res.json(subscribers);
  } catch (error: any) {
    console.error("Error fetching subscribers:", error);
    res.status(500).json({ error: error.message || "Failed to fetch subscribers" });
  }
});

router.post("/api/events/subscribers", async (req: Request, res: Response) => {
  try {
    const parsed = subscriberSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    }
    const tenantId = await getTenantId(req);
    const { eventType, subscriberName, handlerPath, priority, filterConditions } = parsed.data;
    const subscriber = await eventBus.subscribe({
      tenantId,
      eventType,
      subscriberName,
      handlerPath,
      priority,
      filterConditions,
    });
    res.status(201).json(subscriber);
  } catch (error: any) {
    console.error("Error registering subscriber:", error);
    res.status(500).json({ error: error.message || "Failed to register subscriber" });
  }
});

router.get("/api/events/dead-letters", async (req: Request, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const unresolvedOnly = req.query.unresolvedOnly === "true";
    const deadLetters = await eventBus.getDeadLetters(tenantId, { unresolvedOnly });
    res.json(deadLetters);
  } catch (error: any) {
    console.error("Error fetching dead letters:", error);
    res.status(500).json({ error: error.message || "Failed to fetch dead letters" });
  }
});

router.post("/api/events/dead-letters/:id/retry", async (req: Request, res: Response) => {
  try {
    await eventBus.retryDeadLetter(req.params.id as string);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error retrying dead letter:", error);
    res.status(500).json({ error: error.message || "Failed to retry dead letter" });
  }
});

router.post("/api/events/dead-letters/:id/resolve", async (req: Request, res: Response) => {
  try {
    await eventBus.resolveDeadLetter(req.params.id as string);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error resolving dead letter:", error);
    res.status(500).json({ error: error.message || "Failed to resolve dead letter" });
  }
});

router.post("/api/events/replay", async (req: Request, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const { subscriberName, startDate, endDate } = req.body;
    const result = await eventBus.replayEvents(
      tenantId,
      subscriberName,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
    res.json(result);
  } catch (error: any) {
    console.error("Error replaying events:", error);
    res.status(500).json({ error: error.message || "Failed to replay events" });
  }
});

router.get("/api/events/correlation/:correlationId", async (req: Request, res: Response) => {
  try {
    const events = await eventBus.getEventsByCorrelation(req.params.correlationId as string);
    res.json(events);
  } catch (error: any) {
    console.error("Error fetching correlated events:", error);
    res.status(500).json({ error: error.message || "Failed to fetch correlated events" });
  }
});

router.get("/api/events/:id", async (req: Request, res: Response) => {
  try {
    const event = await eventBus.getEventById(req.params.id as string);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json(event);
  } catch (error: any) {
    console.error("Error fetching event:", error);
    res.status(500).json({ error: error.message || "Failed to fetch event" });
  }
});

// ==================== CLASSIFICATION ENGINE ROUTES ====================

router.post("/api/classification/classify", async (req: Request, res: Response) => {
  try {
    const parsed = classifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    }
    const tenantId = await getTenantId(req);
    const { documentId, projectId, intakePath, userProvidedWbsNodeId } = parsed.data;
    const result = await classificationEngine.classifyDocument({
      tenantId,
      documentId,
      projectId,
      intakePath,
      userProvidedWbsNodeId,
    });
    res.json(result);
  } catch (error: any) {
    console.error("Error classifying document:", error);
    res.status(500).json({ error: error.message || "Failed to classify document" });
  }
});

router.get("/api/classification/stats", async (req: Request, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const stats = await classificationEngine.getClassificationStats(tenantId);
    res.json(stats);
  } catch (error: any) {
    console.error("Error fetching classification stats:", error);
    res.status(500).json({ error: error.message || "Failed to fetch classification stats" });
  }
});

router.get("/api/classification/corrections", async (req: Request, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const corrections = await classificationEngine.getCorrections(tenantId, limit);
    res.json(corrections);
  } catch (error: any) {
    console.error("Error fetching corrections:", error);
    res.status(500).json({ error: error.message || "Failed to fetch corrections" });
  }
});

router.post("/api/classification/corrections", async (req: Request, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const { classificationJobId, originalWbsNodeId, correctedWbsNodeId, correctedBy, reason } = req.body;
    const correction = await classificationEngine.recordCorrection({
      tenantId,
      classificationJobId,
      originalWbsNodeId: originalWbsNodeId ?? null,
      correctedWbsNodeId,
      correctedBy,
      reason,
    });
    res.status(201).json(correction);
  } catch (error: any) {
    console.error("Error recording correction:", error);
    res.status(500).json({ error: error.message || "Failed to record correction" });
  }
});

router.get("/api/classification/jobs", async (req: Request, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const status = req.query.status as string | undefined;
    if (status) {
      const jobs = await classificationEngine.getJobsByStatus(tenantId, status);
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      res.json(limit ? jobs.slice(0, limit) : jobs);
    } else {
      const jobs = await classificationEngine.getJobsByStatus(tenantId, "pending");
      const allJobs = [
        ...jobs,
        ...(await classificationEngine.getJobsByStatus(tenantId, "processing")),
        ...(await classificationEngine.getJobsByStatus(tenantId, "completed")),
        ...(await classificationEngine.getJobsByStatus(tenantId, "failed")),
      ];
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      res.json(limit ? allJobs.slice(0, limit) : allJobs);
    }
  } catch (error: any) {
    console.error("Error fetching classification jobs:", error);
    res.status(500).json({ error: error.message || "Failed to fetch classification jobs" });
  }
});

router.get("/api/classification/jobs/:id", async (req: Request, res: Response) => {
  try {
    const job = await classificationEngine.getJob(req.params.id as string);
    if (!job) {
      return res.status(404).json({ error: "Classification job not found" });
    }
    res.json(job);
  } catch (error: any) {
    console.error("Error fetching classification job:", error);
    res.status(500).json({ error: error.message || "Failed to fetch classification job" });
  }
});

router.get("/api/classification/jobs/:id/entities", async (req: Request, res: Response) => {
  try {
    const entities = await classificationEngine.getEntities(req.params.id as string);
    res.json(entities);
  } catch (error: any) {
    console.error("Error fetching entities:", error);
    res.status(500).json({ error: error.message || "Failed to fetch entities" });
  }
});

// ==================== UPLOAD QUEUE ROUTES ====================

router.post("/api/uploads", async (req: Request, res: Response) => {
  try {
    const parsed = createUploadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    }
    const tenantId = await getTenantId(req);
    const {
      fileName, fileType, fileSizeBytes, projectId,
      wbsDestinationPath, wbsNodeId, sha3Hash, hptpCaptureTimestamp,
      tldsaSignature, tldsaKeyId, priority, chunkCount,
    } = parsed.data;
    const deviceCaptureTime = req.body.deviceCaptureTime;
    const userId = await getUserId(req, tenantId);
    const entry = await uploadQueueService.createUploadEntry({
      tenantId,
      userId,
      fileName,
      fileType,
      fileSizeBytes,
      projectId,
      wbsDestinationPath,
      wbsNodeId,
      sha3Hash,
      hptpCaptureTimestamp,
      deviceCaptureTime: deviceCaptureTime ? new Date(deviceCaptureTime) : undefined,
      tldsaSignature,
      tldsaKeyId,
      priority,
      chunkCount,
    });
    res.status(201).json(entry);
  } catch (error: any) {
    console.error("Error creating upload entry:", error);
    res.status(500).json({ error: error.message || "Failed to create upload entry" });
  }
});

router.get("/api/uploads/stats", async (req: Request, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const stats = await uploadQueueService.getQueueStats(tenantId);
    res.json(stats);
  } catch (error: any) {
    console.error("Error fetching upload stats:", error);
    res.status(500).json({ error: error.message || "Failed to fetch upload stats" });
  }
});

router.get("/api/uploads", async (req: Request, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const status = req.query.status as string | undefined;
    const projectId = req.query.projectId as string | undefined;
    const userId = req.query.userId as string | undefined;

    if (userId) {
      const entries = await uploadQueueService.getQueueByUser(tenantId, userId);
      return res.json(entries);
    }
    if (projectId) {
      const entries = await uploadQueueService.getQueueByProject(tenantId, projectId);
      return res.json(entries);
    }
    if (status) {
      const entries = await uploadQueueService.getQueueByStatus(tenantId, status);
      return res.json(entries);
    }
    const entries = await uploadQueueService.getQueueByStatus(tenantId, "queued");
    res.json(entries);
  } catch (error: any) {
    console.error("Error fetching upload queue:", error);
    res.status(500).json({ error: error.message || "Failed to fetch upload queue" });
  }
});

router.get("/api/uploads/:id", async (req: Request, res: Response) => {
  try {
    const entry = await uploadQueueService.getQueueEntry(req.params.id as string);
    if (!entry) {
      return res.status(404).json({ error: "Upload entry not found" });
    }
    res.json(entry);
  } catch (error: any) {
    console.error("Error fetching upload entry:", error);
    res.status(500).json({ error: error.message || "Failed to fetch upload entry" });
  }
});

router.get("/api/uploads/:id/progress", async (req: Request, res: Response) => {
  try {
    const progress = await uploadQueueService.getUploadProgress(req.params.id as string);
    res.json(progress);
  } catch (error: any) {
    console.error("Error fetching upload progress:", error);
    res.status(500).json({ error: error.message || "Failed to fetch upload progress" });
  }
});

router.post("/api/uploads/:id/chunks", async (req: Request, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const { chunkCount } = req.body;
    const chunks = await uploadQueueService.createChunks(req.params.id as string, tenantId, chunkCount);
    res.status(201).json(chunks);
  } catch (error: any) {
    console.error("Error creating chunks:", error);
    res.status(500).json({ error: error.message || "Failed to create chunks" });
  }
});

router.patch("/api/uploads/chunks/:chunkId", async (req: Request, res: Response) => {
  try {
    const chunk = await uploadQueueService.markChunkUploaded(req.params.chunkId as string, req.body.sha3Hash);
    if (!chunk) {
      return res.status(404).json({ error: "Chunk not found" });
    }
    res.json(chunk);
  } catch (error: any) {
    console.error("Error marking chunk uploaded:", error);
    res.status(500).json({ error: error.message || "Failed to mark chunk uploaded" });
  }
});

router.post("/api/uploads/:id/complete", async (req: Request, res: Response) => {
  try {
    const entry = await uploadQueueService.completeUpload(req.params.id as string);
    if (!entry) {
      return res.status(400).json({ error: "Upload not complete - not all chunks uploaded" });
    }
    res.json(entry);
  } catch (error: any) {
    console.error("Error completing upload:", error);
    res.status(500).json({ error: error.message || "Failed to complete upload" });
  }
});

router.post("/api/uploads/:id/verify", async (req: Request, res: Response) => {
  try {
    const { verified } = req.body;
    const entry = await uploadQueueService.recordVerification(req.params.id as string, verified);
    if (!entry) {
      return res.status(404).json({ error: "Upload entry not found" });
    }
    res.json(entry);
  } catch (error: any) {
    console.error("Error recording verification:", error);
    res.status(500).json({ error: error.message || "Failed to record verification" });
  }
});

router.post("/api/uploads/:id/retry", async (req: Request, res: Response) => {
  try {
    const entry = await uploadQueueService.retryUpload(req.params.id as string);
    if (!entry) {
      return res.status(404).json({ error: "Upload entry not found" });
    }
    res.json(entry);
  } catch (error: any) {
    console.error("Error retrying upload:", error);
    res.status(500).json({ error: error.message || "Failed to retry upload" });
  }
});

// ==================== REVIEW PIPELINE ROUTES ====================

router.post("/api/reviews/sessions", async (req: Request, res: Response) => {
  try {
    const parsed = createSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    }
    const tenantId = await getTenantId(req);
    const { documentId, projectId, wbsNodeId, reviewWindowHours } = parsed.data;
    const session = await reviewPipeline.createReviewSession({
      tenantId,
      documentId,
      projectId,
      wbsNodeId,
      reviewWindowHours,
    });
    const started = await reviewPipeline.startReview(session.id);
    res.status(201).json(started ?? session);
  } catch (error: any) {
    console.error("Error creating review session:", error);
    res.status(500).json({ error: error.message || "Failed to create review session" });
  }
});

router.get("/api/reviews/stats", async (req: Request, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const stats = await reviewPipeline.getReviewStats(tenantId);
    res.json(stats);
  } catch (error: any) {
    console.error("Error fetching review stats:", error);
    res.status(500).json({ error: error.message || "Failed to fetch review stats" });
  }
});

router.get("/api/reviews/overdue", async (req: Request, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const overdue = await reviewPipeline.getOverdueReviews(tenantId);
    res.json(overdue);
  } catch (error: any) {
    console.error("Error fetching overdue reviews:", error);
    res.status(500).json({ error: error.message || "Failed to fetch overdue reviews" });
  }
});

router.get("/api/reviews/my-pending", async (req: Request, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const userId = (req as any).userId || (req.query.userId as string);
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    const pending = await reviewPipeline.getMyPendingReviews(tenantId, userId);
    res.json(pending);
  } catch (error: any) {
    console.error("Error fetching pending reviews:", error);
    res.status(500).json({ error: error.message || "Failed to fetch pending reviews" });
  }
});

router.post("/api/reviews/version-locks", async (req: Request, res: Response) => {
  try {
    const parsed = versionLockSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    }
    const { documentId, reviewSessionId, lockedVersion, sha3Hash, lockedBy } = parsed.data;
    const lock = await reviewPipeline.lockVersion({
      documentId,
      reviewSessionId,
      lockedVersion,
      sha3Hash,
      lockedBy,
    });
    res.status(201).json(lock);
  } catch (error: any) {
    console.error("Error locking version:", error);
    res.status(500).json({ error: error.message || "Failed to lock version" });
  }
});

router.get("/api/reviews/version-locks/:documentId", async (req: Request, res: Response) => {
  try {
    const lock = await reviewPipeline.getVersionLock(req.params.documentId as string);
    if (!lock) {
      return res.status(404).json({ error: "Version lock not found" });
    }
    res.json(lock);
  } catch (error: any) {
    console.error("Error fetching version lock:", error);
    res.status(500).json({ error: error.message || "Failed to fetch version lock" });
  }
});

router.post("/api/reviews/wbs-config", async (req: Request, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const { wbsNodeId, reviewerUserId, reviewerRole, reviewerGroupId, isRequired, reviewWindowHours, autoEscalateHours } = req.body;
    const config = await reviewPipeline.configureWbsReviewer({
      tenantId,
      wbsNodeId,
      reviewerUserId,
      reviewerRole,
      reviewerGroupId,
      isRequired,
      reviewWindowHours,
      autoEscalateHours,
    });
    res.status(201).json(config);
  } catch (error: any) {
    console.error("Error configuring WBS reviewer:", error);
    res.status(500).json({ error: error.message || "Failed to configure WBS reviewer" });
  }
});

router.get("/api/reviews/wbs-config/:wbsNodeId", async (req: Request, res: Response) => {
  try {
    const configs = await reviewPipeline.getWbsReviewerConfig(req.params.wbsNodeId as string);
    res.json(configs);
  } catch (error: any) {
    console.error("Error fetching WBS reviewer config:", error);
    res.status(500).json({ error: error.message || "Failed to fetch WBS reviewer config" });
  }
});

router.get("/api/reviews/sessions", async (req: Request, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const status = req.query.status as string | undefined;
    const projectId = req.query.projectId as string | undefined;

    if (status) {
      const sessions = await reviewPipeline.getSessionsByStatus(tenantId, status);
      return res.json(sessions);
    }
    if (projectId) {
      const sessions = await reviewPipeline.getSessionsByProject(tenantId, projectId);
      return res.json(sessions);
    }
    const sessions = await reviewPipeline.getAllSessions(tenantId);
    res.json(sessions);
  } catch (error: any) {
    console.error("Error fetching review sessions:", error);
    res.status(500).json({ error: error.message || "Failed to fetch review sessions" });
  }
});

router.get("/api/reviews/sessions/:id", async (req: Request, res: Response) => {
  try {
    const session = await reviewPipeline.getSession(req.params.id as string);
    if (!session) {
      return res.status(404).json({ error: "Review session not found" });
    }
    res.json(session);
  } catch (error: any) {
    console.error("Error fetching review session:", error);
    res.status(500).json({ error: error.message || "Failed to fetch review session" });
  }
});

router.patch("/api/reviews/sessions/:id/status", async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status || !["staged", "in_review", "approved", "rejected", "escalated"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const session = await reviewPipeline.updateSessionStatus(req.params.id as string, status);
    if (!session) {
      return res.status(404).json({ error: "Review session not found" });
    }
    res.json(session);
  } catch (error: any) {
    console.error("Error updating review status:", error);
    res.status(500).json({ error: error.message || "Failed to update review status" });
  }
});

router.post("/api/reviews/sessions/:id/start", async (req: Request, res: Response) => {
  try {
    const session = await reviewPipeline.startReview(req.params.id as string);
    if (!session) {
      return res.status(404).json({ error: "Review session not found" });
    }
    res.json(session);
  } catch (error: any) {
    console.error("Error starting review:", error);
    res.status(500).json({ error: error.message || "Failed to start review" });
  }
});

router.post("/api/reviews/sessions/:id/assign", async (req: Request, res: Response) => {
  try {
    const assignments = await reviewPipeline.assignReviewers(req.params.id as string);
    res.json(assignments);
  } catch (error: any) {
    console.error("Error assigning reviewers:", error);
    res.status(500).json({ error: error.message || "Failed to assign reviewers" });
  }
});

router.get("/api/reviews/sessions/:id/assignments", async (req: Request, res: Response) => {
  try {
    const assignments = await reviewPipeline.getAssignments(req.params.id as string);
    res.json(assignments);
  } catch (error: any) {
    console.error("Error fetching assignments:", error);
    res.status(500).json({ error: error.message || "Failed to fetch assignments" });
  }
});

router.post("/api/reviews/sessions/:id/reviewers", async (req: Request, res: Response) => {
  try {
    const { reviewerId, role } = req.body;
    const assignment = await reviewPipeline.addReviewer(req.params.id as string, reviewerId, role);
    res.status(201).json(assignment);
  } catch (error: any) {
    console.error("Error adding reviewer:", error);
    res.status(500).json({ error: error.message || "Failed to add reviewer" });
  }
});

router.post("/api/reviews/assignments/:id/decision", async (req: Request, res: Response) => {
  try {
    const parsed = decisionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    }
    const { decision, comments } = parsed.data;
    const assignment = await reviewPipeline.submitDecision(req.params.id as string, decision, comments);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    res.json(assignment);
  } catch (error: any) {
    console.error("Error submitting decision:", error);
    res.status(500).json({ error: error.message || "Failed to submit decision" });
  }
});

router.get("/api/reviews/sessions/:id/summary", async (req: Request, res: Response) => {
  try {
    const summary = await reviewPipeline.getSessionDecisionSummary(req.params.id as string);
    res.json(summary);
  } catch (error: any) {
    console.error("Error fetching decision summary:", error);
    res.status(500).json({ error: error.message || "Failed to fetch decision summary" });
  }
});

router.post("/api/reviews/sessions/:id/revision", async (req: Request, res: Response) => {
  try {
    const session = await reviewPipeline.createRevisionCycle(req.params.id as string);
    if (!session) {
      return res.status(404).json({ error: "Review session not found" });
    }
    res.status(201).json(session);
  } catch (error: any) {
    console.error("Error creating revision cycle:", error);
    res.status(500).json({ error: error.message || "Failed to create revision cycle" });
  }
});

// ==================== ARCHIVE ASSEMBLY ROUTES ====================

router.post("/api/archives", async (req: Request, res: Response) => {
  try {
    const parsed = createArchiveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    }
    const tenantId = await getTenantId(req);
    const { projectId, archiveType } = parsed.data;
    const job = await archiveAssembly.createArchiveJob({
      tenantId,
      projectId,
      archiveType,
    });
    res.status(201).json(job);
  } catch (error: any) {
    console.error("Error creating archive job:", error);
    res.status(500).json({ error: error.message || "Failed to create archive job" });
  }
});

router.get("/api/archives/stats", async (req: Request, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const stats = await archiveAssembly.getArchiveStats(tenantId);
    res.json(stats);
  } catch (error: any) {
    console.error("Error fetching archive stats:", error);
    res.status(500).json({ error: error.message || "Failed to fetch archive stats" });
  }
});

router.get("/api/archives", async (req: Request, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const status = req.query.status as string | undefined;
    const projectId = req.query.projectId as string | undefined;

    if (status) {
      const jobs = await archiveAssembly.getJobsByStatus(tenantId, status);
      return res.json(jobs);
    }
    if (projectId) {
      const jobs = await archiveAssembly.getJobsByProject(tenantId, projectId);
      return res.json(jobs);
    }
    const jobs = await archiveAssembly.getJobsByStatus(tenantId, "pending");
    res.json(jobs);
  } catch (error: any) {
    console.error("Error fetching archives:", error);
    res.status(500).json({ error: error.message || "Failed to fetch archives" });
  }
});

router.get("/api/archives/:id", async (req: Request, res: Response) => {
  try {
    const job = await archiveAssembly.getJob(req.params.id as string);
    if (!job) {
      return res.status(404).json({ error: "Archive job not found" });
    }
    res.json(job);
  } catch (error: any) {
    console.error("Error fetching archive job:", error);
    res.status(500).json({ error: error.message || "Failed to fetch archive job" });
  }
});

router.post("/api/archives/:id/assemble", async (req: Request, res: Response) => {
  try {
    const job = await archiveAssembly.assembleArchive(req.params.id as string);
    res.json(job);
  } catch (error: any) {
    console.error("Error assembling archive:", error);
    res.status(500).json({ error: error.message || "Failed to assemble archive" });
  }
});

router.get("/api/archives/:id/items", async (req: Request, res: Response) => {
  try {
    const items = await archiveAssembly.getArchiveItems(req.params.id as string);
    res.json(items);
  } catch (error: any) {
    console.error("Error fetching archive items:", error);
    res.status(500).json({ error: error.message || "Failed to fetch archive items" });
  }
});

router.post("/api/archives/:id/seal-hptp", async (req: Request, res: Response) => {
  try {
    const { hptpTimestamp } = req.body;
    const job = await archiveAssembly.sealWithHptp(req.params.id as string, hptpTimestamp);
    if (!job) {
      return res.status(404).json({ error: "Archive job not found" });
    }
    res.json(job);
  } catch (error: any) {
    console.error("Error sealing with HPTP:", error);
    res.status(500).json({ error: error.message || "Failed to seal with HPTP" });
  }
});

router.post("/api/archives/:id/sign", async (req: Request, res: Response) => {
  try {
    const { signature, keyId, securityLevel } = req.body;
    const job = await archiveAssembly.signArchive(req.params.id as string, { signature, keyId, securityLevel });
    if (!job) {
      return res.status(404).json({ error: "Archive job not found" });
    }
    res.json(job);
  } catch (error: any) {
    console.error("Error signing archive:", error);
    res.status(500).json({ error: error.message || "Failed to sign archive" });
  }
});

router.post("/api/archives/:id/seal", async (req: Request, res: Response) => {
  try {
    const job = await archiveAssembly.sealArchive(req.params.id as string);
    if (!job) {
      return res.status(404).json({ error: "Archive job not found" });
    }
    res.json(job);
  } catch (error: any) {
    console.error("Error sealing archive:", error);
    res.status(500).json({ error: error.message || "Failed to seal archive" });
  }
});

router.post("/api/archives/:id/verify", async (req: Request, res: Response) => {
  try {
    const result = await archiveAssembly.verifyArchiveIntegrity(req.params.id as string);
    res.json(result);
  } catch (error: any) {
    console.error("Error verifying archive:", error);
    res.status(500).json({ error: error.message || "Failed to verify archive" });
  }
});

export default router;
