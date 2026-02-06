import { db } from "../../server/db";
import { tenants, tenantUsers, projects, wbsMasterCodes } from "../../shared/schema";
import { randomUUID } from "crypto";

async function seed() {
  console.log("Seeding database with test data...");

  const tenantId = randomUUID();
  await db.insert(tenants).values({
    id: tenantId,
    subdomain: "demo",
    companyName: "Demo Construction Corp",
    contactEmail: "admin@demo.construction",
    config: {
      branding: {
        primaryColor: "174 62% 47%",
        secondaryColor: "174 40% 35%",
        sidebarColor: "174 80% 10%",
        fontStyle: "elegant",
        logoUrl: null,
        faviconUrl: null,
      },
      modules: {
        hrSync: false,
        advancedWbs: true,
        documentTemplating: false,
      },
      wbsDimensions: [
        { key: "phase", label: "Project Phase", required: true },
        { key: "trade", label: "Trade", required: true },
        { key: "location", label: "Unit/Location", required: false },
      ],
    },
  });

  const userId = randomUUID();
  await db.insert(tenantUsers).values({
    id: userId,
    tenantId,
    email: "admin@demo.construction",
    role: "admin",
    profile: {
      firstName: "Admin",
      lastName: "User",
      jobTitle: "System Administrator",
      department: "IT",
      avatarUrl: null,
    },
  });

  const projectId = randomUUID();
  await db.insert(projects).values({
    id: projectId,
    tenantId,
    name: "Riverside Estates Phase 1",
    description: "48-unit residential development with underground parking",
    status: "in_progress",
    budget: "12500000.00",
    managerId: userId,
  });

  const dimensionSeeds = [
    { dimensionType: "phase", code: "PRE", name: "Pre-Construction" },
    { dimensionType: "phase", code: "CON", name: "Construction" },
    { dimensionType: "phase", code: "CLO", name: "Close-Out" },
    { dimensionType: "trade", code: "ELEC", name: "Electrical" },
    { dimensionType: "trade", code: "PLMB", name: "Plumbing" },
    { dimensionType: "trade", code: "HVAC", name: "HVAC" },
    { dimensionType: "trade", code: "CONC", name: "Concrete" },
    { dimensionType: "trade", code: "STRU", name: "Structural Steel" },
    { dimensionType: "location", code: "SITE", name: "Site Work" },
    { dimensionType: "location", code: "BLDA", name: "Building A" },
    { dimensionType: "location", code: "BLDB", name: "Building B" },
    { dimensionType: "cost_code", code: "MAT", name: "Materials" },
    { dimensionType: "cost_code", code: "LAB", name: "Labour" },
    { dimensionType: "cost_code", code: "SUB", name: "Subcontractors" },
    { dimensionType: "responsibility", code: "PM", name: "Project Manager" },
    { dimensionType: "responsibility", code: "SUPER", name: "Superintendent" },
    { dimensionType: "responsibility", code: "ESTIM", name: "Estimator" },
  ];

  for (const seed of dimensionSeeds) {
    await db.insert(wbsMasterCodes).values({
      id: randomUUID(),
      tenantId,
      ...seed,
      sortOrder: 0,
      isActive: true,
    });
  }

  console.log(`Tenant: ${tenantId}`);
  console.log(`User: ${userId}`);
  console.log(`Project: ${projectId}`);
  console.log(`WBS Codes: ${dimensionSeeds.length} seeded`);
  console.log("Seed complete.");
}

seed().catch(console.error);
