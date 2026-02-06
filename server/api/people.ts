import { Router, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { type Customer, type VendorContact, type TenantUser } from "@shared/schema";
import { getDefaultTenantId } from "./tenants";

const teamMemberCreateSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "project_manager", "accountant", "viewer"]).optional(),
  profile: z.object({
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    jobTitle: z.string().nullable().optional(),
    department: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
  }).optional(),
});

const customerCreateSchema = z.object({
  tenantId: z.string(),
  jobNum: z.number().int(),
  address: z.string().optional(),
  city: z.string().optional(),
  stateProvince: z.string().optional(),
  zipPostalCode: z.string().optional(),
  countryRegion: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  webPage: z.string().optional(),
  homePhone: z.string().optional(),
});

const customerFieldUpdateSchema = z.object({
  tenantId: z.string(),
  jobNum: z.number().int(),
  field: z.string(),
  value: z.any(),
});

const quoteCreateSchema = z.object({
  tenantId: z.string(),
  jobNum: z.number().int(),
  qNum: z.string().optional(),
  customer: z.string().optional(),
  dateOfQuote: z.string().optional(),
  division: z.string().optional(),
  model: z.string().optional(),
  projectAddress: z.string().optional(),
  lot: z.string().optional(),
  block: z.string().optional(),
  plan: z.string().optional(),
  main: z.union([z.string(), z.number()]).optional(),
  upper: z.union([z.string(), z.number()]).optional(),
  low: z.union([z.string(), z.number()]).optional(),
  gar: z.union([z.string(), z.number()]).optional(),
  dp: z.union([z.string(), z.number()]).optional(),
  bp: z.union([z.string(), z.number()]).optional(),
  dgbp: z.union([z.string(), z.number()]).optional(),
});

const quoteFieldUpdateSchema = z.object({
  tenantId: z.string(),
  jobNum: z.number().int(),
  field: z.string(),
  value: z.any(),
});

const vendorCreateSchema = z.object({
  tenantId: z.string(),
  company: z.string().min(1),
  vendorId: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  stateProvince: z.string().optional(),
  zipPostalCode: z.string().optional(),
  countryRegion: z.string().optional(),
  apTerms: z.string().optional(),
  arTerms: z.string().optional(),
  gstNum: z.string().optional(),
  wcbNum: z.string().optional(),
  insuranceCert: z.string().optional(),
  matVendor: z.boolean().optional(),
  subtrade: z.boolean().optional(),
  includeInPayroll: z.boolean().optional(),
  rateReliability: z.number().min(1).max(5).nullable().optional(),
  rateQuality: z.number().min(1).max(5).nullable().optional(),
  rateSpeed: z.number().min(1).max(5).nullable().optional(),
  ratePricing: z.number().min(1).max(5).nullable().optional(),
  rateCongeniality: z.number().min(1).max(5).nullable().optional(),
});

const vendorUpdateSchema = vendorCreateSchema.partial().omit({ tenantId: true });

const vendorFieldUpdateSchema = z.object({
  field: z.string(),
  value: z.any(),
});

const vendorContactCreateSchema = z.object({
  tenantId: z.string(),
  vendorId: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  jobTitle: z.string().optional(),
  businessPhone: z.string().optional(),
  mobilePhone: z.string().optional(),
  emailAddress: z.string().email().optional().or(z.literal('')),
  isPrimary: z.boolean().optional(),
});

const vendorContactUpdateSchema = vendorContactCreateSchema.partial().omit({ tenantId: true, vendorId: true });

function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: result.error.flatten().fieldErrors 
      });
    }
    req.body = result.data;
    next();
  };
}

