import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { getDefaultTenantId } from "./tenants";

interface WbsTag {
  dimensionType: string;
  wbsCodeId: string | null;
  codeName: string;
  codeValue: string;
  confidence: number;
}

interface WbsCodeEntry {
  id: string;
  dimensionType: string;
  code: string;
  name: string;
}

const EMAIL_WBS_KEYWORD_MAP: Record<string, Record<string, string[]>> = {
  phase: {
    "pre-construction": ["permit", "design", "architectural", "drawing", "review", "bid", "proposal", "planning", "zoning"],
    "construction": ["progress", "site", "inspection", "safety", "material", "delivery", "schedule", "subcontractor", "change order", "install"],
    "close-out": ["completion", "warranty", "punch list", "final", "handover", "closeout", "commissioning"],
  },
  trade: {
    "electrical": ["electrical", "wiring", "panel", "circuit", "power", "lighting", "conduit"],
    "plumbing": ["plumbing", "pipe", "drain", "water", "fixture", "sewer"],
    "hvac": ["hvac", "heating", "cooling", "ventilation", "duct", "mechanical", "air conditioning"],
    "concrete": ["concrete", "foundation", "slab", "pour", "formwork", "rebar"],
    "structural": ["structural", "steel", "beam", "column", "frame", "structural steel"],
    "general": ["general", "carpentry", "framing", "drywall", "finish"],
  },
  location: {
    "site": ["site", "exterior", "parking", "landscape", "grading", "excavation"],
    "interior": ["interior", "indoor", "inside", "room"],
    "building": ["building", "structure", "floor", "roof"],
  },
  system: {
    "mechanical": ["mechanical", "hvac", "pump", "boiler", "chiller"],
    "electrical": ["electrical", "power", "lighting", "generator", "transformer"],
    "fire protection": ["fire", "sprinkler", "alarm", "safety", "compliance", "fire protection"],
    "plumbing": ["plumbing", "sanitary", "domestic water"],
  },
  cost_code: {
    "labor": ["labor", "crew", "worker", "payroll", "manpower"],
    "materials": ["material", "supply", "delivery", "purchase order", "procurement"],
    "equipment": ["equipment", "rental", "machinery", "crane", "scaffold"],
    "subcontract": ["subcontractor", "sub", "bid", "contract", "vendor"],
    "overhead": ["insurance", "permit", "bond", "overhead", "admin", "office"],
  },
  responsibility: {
    "project manager": ["project manager", "timeline", "schedule", "progress report", "coordination"],
    "superintendent": ["superintendent", "site inspection", "safety", "foreman", "field"],
    "architect": ["architect", "drawing", "design", "revision", "specification"],
    "owner": ["client", "owner", "meeting notes", "approval", "customer"],
    "accounting": ["invoice", "payment", "accounting", "finance", "purchase order", "expense"],
  },
  material: {
    "concrete": ["concrete", "cement", "aggregate", "rebar"],
    "steel": ["steel", "metal", "structural steel", "rebar"],
    "wood": ["wood", "lumber", "timber", "framing"],
    "glass": ["glass", "glazing", "window"],
  },
  work_package: {
    "foundations": ["foundation", "excavation", "footing", "slab"],
    "superstructure": ["structural", "frame", "column", "beam", "roof"],
    "building envelope": ["envelope", "exterior", "cladding", "insulation", "roofing", "waterproof"],
    "interiors": ["interior", "drywall", "paint", "flooring", "ceiling", "finish"],
  },
};

function generateWbsTags(subject: string, preview: string, category: string, wbsCodes: WbsCodeEntry[]): WbsTag[] {
  const tags: WbsTag[] = [];
  const searchText = `${subject} ${preview} ${category}`.toLowerCase();

  for (const [dimType, keywords] of Object.entries(EMAIL_WBS_KEYWORD_MAP)) {
    let bestMatch: { label: string; score: number } | null = null;

    for (const [label, terms] of Object.entries(keywords)) {
      let matchScore = 0;
      for (const term of terms) {
        if (searchText.includes(term)) {
          matchScore += term.split(" ").length;
        }
      }
      if (matchScore > 0 && (!bestMatch || matchScore > bestMatch.score)) {
        bestMatch = { label, score: matchScore };
      }
    }

    if (bestMatch) {
      const matchingCode = wbsCodes.find(c =>
        c.dimensionType === dimType &&
        c.name.toLowerCase().includes(bestMatch!.label)
      );
      const confidence = Math.min(0.95, 0.5 + bestMatch.score * 0.1);

      tags.push({
        dimensionType: dimType,
        wbsCodeId: matchingCode?.id || null,
        codeName: matchingCode?.name || bestMatch.label.charAt(0).toUpperCase() + bestMatch.label.slice(1),
        codeValue: matchingCode?.code || dimType.substring(0, 3).toUpperCase(),
        confidence: parseFloat(confidence.toFixed(2)),
      });
    }
  }

  return tags;
}

