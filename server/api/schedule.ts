import { Router, Request, Response } from "express";
import { db } from "../db";
import { scheduleTasks, scheduleTaskTemplates, vendors, employeeRoles, projects } from "@shared/schema";
import { eq, and, asc, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import { encryptRecord, decryptRecord, decryptRecords, encryptField, decryptField } from "../services/data-encryption-service";
import { getEncryptableFields } from "../security/encryption-map";
import PDFDocument from "pdfkit";

const ALLOWED_TEMPLATE_FIELDS = new Set([
  "taskNumber", "taskName", "stage", "supplierTrade", "responsibility", "whosTask", "supervisor",
  "finListNumber", "ref", "poRefNum", "ktFlag", "ktSort", "moneyCode",
  "taskLenDays", "offsetDays", "prereqTemplateId", "sqftDay", "moneyDay",
  "memo", "orderIndex", "isActive",
]);

const ALLOWED_TASK_FIELDS = new Set([
  "taskName", "stage", "supplierTrade", "responsibility", "whosTask", "supervisor",
  "ordered", "completed", "naFlag", "ktFlag",
  "projectedStart", "projectedFinish", "actualStart", "actualFinish",
  "poNumber", "taskLenDays", "offsetDays", "memo",
  "finListNumber", "ref", "poRefNum", "ktSort", "moneyCode",
  "sqftDay", "moneyDay", "orderIndex",
]);

const templateCreateSchema = z.object({
  tenantId: z.string().min(1),
  taskNumber: z.number().int(),
  taskName: z.string().min(1),
  stage: z.string().default("pre_construction"),
  supplierTrade: z.string().optional(),
  responsibility: z.string().optional(),
  whosTask: z.string().optional(),
  supervisor: z.string().optional(),
  finListNumber: z.number().int().optional(),
  ref: z.string().optional(),
  poRefNum: z.string().optional(),
  ktFlag: z.boolean().optional(),
  ktSort: z.number().int().optional(),
  moneyCode: z.string().optional(),
  taskLenDays: z.number().int().optional(),
  offsetDays: z.number().int().optional(),
  prereqTemplateId: z.string().optional(),
  sqftDay: z.string().optional(),
  moneyDay: z.string().optional(),
  memo: z.string().optional(),
  orderIndex: z.number().int().optional(),
});

const taskCreateSchema = z.object({
  tenantId: z.string().min(1),
  projectId: z.string().min(1),
  taskNumber: z.number().int(),
  taskName: z.string().min(1),
  stage: z.string().default("pre_construction"),
  supplierTrade: z.string().optional(),
  responsibility: z.string().optional(),
  whosTask: z.string().optional(),
  supervisor: z.string().optional(),
  memo: z.string().optional(),
  orderIndex: z.number().int().optional(),
});

export function createScheduleRouter(): Router {
  const router = Router();

  router.get("/api/schedule/templates", async (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string;
    if (!tenantId) return res.status(400).json({ error: "tenantId required" });

    try {
      const templates = await db.select().from(scheduleTaskTemplates)
        .where(eq(scheduleTaskTemplates.tenantId, tenantId))
        .orderBy(asc(scheduleTaskTemplates.orderIndex), asc(scheduleTaskTemplates.taskNumber));
      res.json(decryptRecords("scheduleTaskTemplates", templates));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/api/schedule/templates", async (req: Request, res: Response) => {
    try {
      const data = templateCreateSchema.parse(req.body);
      const id = randomUUID();
      const encrypted = encryptRecord("scheduleTaskTemplates", { ...data });
      const [template] = await db.insert(scheduleTaskTemplates).values({
        id,
        ...encrypted,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      res.status(201).json(decryptRecord("scheduleTaskTemplates", template));
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.patch("/api/schedule/templates/:id/field", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { tenantId, field, value } = req.body;
    if (!tenantId) return res.status(400).json({ error: "tenantId required" });
    if (!field) return res.status(400).json({ error: "field required" });
    if (!ALLOWED_TEMPLATE_FIELDS.has(field)) return res.status(400).json({ error: `Field '${field}' is not allowed` });

    try {
      const encryptableFields = getEncryptableFields("scheduleTaskTemplates");
      const encryptedValue = (typeof value === "string" && encryptableFields.includes(field))
        ? encryptField(value) : value;

      const [updated] = await db.update(scheduleTaskTemplates)
        .set({ [field]: encryptedValue, updatedAt: new Date() })
        .where(and(eq(scheduleTaskTemplates.id, id), eq(scheduleTaskTemplates.tenantId, tenantId)))
        .returning();
      if (!updated) return res.status(404).json({ error: "Template not found" });
      res.json(decryptRecord("scheduleTaskTemplates", updated));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete("/api/schedule/templates/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.query.tenantId as string;
    if (!tenantId) return res.status(400).json({ error: "tenantId required" });
    try {
      await db.delete(scheduleTaskTemplates)
        .where(and(eq(scheduleTaskTemplates.id, id), eq(scheduleTaskTemplates.tenantId, tenantId)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/api/schedule/tasks", async (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string;
    const projectId = req.query.projectId as string;
    const stage = req.query.stage as string;
    const hideCompleted = req.query.hideCompleted === "true";
    const search = req.query.search as string;

    if (!tenantId) return res.status(400).json({ error: "tenantId required" });
    if (!projectId) return res.status(400).json({ error: "projectId required" });

    try {
      const conditions: any[] = [
        eq(scheduleTasks.tenantId, tenantId),
      ];

      if (projectId === "__all_active__") {
        const activeProjects = await db.select({ id: projects.id }).from(projects)
          .where(and(eq(projects.tenantId, tenantId), inArray(projects.status, ["in_progress", "not_started"])));
        const activeIds = activeProjects.map(p => p.id);
        if (activeIds.length === 0) return res.json([]);
        conditions.push(inArray(scheduleTasks.projectId, activeIds));
      } else if (projectId === "__all__") {
        // no project filter - all tasks for tenant
      } else {
        conditions.push(eq(scheduleTasks.projectId, projectId));
      }

      if (stage && stage !== "all") {
        conditions.push(eq(scheduleTasks.stage, stage));
      }
      if (hideCompleted) {
        conditions.push(eq(scheduleTasks.completed, false));
      }

      let tasks = await db.select().from(scheduleTasks)
        .where(and(...conditions))
        .orderBy(asc(scheduleTasks.orderIndex), asc(scheduleTasks.taskNumber));

      let decryptedTasks = decryptRecords("scheduleTasks", tasks);

      if (search) {
        const s = search.toLowerCase();
        decryptedTasks = decryptedTasks.filter(t =>
          t.taskName.toLowerCase().includes(s) ||
          (t.supplierTrade && t.supplierTrade.toLowerCase().includes(s)) ||
          (t.poNumber && t.poNumber.toLowerCase().includes(s)) ||
          (t.memo && t.memo.toLowerCase().includes(s))
        );
      }

      res.json(decryptedTasks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/api/schedule/tasks", async (req: Request, res: Response) => {
    try {
      const data = taskCreateSchema.parse(req.body);
      const id = randomUUID();
      const encrypted = encryptRecord("scheduleTasks", { ...data });
      const [task] = await db.insert(scheduleTasks).values({
        id,
        ...encrypted,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      res.status(201).json(decryptRecord("scheduleTasks", task));
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.patch("/api/schedule/tasks/:id/field", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { tenantId, field, value } = req.body;
    if (!tenantId) return res.status(400).json({ error: "tenantId required" });
    if (!field) return res.status(400).json({ error: "field required" });
    if (!ALLOWED_TASK_FIELDS.has(field)) return res.status(400).json({ error: `Field '${field}' is not allowed` });

    try {
      const encryptableFields = getEncryptableFields("scheduleTasks");
      const encryptedValue = (typeof value === "string" && encryptableFields.includes(field))
        ? encryptField(value) : value;

      const updateData: Record<string, any> = { [field]: encryptedValue, updatedAt: new Date() };

      if (field === "ordered" && value === true) {
        updateData.orderedDate = new Date();
        updateData.projectedStart = new Date();
      }
      if (field === "ordered" && value === false) {
        updateData.orderedDate = null;
        updateData.projectedStart = null;
      }
      if (field === "completed" && value === true) {
        updateData.completedDate = new Date();
        updateData.actualFinish = new Date();
      }
      if (field === "completed" && value === false) {
        updateData.completedDate = null;
        updateData.actualFinish = null;
      }

      const [updated] = await db.update(scheduleTasks)
        .set(updateData)
        .where(and(eq(scheduleTasks.id, id), eq(scheduleTasks.tenantId, tenantId)))
        .returning();
      if (!updated) return res.status(404).json({ error: "Task not found" });
      res.json(decryptRecord("scheduleTasks", updated));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete("/api/schedule/tasks/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.query.tenantId as string;
    if (!tenantId) return res.status(400).json({ error: "tenantId required" });
    try {
      await db.delete(scheduleTasks)
        .where(and(eq(scheduleTasks.id, id), eq(scheduleTasks.tenantId, tenantId)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/api/schedule/apply-template", async (req: Request, res: Response) => {
    const { tenantId, projectId } = req.body;
    if (!tenantId || !projectId) {
      return res.status(400).json({ error: "tenantId and projectId required" });
    }

    try {
      const existing = await db.select().from(scheduleTasks)
        .where(and(eq(scheduleTasks.tenantId, tenantId), eq(scheduleTasks.projectId, projectId)));
      if (existing.length > 0) {
        return res.status(400).json({ error: "Project already has schedule tasks. Delete existing tasks first." });
      }

      const templates = await db.select().from(scheduleTaskTemplates)
        .where(and(eq(scheduleTaskTemplates.tenantId, tenantId), eq(scheduleTaskTemplates.isActive, true)))
        .orderBy(asc(scheduleTaskTemplates.orderIndex), asc(scheduleTaskTemplates.taskNumber));

      if (templates.length === 0) {
        return res.status(404).json({ error: "No templates found for this tenant" });
      }

      const templateIdToTaskId: Record<string, string> = {};
      const taskNameToTaskId: Record<string, string> = {};

      const taskEntries = templates.map(t => {
        const taskId = randomUUID();
        templateIdToTaskId[t.id] = taskId;
        taskNameToTaskId[t.taskName] = taskId;
        return { template: t, taskId };
      });

      const newTasks = taskEntries.map(({ template: t, taskId }) => {
        let prereqTaskId: string | null = null;
        if (t.prereqTemplateId) {
          prereqTaskId = templateIdToTaskId[t.prereqTemplateId]
            || taskNameToTaskId[t.prereqTemplateId]
            || null;
        }
        return {
          id: taskId,
          tenantId,
          projectId,
          templateId: t.id,
          taskNumber: t.taskNumber,
          taskName: t.taskName,
          stage: t.stage,
          supplierTrade: t.supplierTrade,
          responsibility: t.responsibility,
          whosTask: t.whosTask,
          supervisor: t.supervisor,
          finListNumber: t.finListNumber,
          ref: t.ref,
          poRefNum: t.poRefNum,
          ktFlag: t.ktFlag,
          ktSort: t.ktSort,
          moneyCode: t.moneyCode,
          taskLenDays: t.taskLenDays,
          offsetDays: t.offsetDays,
          prereqTaskId,
          sqftDay: t.sqftDay,
          moneyDay: t.moneyDay,
          memo: t.memo,
          orderIndex: t.orderIndex,
          ordered: false,
          completed: false,
          naFlag: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      await db.insert(scheduleTasks).values(newTasks);
      res.status(201).json({ message: `Applied ${newTasks.length} tasks from template`, count: newTasks.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/api/schedule/stages", async (_req: Request, res: Response) => {
    const stages = [
      { key: "all", label: "All Tasks" },
      { key: "pre_construction", label: "Pre-Construction" },
      { key: "foundation", label: "Foundation" },
      { key: "framing", label: "Framing" },
      { key: "mechanicals", label: "Mechanicals" },
      { key: "exterior", label: "Exterior" },
      { key: "insulation", label: "Insulation, Drywall & Taping" },
      { key: "interior", label: "Interior Finishing" },
      { key: "flooring", label: "Floorcoverings" },
      { key: "closeout", label: "Close Out Pre-Occ | Turnover" },
      { key: "sitework", label: "Site Work" },
      { key: "seasonal", label: "Seasonal Deficiencies" },
      { key: "warranty", label: "Warranty" },
    ];
    res.json(stages);
  });

  router.get("/api/schedule/stats", async (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string;
    const projectId = req.query.projectId as string;
    if (!tenantId || !projectId) return res.status(400).json({ error: "tenantId and projectId required" });

    try {
      const tasks = await db.select().from(scheduleTasks)
        .where(and(eq(scheduleTasks.tenantId, tenantId), eq(scheduleTasks.projectId, projectId)));

      const total = tasks.length;
      const completed = tasks.filter(t => t.completed).length;
      const ordered = tasks.filter(t => t.ordered).length;
      const na = tasks.filter(t => t.naFlag).length;
      const active = total - completed - na;
      const stages = [...new Set(tasks.map(t => t.stage))];
      const stageStats = stages.map(s => ({
        stage: s,
        total: tasks.filter(t => t.stage === s).length,
        completed: tasks.filter(t => t.stage === s && t.completed).length,
      }));

      res.json({ total, completed, ordered, na, active, stageStats });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/api/schedule/validate-vendor", async (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string;
    const vendorName = req.query.vendorName as string;
    if (!tenantId || !vendorName) return res.status(400).json({ error: "tenantId and vendorName required" });

    try {
      const allVendors = await db.select({ id: vendors.id, company: vendors.company })
        .from(vendors)
        .where(eq(vendors.tenantId, tenantId));
      const decryptedAll = allVendors.map(v => ({
        ...v,
        company: decryptField(v.company) as string,
      }));
      const matches = decryptedAll.filter(v =>
        v.company && v.company.toLowerCase() === vendorName.toLowerCase()
      );

      res.json({ exists: matches.length > 0, vendor: matches[0] || null });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/api/schedule/vendors-list", async (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string;
    if (!tenantId) return res.status(400).json({ error: "tenantId required" });

    try {
      const vendorList = await db.select({ id: vendors.id, company: vendors.company })
        .from(vendors)
        .where(eq(vendors.tenantId, tenantId))
        .orderBy(asc(vendors.company));
      const decryptedVendors = vendorList.map(v => ({
        ...v,
        company: decryptField(v.company) as string,
      }));
      res.json(decryptedVendors);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/api/schedule/employee-roles", async (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string;
    if (!tenantId) return res.status(400).json({ error: "tenantId required" });

    try {
      const roles = await db.select().from(employeeRoles)
        .where(and(eq(employeeRoles.tenantId, tenantId), eq(employeeRoles.isActive, true)))
        .orderBy(asc(employeeRoles.roleName));
      res.json(decryptRecords("employeeRoles", roles));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/api/schedule/employee-roles", async (req: Request, res: Response) => {
    const { tenantId, roleName, description } = req.body;
    if (!tenantId || !roleName) return res.status(400).json({ error: "tenantId and roleName required" });

    try {
      const encrypted = encryptRecord("employeeRoles", {
        roleName: roleName.trim(),
        description: description?.trim() || null,
      });
      const [role] = await db.insert(employeeRoles).values({
        id: randomUUID(),
        tenantId,
        ...encrypted,
      }).returning();
      res.status(201).json(decryptRecord("employeeRoles", role));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.patch("/api/schedule/employee-roles/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { tenantId, roleName, description, isActive } = req.body;
    if (!tenantId) return res.status(400).json({ error: "tenantId required" });

    try {
      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (roleName !== undefined) updateData.roleName = roleName.trim();
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (isActive !== undefined) updateData.isActive = isActive;

      const encrypted = encryptRecord("employeeRoles", updateData);
      const [updated] = await db.update(employeeRoles)
        .set(encrypted)
        .where(and(eq(employeeRoles.id, id), eq(employeeRoles.tenantId, tenantId)))
        .returning();
      if (!updated) return res.status(404).json({ error: "Role not found" });
      res.json(decryptRecord("employeeRoles", updated));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete("/api/schedule/employee-roles/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.query.tenantId as string;
    if (!tenantId) return res.status(400).json({ error: "tenantId required" });

    try {
      await db.delete(employeeRoles)
        .where(and(eq(employeeRoles.id, id), eq(employeeRoles.tenantId, tenantId)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/api/schedule/auto-schedule", async (req: Request, res: Response) => {
    const { tenantId, projectId, anchorTaskId } = req.body;
    if (!tenantId || !projectId) {
      return res.status(400).json({ error: "tenantId and projectId required" });
    }

    try {
      const allTasks = await db.select().from(scheduleTasks)
        .where(and(eq(scheduleTasks.tenantId, tenantId), eq(scheduleTasks.projectId, projectId)))
        .orderBy(asc(scheduleTasks.orderIndex), asc(scheduleTasks.taskNumber));

      if (allTasks.length === 0) {
        return res.status(404).json({ error: "No tasks found for this project" });
      }

      const taskMap = new Map(allTasks.map(t => [t.id, { ...t }]));
      const childrenMap = new Map<string, string[]>();
      for (const t of allTasks) {
        if (t.prereqTaskId) {
          const existing = childrenMap.get(t.prereqTaskId) || [];
          existing.push(t.id);
          childrenMap.set(t.prereqTaskId, existing);
        }
      }

      function addBusinessDays(start: Date, days: number): Date {
        const result = new Date(start);
        let remaining = Math.abs(days);
        const direction = days >= 0 ? 1 : -1;
        while (remaining > 0) {
          result.setDate(result.getDate() + direction);
          const dow = result.getDay();
          if (dow !== 0 && dow !== 6) {
            remaining--;
          }
        }
        return result;
      }

      const visited = new Set<string>();

      function cascadeFrom(taskId: string) {
        if (visited.has(taskId)) return;
        visited.add(taskId);

        const task = taskMap.get(taskId);
        if (!task || !task.projectedStart) return;

        const lenDays = task.taskLenDays || 1;
        task.projectedFinish = addBusinessDays(new Date(task.projectedStart), lenDays);

        const children = childrenMap.get(taskId) || [];
        for (const childId of children) {
          if (childId === taskId) continue;
          const child = taskMap.get(childId);
          if (!child) continue;
          if (child.naFlag || child.completed) continue;

          const offset = child.offsetDays || 0;
          child.projectedStart = addBusinessDays(new Date(task.projectedFinish!), offset);

          const childLen = child.taskLenDays || 1;
          child.projectedFinish = addBusinessDays(new Date(child.projectedStart), childLen);

          cascadeFrom(childId);
        }
      }

      if (anchorTaskId) {
        const anchor = taskMap.get(anchorTaskId);
        if (anchor && !anchor.projectedStart) {
          anchor.projectedStart = new Date();
        }
        cascadeFrom(anchorTaskId);
      } else {
        const roots = allTasks.filter(t => !t.prereqTaskId && t.projectedStart && !t.naFlag && !t.completed);
        if (roots.length > 0) {
          for (const root of roots) {
            cascadeFrom(root.id);
          }
        } else {
          const firstRoot = allTasks.find(t => !t.prereqTaskId && !t.naFlag && !t.completed);
          if (firstRoot) {
            const task = taskMap.get(firstRoot.id);
            if (task) {
              task.projectedStart = new Date();
              cascadeFrom(firstRoot.id);
            }
          }
          const remainingRoots = allTasks.filter(t => !t.prereqTaskId && !t.naFlag && !t.completed && t.id !== firstRoot?.id);
          for (const root of remainingRoots) {
            const task = taskMap.get(root.id);
            if (task && task.projectedStart) {
              cascadeFrom(root.id);
            }
          }
        }
      }

      let updatedCount = 0;
      for (const [taskId, task] of taskMap) {
        const original = allTasks.find(t => t.id === taskId);
        if (!original) continue;

        const origStart = original.projectedStart?.getTime();
        const origFinish = original.projectedFinish?.getTime();
        const newStart = task.projectedStart ? new Date(task.projectedStart).getTime() : null;
        const newFinish = task.projectedFinish ? new Date(task.projectedFinish).getTime() : null;

        if (origStart !== newStart || origFinish !== newFinish) {
          await db.update(scheduleTasks)
            .set({
              projectedStart: task.projectedStart ? new Date(task.projectedStart) : null,
              projectedFinish: task.projectedFinish ? new Date(task.projectedFinish) : null,
              updatedAt: new Date(),
            })
            .where(and(eq(scheduleTasks.id, taskId), eq(scheduleTasks.tenantId, tenantId)));
          updatedCount++;
        }
      }

      res.json({ message: `Auto-scheduled ${updatedCount} tasks`, updatedCount });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/api/schedule/po-pdf/:poNumber", async (req: Request, res: Response) => {
    try {
      const { poNumber } = req.params;
      const tenantId = req.query.tenantId as string;
      if (!tenantId) return res.status(400).json({ error: "tenantId required" });

      const allTasks = await db.select().from(scheduleTasks)
        .where(eq(scheduleTasks.tenantId, tenantId))
        .orderBy(asc(scheduleTasks.taskNumber));

      const decrypted = decryptRecords("scheduleTasks", allTasks) as any[];
      const matchingTasks = decrypted.filter((t: any) => t.poNumber === poNumber);

      const tenantProjects = await db.select().from(projects).where(eq(projects.tenantId, tenantId));
      const decryptedProjects = decryptRecords("projects", tenantProjects) as any[];
      const projMap = Object.fromEntries(decryptedProjects.map((p: any) => [p.id, p.name]));

      const doc = new PDFDocument({ size: "LETTER", margin: 50 });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${poNumber}.pdf"`);
      doc.pipe(res);

      doc.fontSize(18).text("PURCHASE ORDER", { align: "center" });
      doc.moveDown(0.3);
      doc.fontSize(12).text(poNumber, { align: "center" });
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
      doc.moveDown(0.5);

      const today = new Date();
      doc.fontSize(9).text(`Date: ${today.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, { align: "right" });
      doc.moveDown(0.5);

      doc.fontSize(10).fillColor("#333");
      doc.text("PO Number:", { continued: true }).text(`  ${poNumber}`);
      doc.text("Tasks on this PO:", { continued: true }).text(`  ${matchingTasks.length}`);
      doc.moveDown(0.8);

      if (matchingTasks.length > 0) {
        const vendor = matchingTasks[0].supplierTrade;
        if (vendor) {
          doc.fontSize(10).text("Vendor / Trade:", { continued: true }).text(`  ${vendor}`);
          doc.moveDown(0.4);
        }
      }

      doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
      doc.moveDown(0.4);

      const colX = { num: 50, task: 85, project: 300, stage: 420, status: 490 };
      doc.fontSize(8).fillColor("#666");
      doc.text("#", colX.num, doc.y, { width: 30 });
      const headerY = doc.y - doc.currentLineHeight();
      doc.text("Task Name", colX.task, headerY, { width: 210 });
      doc.text("Project", colX.project, headerY, { width: 115 });
      doc.text("Stage", colX.stage, headerY, { width: 65 });
      doc.text("Status", colX.status, headerY, { width: 70 });
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor("#ccc").stroke();
      doc.moveDown(0.3);

      doc.fillColor("#000").strokeColor("#000");
      for (const task of matchingTasks) {
        const y = doc.y;
        if (y > 700) {
          doc.addPage();
        }
        const rowY = doc.y;
        doc.fontSize(8);
        doc.text(String(task.taskNumber || ""), colX.num, rowY, { width: 30 });
        doc.text(task.taskName || "—", colX.task, rowY, { width: 210 });
        doc.text(projMap[task.projectId] || "—", colX.project, rowY, { width: 115 });
        doc.text(task.stage || "—", colX.stage, rowY, { width: 65 });
        const status = task.completed ? "Completed" : task.ordered ? "Ordered" : "Pending";
        doc.text(status, colX.status, rowY, { width: 70 });
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor("#eee").stroke();
        doc.strokeColor("#000");
        doc.moveDown(0.3);
      }

      if (matchingTasks.length === 0) {
        doc.fontSize(10).fillColor("#999").text("No tasks found for this purchase order.", { align: "center" });
      }

      doc.moveDown(2);
      doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor("#000").stroke();
      doc.moveDown(0.5);
      doc.fontSize(7).fillColor("#999").text("Generated by The Maestro ERP - Construction Management System", { align: "center" });
      doc.text(`Document generated: ${today.toISOString()}`, { align: "center" });

      doc.end();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
