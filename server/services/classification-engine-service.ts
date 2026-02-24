import { db } from "../db";
import {
  classificationJobs,
  classificationEntities,
  classificationCorrections,
  documentSearchIndex,
  documents,
  wbsNodes,
  wbsMasterCodes,
  type ClassificationJob,
  type ClassificationEntity,
  type ClassificationCorrection,
  type DocumentSearchIndex,
  type Document,
  type WbsNode,
  type WbsMasterCode,
} from "@shared/schema";
import { eq, and, desc, like, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { eventBus } from "./event-bus-service";

type IntakePath =
  | "field_capture"
  | "bulk_zip"
  | "email"
  | "legacy_migration"
  | "api_upload"
  | "manual_upload"
  | "onlyoffice_output"
  | "report_generation";

interface CreateJobParams {
  tenantId: string;
  documentId: string;
  projectId?: string;
  intakePath: IntakePath;
  userProvidedWbsNodeId?: string;
}

interface RecordCorrectionParams {
  tenantId: string;
  classificationJobId: string;
  originalWbsNodeId: string | null;
  correctedWbsNodeId: string;
  correctedBy: string;
  reason?: string;
}

interface ClassifyDocumentParams {
  tenantId: string;
  documentId: string;
  projectId?: string;
  intakePath: IntakePath;
  userProvidedWbsNodeId?: string;
}

interface ClassificationStats {
  totalJobs: number;
  byStatus: Record<string, number>;
  averageConfidence: number;
  reclassificationRate: number;
}

interface ScoredNode {
  node: WbsNode;
  score: number;
  depth: number;
}

class ClassificationEngineService {
  // ---------------------------------------------------------------------------
  // CE-1: OCR Pipeline
  // ---------------------------------------------------------------------------

  async createClassificationJob(params: CreateJobParams): Promise<ClassificationJob> {
    const id = randomUUID();
    const [job] = await db
      .insert(classificationJobs)
      .values({
        id,
        tenantId: params.tenantId,
        documentId: params.documentId,
        projectId: params.projectId ?? null,
        intakePath: params.intakePath,
        status: "pending",
        userProvidedWbsNodeId: params.userProvidedWbsNodeId ?? null,
      })
      .returning();
    return job;
  }

  async processOcr(jobId: string): Promise<ClassificationJob> {
    const job = await this.getJob(jobId);
    if (!job) throw new Error(`Classification job not found: ${jobId}`);

    await this.updateJobStatus(jobId, "processing");

    const startTime = Date.now();

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, job.documentId));

    if (!doc) throw new Error(`Document not found: ${job.documentId}`);

    let ocrText = "";
    if (doc.plainContent) {
      ocrText = doc.plainContent;
    } else {
      const parts: string[] = [];
      if (doc.name) parts.push(doc.name);
      if (doc.description) parts.push(doc.description);
      ocrText = parts.join("\n");
    }

    const pageCount = ocrText ? Math.max(1, Math.ceil(ocrText.length / 3000)) : 1;
    const processingTimeMs = Date.now() - startTime;

    const [updated] = await db
      .update(classificationJobs)
      .set({
        ocrText,
        pageCount,
        processingTimeMs,
        updatedAt: new Date(),
      })
      .where(eq(classificationJobs.id, jobId))
      .returning();

    return updated;
  }

  async getJob(jobId: string): Promise<ClassificationJob | undefined> {
    const [job] = await db
      .select()
      .from(classificationJobs)
      .where(eq(classificationJobs.id, jobId));
    return job;
  }

  async getJobsByDocument(documentId: string): Promise<ClassificationJob[]> {
    return db
      .select()
      .from(classificationJobs)
      .where(eq(classificationJobs.documentId, documentId))
      .orderBy(desc(classificationJobs.createdAt));
  }

  async getJobsByStatus(tenantId: string, status: string): Promise<ClassificationJob[]> {
    return db
      .select()
      .from(classificationJobs)
      .where(
        and(
          eq(classificationJobs.tenantId, tenantId),
          eq(classificationJobs.status, status)
        )
      )
      .orderBy(desc(classificationJobs.createdAt));
  }

  async updateJobStatus(
    jobId: string,
    status: string,
    errorMessage?: string
  ): Promise<ClassificationJob> {
    const updates: Record<string, any> = {
      status,
      updatedAt: new Date(),
    };
    if (errorMessage !== undefined) {
      updates.errorMessage = errorMessage;
    }

    const [updated] = await db
      .update(classificationJobs)
      .set(updates)
      .where(eq(classificationJobs.id, jobId))
      .returning();

    if (!updated) throw new Error(`Classification job not found: ${jobId}`);
    return updated;
  }

  // ---------------------------------------------------------------------------
  // CE-2: Entity Extraction
  // ---------------------------------------------------------------------------

  async extractEntities(jobId: string): Promise<ClassificationEntity[]> {
    const job = await this.getJob(jobId);
    if (!job) throw new Error(`Classification job not found: ${jobId}`);

    const text = job.ocrText || "";
    if (!text) return [];

    const extracted: ClassificationEntity[] = [];

    const csiPattern = /\b(\d{2})\s+(\d{2})\s+(\d{2})\b/g;
    let match: RegExpExecArray | null;
    while ((match = csiPattern.exec(text)) !== null) {
      const code = `${match[1]} ${match[2]} ${match[3]}`;
      extracted.push(
        await this.insertEntity(job.tenantId, jobId, "csi_code", code, 0.9)
      );
    }

    const docTypeKeywords: Record<string, string[]> = {
      submittal: ["submittal", "shop drawing", "product data"],
      rfi: ["rfi", "request for information"],
      change_order: ["change order", "co #", "change directive"],
      invoice: ["invoice", "payment application", "pay app"],
      inspection_report: ["inspection report", "field report", "site inspection"],
      drawing: ["drawing", "blueprint", "plan sheet"],
      specification: ["specification", "spec section"],
      permit: ["permit", "building permit", "occupancy permit"],
      schedule: ["schedule", "gantt", "milestone"],
      contract: ["contract", "agreement", "subcontract"],
    };

    const lowerText = text.toLowerCase();
    for (const [docType, keywords] of Object.entries(docTypeKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          extracted.push(
            await this.insertEntity(job.tenantId, jobId, "document_type", docType, 0.8)
          );
          break;
        }
      }
    }

    const companyPattern = /(?:[A-Z][a-zA-Z&\s]+)\s+(?:Inc\.|Ltd\.|LLC|Corp\.|Co\.|L\.P\.|LP|Corporation|Incorporated)/g;
    let companyMatch: RegExpExecArray | null;
    while ((companyMatch = companyPattern.exec(text)) !== null) {
      const companyName = companyMatch[0].trim();
      if (companyName.length > 3 && companyName.length < 100) {
        extracted.push(
          await this.insertEntity(job.tenantId, jobId, "company_name", companyName, 0.7)
        );
      }
    }

    const datePattern =
      /\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b/gi;
    let dateMatch: RegExpExecArray | null;
    while ((dateMatch = datePattern.exec(text)) !== null) {
      extracted.push(
        await this.insertEntity(job.tenantId, jobId, "date_reference", dateMatch[0], 0.85)
      );
    }

    const drawingPattern =
      /\b(?:DWG|Drawing|Rev|Revision|Sheet)\s*[#:]?\s*([A-Z0-9][\w\-\.]*)/gi;
    let drawingMatch: RegExpExecArray | null;
    while ((drawingMatch = drawingPattern.exec(text)) !== null) {
      extracted.push(
        await this.insertEntity(
          job.tenantId,
          jobId,
          "drawing_revision",
          drawingMatch[0].trim(),
          0.75
        )
      );
    }

    return extracted;
  }

  async getEntities(jobId: string): Promise<ClassificationEntity[]> {
    return db
      .select()
      .from(classificationEntities)
      .where(eq(classificationEntities.classificationJobId, jobId))
      .orderBy(desc(classificationEntities.createdAt));
  }

  private async insertEntity(
    tenantId: string,
    jobId: string,
    entityType: string,
    entityValue: string,
    confidence: number
  ): Promise<ClassificationEntity> {
    const id = randomUUID();
    const [entity] = await db
      .insert(classificationEntities)
      .values({
        id,
        tenantId,
        classificationJobId: jobId,
        entityType,
        entityValue,
        confidence: String(confidence),
      })
      .returning();
    return entity;
  }

  // ---------------------------------------------------------------------------
  // CE-3: 13-Level WBS Resolution
  // ---------------------------------------------------------------------------

  async resolveWbsNode(jobId: string): Promise<WbsNode | null> {
    const job = await this.getJob(jobId);
    if (!job) throw new Error(`Classification job not found: ${jobId}`);

    const entities = await this.getEntities(jobId);

    let nodes: WbsNode[];
    if (job.projectId) {
      nodes = await db
        .select()
        .from(wbsNodes)
        .where(eq(wbsNodes.projectId, job.projectId));
    } else {
      nodes = await db
        .select()
        .from(wbsNodes)
        .where(eq(wbsNodes.tenantId, job.tenantId));
    }

    if (nodes.length === 0) {
      await this.updateJobStatus(jobId, "completed");
      return null;
    }

    const csiCodes = entities
      .filter((e) => e.entityType === "csi_code")
      .map((e) => e.entityValue.toLowerCase());

    const docTypes = entities
      .filter((e) => e.entityType === "document_type")
      .map((e) => e.entityValue.toLowerCase());

    const keywords = entities
      .filter((e) => e.entityType === "company_name" || e.entityType === "drawing_revision")
      .map((e) => e.entityValue.toLowerCase());

    const ocrLower = (job.ocrText || "").toLowerCase();

    const masterCodes = await db
      .select()
      .from(wbsMasterCodes)
      .where(eq(wbsMasterCodes.tenantId, job.tenantId));

    const scoredNodes: ScoredNode[] = nodes.map((node) => {
      let score = 0;
      const depth = (node.codePath || "").split(".").length;

      const nodeCode = (node.codePath || "").toLowerCase();
      const nodeDisplay = (node.codeDisplay || "").toLowerCase();
      for (const csi of csiCodes) {
        const csiCompact = csi.replace(/\s/g, "");
        if (nodeCode.includes(csiCompact) || nodeDisplay.includes(csi)) {
          score += 0.4;
          break;
        }
      }

      const matchingMasterCodes = masterCodes.filter((mc) => {
        const dims = node.dimensions as Record<string, any> | null;
        if (!dims) return false;
        return Object.values(dims).some(
          (v) =>
            typeof v === "string" &&
            (v === mc.code || v === mc.id)
        );
      });

      for (const mc of matchingMasterCodes) {
        for (const csi of csiCodes) {
          if (mc.code.toLowerCase().includes(csi.replace(/\s/g, ""))) {
            score += 0.4;
            break;
          }
        }
      }
      score = Math.min(score, 0.4);

      const nodeTitle = (node.title || "").toLowerCase();
      const nodeDesc = (node.description || "").toLowerCase();
      for (const dt of docTypes) {
        if (nodeTitle.includes(dt) || nodeDesc.includes(dt)) {
          score += 0.2;
          break;
        }
      }

      const titleWords = ocrLower.split(/\s+/).filter((w) => w.length > 3);
      let titleMatches = 0;
      for (const word of titleWords.slice(0, 50)) {
        if (nodeTitle.includes(word) || nodeDesc.includes(word)) {
          titleMatches++;
        }
      }
      if (titleWords.length > 0) {
        score += 0.15 * Math.min(1, titleMatches / Math.min(titleWords.length, 10));
      }

      const dims = node.dimensions as Record<string, any> | null;
      if (dims) {
        const dimValues = Object.values(dims)
          .filter((v) => typeof v === "string")
          .map((v) => (v as string).toLowerCase());
        for (const dv of dimValues) {
          if (ocrLower.includes(dv) && dv.length > 2) {
            score += 0.1;
            break;
          }
        }
      }

      if (dims) {
        let dimMatchCount = 0;
        const dimEntries = Object.entries(dims);
        for (const [, val] of dimEntries) {
          if (typeof val === "string" && val.length > 0) {
            for (const kw of keywords) {
              if (kw.includes(val.toLowerCase()) || val.toLowerCase().includes(kw)) {
                dimMatchCount++;
                break;
              }
            }
          }
        }
        if (dimEntries.length > 0) {
          score += 0.15 * Math.min(1, dimMatchCount / dimEntries.length);
        }
      }

      return { node, score, depth };
    });

    const threshold = 0.3;
    const qualifying = scoredNodes
      .filter((s) => s.score >= threshold)
      .sort((a, b) => {
        if (Math.abs(b.score - a.score) < 0.01) {
          return b.depth - a.depth;
        }
        return b.score - a.score;
      });

    const bestMatch = qualifying.length > 0 ? qualifying[0] : null;

    if (job.userProvidedWbsNodeId && bestMatch) {
      if (bestMatch.node.id !== job.userProvidedWbsNodeId) {
        console.warn(
          `[ClassificationEngine] WBS cross-validation discrepancy for job ${jobId}: ` +
            `user provided ${job.userProvidedWbsNodeId}, engine resolved ${bestMatch.node.id} ` +
            `(confidence: ${bestMatch.score.toFixed(4)})`
        );
      }
    }

    const assignedNodeId = bestMatch?.node.id ?? null;
    const confidenceScore = bestMatch?.score ?? 0;

    await db
      .update(classificationJobs)
      .set({
        assignedWbsNodeId: assignedNodeId,
        confidenceScore: String(confidenceScore.toFixed(4)),
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(classificationJobs.id, jobId));

    return bestMatch?.node ?? null;
  }

  async getClassificationStats(tenantId: string): Promise<ClassificationStats> {
    const jobs = await db
      .select()
      .from(classificationJobs)
      .where(eq(classificationJobs.tenantId, tenantId));

    const byStatus: Record<string, number> = {};
    let totalConfidence = 0;
    let confidenceCount = 0;
    let reclassifiedCount = 0;

    for (const job of jobs) {
      const s = job.status || "unknown";
      byStatus[s] = (byStatus[s] || 0) + 1;

      if (job.confidenceScore) {
        totalConfidence += parseFloat(job.confidenceScore);
        confidenceCount++;
      }

      if (job.reclassified) {
        reclassifiedCount++;
      }
    }

    return {
      totalJobs: jobs.length,
      byStatus,
      averageConfidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
      reclassificationRate: jobs.length > 0 ? reclassifiedCount / jobs.length : 0,
    };
  }

  // ---------------------------------------------------------------------------
  // CE-5: Feedback (basic)
  // ---------------------------------------------------------------------------

  async recordCorrection(params: RecordCorrectionParams): Promise<ClassificationCorrection> {
    const id = randomUUID();
    const [correction] = await db
      .insert(classificationCorrections)
      .values({
        id,
        tenantId: params.tenantId,
        classificationJobId: params.classificationJobId,
        originalWbsNodeId: params.originalWbsNodeId,
        correctedWbsNodeId: params.correctedWbsNodeId,
        correctedBy: params.correctedBy,
        reason: params.reason ?? null,
      })
      .returning();

    await db
      .update(classificationJobs)
      .set({
        assignedWbsNodeId: params.correctedWbsNodeId,
        reclassified: true,
        updatedAt: new Date(),
      })
      .where(eq(classificationJobs.id, params.classificationJobId));

    return correction;
  }

  async getCorrections(tenantId: string, limit?: number): Promise<ClassificationCorrection[]> {
    const query = db
      .select()
      .from(classificationCorrections)
      .where(eq(classificationCorrections.tenantId, tenantId))
      .orderBy(desc(classificationCorrections.createdAt));

    if (limit) {
      return query.limit(limit);
    }
    return query;
  }

  // ---------------------------------------------------------------------------
  // Full Pipeline
  // ---------------------------------------------------------------------------

  async classifyDocument(
    params: ClassifyDocumentParams
  ): Promise<{ job: ClassificationJob; assignedNode: WbsNode | null }> {
    const job = await this.createClassificationJob(params);

    try {
      await eventBus.publish({
        tenantId: params.tenantId,
        eventType: "document.captured",
        documentId: params.documentId,
        projectId: params.projectId,
        payload: { intakePath: params.intakePath, classificationJobId: job.id },
        metadata: { source: "classification-engine" },
      });
    } catch (eventErr) {
      console.warn("[ClassificationEngine] Failed to emit document.captured event:", eventErr);
    }

    try {
      await this.processOcr(job.id);
      await this.extractEntities(job.id);
      const assignedNode = await this.resolveWbsNode(job.id);

      const finalJob = await this.getJob(job.id);

      try {
        await eventBus.publish({
          tenantId: params.tenantId,
          eventType: "document.classified",
          documentId: params.documentId,
          projectId: params.projectId,
          payload: {
            confidenceScore: finalJob?.confidenceScore,
            assignedWbsNodeId: finalJob?.assignedWbsNodeId,
            classificationJobId: job.id,
          },
          metadata: { source: "classification-engine" },
        });
      } catch (eventErr) {
        console.warn("[ClassificationEngine] Failed to emit document.classified event:", eventErr);
      }

      return { job: finalJob!, assignedNode };
    } catch (err: any) {
      await this.updateJobStatus(job.id, "failed", err.message);

      try {
        await eventBus.publish({
          tenantId: params.tenantId,
          eventType: "document.captured",
          documentId: params.documentId,
          projectId: params.projectId,
          payload: { intakePath: params.intakePath, classificationJobId: job.id },
          metadata: { source: "classification-engine", error: err.message },
        });
      } catch (eventErr) {
        console.warn("[ClassificationEngine] Failed to emit document.captured (failure) event:", eventErr);
      }

      const failedJob = await this.getJob(job.id);
      return { job: failedJob!, assignedNode: null };
    }
  }
}

export const classificationEngine = new ClassificationEngineService();