export function createPeopleRouter(): Router {
  const router = Router();

  router.get("/api/team", async (req, res) => {
    try {
      const tenantId = await getDefaultTenantId();
      const users = await storage.getTenantUsers(tenantId);
      res.json(users);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  router.get("/api/team/:id", async (req, res) => {
    try {
      const user = await storage.getTenantUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  router.post("/api/team", validateBody(teamMemberCreateSchema), async (req, res) => {
    try {
      const tenantId = await getDefaultTenantId();
      const user = await storage.createTenantUser({
        ...req.body,
        tenantId,
      });
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  router.get("/api/customers", async (req, res) => {
    try {
      const tenantId = (req.query.tenantId as string) || await getDefaultTenantId();
      const customers = await storage.getCustomers(tenantId);
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  router.get("/api/customers/job/:jobNum", async (req, res) => {
    try {
      const tenantId = (req.query.tenantId as string) || await getDefaultTenantId();
      const jobNum = parseInt(req.params.jobNum, 10);
      if (isNaN(jobNum)) {
        return res.status(400).json({ error: "Invalid job number" });
      }
      const customer = await storage.getCustomerByJobNum(tenantId, jobNum);
      const quote = await storage.getQuoteByJobNum(tenantId, jobNum);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json({ customer, quote });
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  router.post("/api/customers", validateBody(customerCreateSchema), async (req, res) => {
    try {
      const customer = await storage.createCustomer(req.body);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ error: "Failed to create customer" });
    }
  });

  router.patch("/api/customers/field", validateBody(customerFieldUpdateSchema), async (req, res) => {
    try {
      const { tenantId, jobNum, field, value } = req.body;
      const updated = await storage.updateCustomerField(tenantId, jobNum, field, value);
      if (!updated) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating customer field:", error);
      res.status(500).json({ error: "Failed to update customer field" });
    }
  });

  router.patch("/api/customers/:id", async (req, res) => {
    try {
      const updated = await storage.updateCustomer(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  router.delete("/api/customers/:id", async (req, res) => {
    try {
      await storage.deleteCustomer(req.params.id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  router.post("/api/customers/seed", async (req, res) => {
    try {
      const tenantId = (req.query.tenantId as string) || await getDefaultTenantId();
      
      const sampleCustomers = [
        { tenantId, jobNum: 1001, firstName: "John", lastName: "Smith", address: "123 Main St", city: "Calgary", stateProvince: "AB", zipPostalCode: "T2P 1A1", countryRegion: "Canada", homePhone: "(403) 555-1234" },
        { tenantId, jobNum: 1002, firstName: "Sarah", lastName: "Johnson", address: "456 Oak Ave", city: "Edmonton", stateProvince: "AB", zipPostalCode: "T5H 2B2", countryRegion: "Canada", homePhone: "(780) 555-5678" },
        { tenantId, jobNum: 1003, firstName: "Michael", lastName: "Williams", address: "789 Pine Rd", city: "Vancouver", stateProvince: "BC", zipPostalCode: "V6B 3C3", countryRegion: "Canada", homePhone: "(604) 555-9012" },
      ];
      
      const sampleQuotes = [
        { tenantId, jobNum: 1001, qNum: "Q-2026-001", customer: "John Smith", division: "Residential", model: "The Parkview", projectAddress: "Lot 15, Block 3, Parkland", lot: "15", block: "3", plan: "Plan A", main: "1200", upper: "800", low: "0", gar: "400" },
        { tenantId, jobNum: 1002, qNum: "Q-2026-002", customer: "Sarah Johnson", division: "Residential", model: "The Sunrise", projectAddress: "Lot 22, Block 5, Sunrise Valley", lot: "22", block: "5", plan: "Plan B", main: "1500", upper: "1000", low: "500", gar: "450" },
        { tenantId, jobNum: 1003, qNum: "Q-2026-003", customer: "Michael Williams", division: "Commercial", model: "Business Center", projectAddress: "123 Commerce Blvd", lot: "1", block: "A", plan: "Commercial", main: "5000", upper: "0", low: "0", gar: "0" },
      ];
      
      for (const c of sampleCustomers) {
        const existing = await storage.getCustomerByJobNum(tenantId, c.jobNum);
        if (!existing) {
          await storage.createCustomer(c);
        }
      }
      
      for (const q of sampleQuotes) {
        const existing = await storage.getQuoteByJobNum(tenantId, q.jobNum);
        if (!existing) {
          await storage.createQuote(q);
        }
      }
      
      res.json({ success: true, message: "Sample customers and quotes seeded" });
    } catch (error) {
      console.error("Error seeding customers:", error);
      res.status(500).json({ error: "Failed to seed customers" });
    }
  });

  router.get("/api/quotes", async (req, res) => {
    try {
      const tenantId = (req.query.tenantId as string) || await getDefaultTenantId();
      const quotes = await storage.getQuotes(tenantId);
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });

  router.get("/api/quotes/job/:jobNum", async (req, res) => {
    try {
      const tenantId = (req.query.tenantId as string) || await getDefaultTenantId();
      const jobNum = parseInt(req.params.jobNum, 10);
      if (isNaN(jobNum)) {
        return res.status(400).json({ error: "Invalid job number" });
      }
      const quote = await storage.getQuoteByJobNum(tenantId, jobNum);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      res.json(quote);
    } catch (error) {
      console.error("Error fetching quote:", error);
      res.status(500).json({ error: "Failed to fetch quote" });
    }
  });

  router.post("/api/quotes", validateBody(quoteCreateSchema), async (req, res) => {
    try {
      const quoteData = {
        ...req.body,
        dateOfQuote: req.body.dateOfQuote ? new Date(req.body.dateOfQuote) : undefined,
      };
      const quote = await storage.createQuote(quoteData);
      res.status(201).json(quote);
    } catch (error) {
      console.error("Error creating quote:", error);
      res.status(500).json({ error: "Failed to create quote" });
    }
  });

  router.patch("/api/quotes/field", validateBody(quoteFieldUpdateSchema), async (req, res) => {
    try {
      const { tenantId, jobNum, field, value } = req.body;
      const updated = await storage.updateQuoteField(tenantId, jobNum, field, value);
      if (!updated) {
        return res.status(404).json({ error: "Quote not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating quote field:", error);
      res.status(500).json({ error: "Failed to update quote field" });
    }
  });

  router.patch("/api/quotes/:id", async (req, res) => {
    try {
      const updated = await storage.updateQuote(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Quote not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating quote:", error);
      res.status(500).json({ error: "Failed to update quote" });
    }
  });

  router.delete("/api/quotes/:id", async (req, res) => {
    try {
      await storage.deleteQuote(req.params.id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting quote:", error);
      res.status(500).json({ error: "Failed to delete quote" });
    }
  });

  router.get("/api/vendors", async (req, res) => {
    try {
      const tenantId = (req.query.tenantId as string) || await getDefaultTenantId();
      const vendorList = await storage.getVendors(tenantId);
      res.json(vendorList);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ error: "Failed to fetch vendors" });
    }
  });

  router.get("/api/vendors/:id", async (req, res) => {
    try {
      const vendor = await storage.getVendor(req.params.id);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      const contacts = await storage.getVendorContacts(req.params.id);
      const primaryContact = contacts.find(c => c.isPrimary) || null;
      res.json({ vendor, contacts, primaryContact });
    } catch (error) {
      console.error("Error fetching vendor:", error);
      res.status(500).json({ error: "Failed to fetch vendor" });
    }
  });

  router.post("/api/vendors", validateBody(vendorCreateSchema), async (req, res) => {
    try {
      const vendor = await storage.createVendor(req.body);
      res.status(201).json(vendor);
    } catch (error) {
      console.error("Error creating vendor:", error);
      res.status(500).json({ error: "Failed to create vendor" });
    }
  });

  router.patch("/api/vendors/:id", validateBody(vendorUpdateSchema), async (req, res) => {
    try {
      const vendor = await storage.updateVendor(req.params.id, req.body);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      console.error("Error updating vendor:", error);
      res.status(500).json({ error: "Failed to update vendor" });
    }
  });

  router.patch("/api/vendors/:id/field", validateBody(vendorFieldUpdateSchema), async (req, res) => {
    try {
      const { field, value } = req.body;
      const vendor = await storage.updateVendorField(req.params.id, field, value);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      console.error("Error updating vendor field:", error);
      res.status(500).json({ error: "Failed to update vendor field" });
    }
  });

  router.delete("/api/vendors/:id", async (req, res) => {
    try {
      await storage.deleteVendor(req.params.id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting vendor:", error);
      res.status(500).json({ error: "Failed to delete vendor" });
    }
  });

  router.post("/api/vendors/seed", async (req, res) => {
    try {
      const tenantId = (req.query.tenantId as string) || await getDefaultTenantId();
      
      const sampleVendors = [
        { tenantId, company: "ABC Supply Co.", vendorId: "V0001", address: "100 Industrial Blvd", city: "Calgary", stateProvince: "AB", zipPostalCode: "T2E 1K5", countryRegion: "Canada", matVendor: true, subtrade: false, apTerms: "Net 30", arTerms: "DOR - Due on Receipt" },
        { tenantId, company: "Elite Electrical Ltd.", vendorId: "V0002", address: "250 Trade Way", city: "Edmonton", stateProvince: "AB", zipPostalCode: "T5J 2L8", countryRegion: "Canada", matVendor: false, subtrade: true, apTerms: "Net 15", arTerms: "DOR - Due on Receipt", wcbNum: "WCB-12345", includeInPayroll: true },
        { tenantId, company: "Premium Plumbing Services", vendorId: "V0003", address: "75 Service Rd", city: "Red Deer", stateProvince: "AB", zipPostalCode: "T4N 3X2", countryRegion: "Canada", matVendor: false, subtrade: true, apTerms: "Net 30", arTerms: "Net 30", gstNum: "GST-98765" },
      ];
      
      for (const v of sampleVendors) {
        const existing = await storage.getVendorByCompany(tenantId, v.company);
        if (!existing) {
          const vendor = await storage.createVendor(v);
          const domain = v.company.toLowerCase().replace(/[^a-z0-9]/g, '');
          await storage.createVendorContact({
            tenantId,
            vendorId: vendor.id,
            firstName: "Primary",
            lastName: "Contact",
            jobTitle: "Account Manager",
            businessPhone: "(403) 555-0100",
            emailAddress: `contact@${domain}.com`,
            isPrimary: true,
          });
          await storage.createVendorContact({
            tenantId,
            vendorId: vendor.id,
            firstName: "Secondary",
            lastName: "Rep",
            jobTitle: "Sales Representative",
            businessPhone: "(403) 555-0200",
            mobilePhone: "(403) 555-0201",
            emailAddress: `sales@${domain}.com`,
            isPrimary: false,
          });
        }
      }
      
      res.json({ success: true, message: "Sample vendors seeded" });
    } catch (error) {
      console.error("Error seeding vendors:", error);
      res.status(500).json({ error: "Failed to seed vendors" });
    }
  });

  router.get("/api/vendors/:vendorId/contacts", async (req, res) => {
    try {
      const contacts = await storage.getVendorContacts(req.params.vendorId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching vendor contacts:", error);
      res.status(500).json({ error: "Failed to fetch vendor contacts" });
    }
  });

  router.post("/api/vendors/:vendorId/contacts", validateBody(vendorContactCreateSchema.omit({ vendorId: true })), async (req, res) => {
    try {
      const contact = await storage.createVendorContact({
        ...req.body,
        vendorId: req.params.vendorId,
      });
      res.status(201).json(contact);
    } catch (error) {
      console.error("Error creating vendor contact:", error);
      res.status(500).json({ error: "Failed to create vendor contact" });
    }
  });

  router.patch("/api/vendor-contacts/:id", validateBody(vendorContactUpdateSchema), async (req, res) => {
    try {
      const contact = await storage.updateVendorContact(req.params.id, req.body);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      console.error("Error updating vendor contact:", error);
      res.status(500).json({ error: "Failed to update vendor contact" });
    }
  });

  router.delete("/api/vendor-contacts/:id", async (req, res) => {
    try {
      await storage.deleteVendorContact(req.params.id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting vendor contact:", error);
      res.status(500).json({ error: "Failed to delete vendor contact" });
    }
  });

  router.get("/api/contacts/directory", async (req, res) => {
    try {
      const tenantId = (req.query.tenantId as string) || await getDefaultTenantId();
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const search = (req.query.search as string) || "";
      const sortBy = (req.query.sortBy as string) || "name";
      const sortDirection = (req.query.sortDirection as string) || "asc";
      const category = (req.query.category as string) || "all";
      
      const [customers, vendorContacts, tenantUsers] = await Promise.all([
        storage.getCustomers(tenantId),
        storage.getAllVendorContacts(tenantId),
        storage.getTenantUsers(tenantId),
      ]);
      
      const customerContacts = customers.map((c: Customer) => ({
        id: `customer-${c.id}`,
        category: "Customer" as const,
        sortId: c.jobNum,
        fullName: [c.firstName, c.lastName].filter(Boolean).join(" ") || `Customer ${c.jobNum}`,
        company: `Job #${c.jobNum}`,
        email: c.email1 || c.email2 || "",
        phone: c.mobilePhone || c.workPhone || c.homePhone || "",
        jobTitle: "",
        city: c.city || "",
        sourceId: c.id,
      }));
      
      const vendorContactsList = vendorContacts.map((vc: { contact: VendorContact; vendorName: string }) => ({
        id: `vendor-${vc.contact.id}`,
        category: "Vendor" as const,
        sortId: 0,
        fullName: [vc.contact.firstName, vc.contact.lastName].filter(Boolean).join(" ") || "Contact",
        company: vc.vendorName,
        email: vc.contact.emailAddress || "",
        phone: vc.contact.businessPhone || vc.contact.mobilePhone || "",
        jobTitle: vc.contact.jobTitle || "",
        city: "",
        sourceId: vc.contact.id,
      }));
      
      const employeeContacts = tenantUsers.map((tu: TenantUser) => {
        const profile = tu.profile as { firstName?: string; lastName?: string; jobTitle?: string } || {};
        return {
          id: `employee-${tu.id}`,
          category: "Employee" as const,
          sortId: 0,
          fullName: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || tu.email,
          company: "Internal",
          email: tu.email,
          phone: "",
          jobTitle: profile.jobTitle || tu.role,
          city: "",
          sourceId: tu.id,
        };
      });
      
      let allContacts = [...customerContacts, ...vendorContactsList, ...employeeContacts];
      
      if (category !== "all") {
        allContacts = allContacts.filter(c => c.category.toLowerCase() === category.toLowerCase());
      }
      
      if (search) {
        const searchLower = search.toLowerCase();
        allContacts = allContacts.filter(c => 
          c.fullName.toLowerCase().includes(searchLower) ||
          c.company.toLowerCase().includes(searchLower) ||
          c.email.toLowerCase().includes(searchLower) ||
          c.phone.includes(search)
        );
      }
      
      const dir = sortDirection === "desc" ? -1 : 1;
      allContacts.sort((a, b) => {
        let cmp = 0;
        switch (sortBy) {
          case "company":
            cmp = a.company.localeCompare(b.company);
            break;
          case "category":
            cmp = a.category.localeCompare(b.category);
            break;
          case "jobTitle":
            cmp = a.jobTitle.localeCompare(b.jobTitle);
            break;
          case "email":
            cmp = a.email.localeCompare(b.email);
            break;
          case "phone":
            cmp = a.phone.localeCompare(b.phone);
            break;
          default:
            cmp = a.fullName.localeCompare(b.fullName);
        }
        return cmp * dir;
      });
      
      const total = allContacts.length;
      const paginatedContacts = allContacts.slice(offset, offset + limit);
      
      res.json({
        contacts: paginatedContacts,
        total,
        limit,
        offset,
      });
    } catch (error) {
      console.error("Error fetching contacts directory:", error);
      res.status(500).json({ error: "Failed to fetch contacts directory" });
    }
  });

  return router;
}