function generateSmartInboxEmails(projects: string[], vendors: string[], customers: string[], filter: string, search: string, wbsCodes: WbsCodeEntry[] = []) {
  const subjects = [
    { subject: "Updated Project Timeline", category: "project", importance: "high" },
    { subject: "Invoice #INV-2026-0142 Submitted", category: "finance", importance: "normal" },
    { subject: "Building Permit Approved", category: "project", importance: "high" },
    { subject: "Material Delivery Schedule Change", category: "vendor", importance: "high" },
    { subject: "Weekly Progress Report", category: "project", importance: "normal" },
    { subject: "Change Order Request #CO-089", category: "project", importance: "high" },
    { subject: "Insurance Certificate Renewal", category: "vendor", importance: "normal" },
    { subject: "Site Inspection Results", category: "project", importance: "high" },
    { subject: "Subcontractor Bid Submission", category: "vendor", importance: "normal" },
    { subject: "Client Meeting Notes", category: "customer", importance: "normal" },
    { subject: "Safety Compliance Update", category: "project", importance: "high" },
    { subject: "Purchase Order Confirmation", category: "finance", importance: "normal" },
    { subject: "Architectural Drawing Review", category: "project", importance: "normal" },
    { subject: "Payment Processing Notification", category: "finance", importance: "normal" },
    { subject: "Schedule Conflict Alert", category: "project", importance: "high" },
  ];

  const senders = [
    ...(vendors.length > 0 ? vendors.slice(0, 3).map(v => ({ name: `${v}`, email: `info@${(v || "vendor").toLowerCase().replace(/[^a-z0-9]/g, '').replace(/^$/, 'vendor')}.com` })) : []),
    ...(customers.length > 0 ? customers.slice(0, 2).map(c => ({ name: `${c}`, email: `contact@${(c || "customer").toLowerCase().replace(/[^a-z0-9]/g, '').replace(/^$/, 'customer')}.com` })) : []),
    { name: "City Building Department", email: "permits@citybuilding.gov" },
    { name: "Safety Inspector", email: "inspector@safetyboard.org" },
    { name: "Accounting Team", email: "ap@internal.com" },
  ];

  const emails = subjects.map((s, i) => {
    const sender = senders[i % senders.length];
    const project = projects.length > 0 ? projects[i % projects.length] : null;
    const daysAgo = Math.floor(i * 0.7);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(9 + (i % 8), (i * 17) % 60);

    const preview = `This email relates to ${project || "general operations"}. Please review the attached documentation and respond at your earliest convenience.`;
    const wbsTags = generateWbsTags(s.subject, preview, s.category, wbsCodes);

    return {
      id: `email-${i + 1}`,
      subject: s.subject,
      from: sender,
      receivedAt: date.toISOString(),
      category: s.category,
      importance: s.importance,
      isRead: i > 3,
      preview,
      relatedProject: project,
      hasAttachment: i % 3 === 0,
      labels: [s.category, ...(s.importance === "high" ? ["urgent"] : [])],
      wbsTags,
    };
  });

  let filtered = emails;
  if (filter !== "all") {
    filtered = filtered.filter(e => e.category === filter);
  }
  if (search) {
    const lower = search.toLowerCase();
    filtered = filtered.filter(e =>
      e.subject.toLowerCase().includes(lower) ||
      e.from.name.toLowerCase().includes(lower) ||
      e.preview.toLowerCase().includes(lower)
    );
  }

  return filtered;
}

export function createIntelligenceRouter(): Router {
  const router = Router();

  router.post("/api/ai/report", async (req: Request, res: Response) => {
    try {
      const { generateReport } = await import("../services/ai-report-service");
      const { aiReportQuerySchema } = await import("../../shared/types/ai-report");
      
      const parsed = aiReportQuerySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid query", details: parsed.error.issues });
      }

      const tenantId = parsed.data.tenantId || await getDefaultTenantId();
      const report = await generateReport({ ...parsed.data, tenantId });
      res.json(report);
    } catch (error) {
      console.error("Error generating AI report:", error);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  router.get("/api/ai/quick-prompts", async (_req: Request, res: Response) => {
    try {
      const { getQuickPrompts } = await import("../services/ai-report-service");
      res.json(getQuickPrompts());
    } catch (error) {
      console.error("Error fetching quick prompts:", error);
      res.status(500).json({ error: "Failed to fetch quick prompts" });
    }
  });

  router.get("/api/smart-inbox", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenantId as string) || await getDefaultTenantId();
      const filter = (req.query.filter as string) || "all";
      const search = (req.query.search as string) || "";
      
      const projects = await storage.getProjects(tenantId);
      const vendors = await storage.getVendors(tenantId);
      const customers = await storage.getCustomers(tenantId);
      const wbsCodes = await storage.getWbsMasterCodes(tenantId);

      const projectNames = projects.map(p => p.name);
      const vendorNames = vendors.map(v => v.company);
      const customerNames = customers.map(c => `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unknown");

      const mockEmails = generateSmartInboxEmails(projectNames, vendorNames, customerNames, filter, search, wbsCodes);
      res.json({
        emails: mockEmails,
        filters: {
          projects: projectNames,
          vendors: vendorNames,
          customers: customerNames.filter(Boolean),
        },
        totalCount: mockEmails.length,
        unreadCount: mockEmails.filter((e: any) => !e.isRead).length,
      });
    } catch (error) {
      console.error("Error fetching smart inbox:", error);
      res.status(500).json({ error: "Failed to fetch smart inbox" });
    }
  });

  return router;
}
