import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { getDefaultTenantId } from "./tenants";
import { z } from "zod";

export function createDocumentsRouter(): Router {
  const router = Router();

  // ===== USER GROUPS =====

  router.get("/api/user-groups", async (req, res) => {
    try {
      const tenantId = (req.query.tenantId as string) || (await getDefaultTenantId());
      const groups = await storage.getUserGroups(tenantId);
      res.json(groups);
    } catch (error) {
      console.error("Error fetching user groups:", error);
      res.status(500).json({ error: "Failed to fetch user groups" });
    }
  });

  // Get a single user group
  router.get("/api/user-groups/:id", async (req, res) => {
    try {
      const group = await storage.getUserGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ error: "User group not found" });
      }
      res.json(group);
    } catch (error) {
      console.error("Error fetching user group:", error);
      res.status(500).json({ error: "Failed to fetch user group" });
    }
  });

  // Create a user group
  router.post("/api/user-groups", async (req, res) => {
    try {
      const schema = z.object({
        tenantId: z.string().min(1),
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        isActive: z.boolean().optional(),
      });
      const data = schema.parse(req.body);
      const group = await storage.createUserGroup(data);
      res.status(201).json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating user group:", error);
      res.status(500).json({ error: "Failed to create user group" });
    }
  });

  // Update a user group
  router.patch("/api/user-groups/:id", async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        isActive: z.boolean().optional(),
      });
      const data = schema.parse(req.body);
      const group = await storage.updateUserGroup(req.params.id, data);
      if (!group) {
        return res.status(404).json({ error: "User group not found" });
      }
      res.json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating user group:", error);
      res.status(500).json({ error: "Failed to update user group" });
    }
  });

  // Delete a user group
  router.delete("/api/user-groups/:id", async (req, res) => {
    try {
      await storage.deleteUserGroup(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user group:", error);
      res.status(500).json({ error: "Failed to delete user group" });
    }
  });

  // ===== USER GROUP MEMBERS =====
  
  // Get members of a group
  router.get("/api/user-groups/:groupId/members", async (req, res) => {
    try {
      const members = await storage.getUserGroupMembers(req.params.groupId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching group members:", error);
      res.status(500).json({ error: "Failed to fetch group members" });
    }
  });

  // Add a user to a group
  router.post("/api/user-groups/:groupId/members", async (req, res) => {
    try {
      const schema = z.object({
        tenantId: z.string().min(1),
        userId: z.string().min(1),
      });
      const data = schema.parse(req.body);
      const member = await storage.addUserToGroup({
        tenantId: data.tenantId,
        groupId: req.params.groupId,
        userId: data.userId,
      });
      res.status(201).json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error adding user to group:", error);
      res.status(500).json({ error: "Failed to add user to group" });
    }
  });

  // Remove a user from a group
  router.delete("/api/user-groups/:groupId/members/:userId", async (req, res) => {
    try {
      await storage.removeUserFromGroup(req.params.groupId, req.params.userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing user from group:", error);
      res.status(500).json({ error: "Failed to remove user from group" });
    }
  });

  // ===== GROUP PERMISSIONS =====
  
  // Get permissions for a group
  router.get("/api/user-groups/:groupId/permissions", async (req, res) => {
    try {
      const permissions = await storage.getGroupPermissions(req.params.groupId);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching group permissions:", error);
      res.status(500).json({ error: "Failed to fetch group permissions" });
    }
  });

  // Set/update a permission for a group on a navigation item
  router.post("/api/user-groups/:groupId/permissions", async (req, res) => {
    try {
      const schema = z.object({
        tenantId: z.string().min(1),
        navigationItemId: z.string().min(1),
        canView: z.boolean().optional(),
        canCreate: z.boolean().optional(),
        canEdit: z.boolean().optional(),
        canDelete: z.boolean().optional(),
        inheritToChildren: z.boolean().optional(),
      });
      const data = schema.parse(req.body);
      const permission = await storage.setGroupPermission({
        tenantId: data.tenantId,
        groupId: req.params.groupId,
        navigationItemId: data.navigationItemId,
        canView: data.canView,
        canCreate: data.canCreate,
        canEdit: data.canEdit,
        canDelete: data.canDelete,
        inheritToChildren: data.inheritToChildren,
      });
      res.status(201).json(permission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error setting group permission:", error);
      res.status(500).json({ error: "Failed to set group permission" });
    }
  });

  // Update a specific permission
  router.patch("/api/permissions/:id", async (req, res) => {
    try {
      const schema = z.object({
        canView: z.boolean().optional(),
        canCreate: z.boolean().optional(),
        canEdit: z.boolean().optional(),
        canDelete: z.boolean().optional(),
        inheritToChildren: z.boolean().optional(),
      });
      const data = schema.parse(req.body);
      const permission = await storage.updateGroupPermission(req.params.id, data);
      if (!permission) {
        return res.status(404).json({ error: "Permission not found" });
      }
      res.json(permission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating permission:", error);
      res.status(500).json({ error: "Failed to update permission" });
    }
  });

  // Delete a permission
  router.delete("/api/permissions/:id", async (req, res) => {
    try {
      await storage.deleteGroupPermission(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting permission:", error);
      res.status(500).json({ error: "Failed to delete permission" });
    }
  });

  // ==================== DOCUMENT ENDPOINTS WITH KONG INTEGRATION ====================

  // Get all documents for a tenant
  router.get("/api/documents", async (req, res) => {
    try {
      const tenantId = (req.query.tenantId as string) || await getDefaultTenantId();
      const documents = await storage.getDocuments(tenantId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  router.get("/api/documents/security/stats", async (req, res) => {
    try {
      const tenantId = req.query.tenantId as string;
      if (!tenantId) {
        return res.status(400).json({ error: "tenantId is required" });
      }
      const { documentService } = await import("../services/document-service");
      const stats = await documentService.getTenantDocumentStats(tenantId);

      const docs = await storage.getDocuments(tenantId);
      let plenumnetCount = 0;
      let kongCount = 0;
      const modeBreakdown: Record<string, number> = {};
      for (const doc of docs) {
        if (doc.isEncrypted && doc.encryptedContent) {
          try {
            const parsed = JSON.parse(doc.encryptedContent);
            if (parsed.engine === "plenumnet") plenumnetCount++;
            else kongCount++;
          } catch {
            kongCount++;
          }
        }
        if (doc.encryptionMode) {
          modeBreakdown[doc.encryptionMode] = (modeBreakdown[doc.encryptionMode] || 0) + 1;
        }
      }

      res.json({
        ...stats,
        securityEngine: {
          plenumnet: plenumnetCount,
          kong: kongCount,
          total: plenumnetCount + kongCount,
        },
        modeBreakdown,
      });
    } catch (error) {
      console.error("Error fetching document security stats:", error);
      res.status(500).json({ error: "Failed to fetch security stats" });
    }
  });

  // Get a single document
  router.get("/api/documents/:id", async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(doc);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  // Get documents by project
  router.get("/api/projects/:projectId/documents", async (req, res) => {
    try {
      const documents = await storage.getDocumentsByProject(req.params.projectId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching project documents:", error);
      res.status(500).json({ error: "Failed to fetch project documents" });
    }
  });

  // Create a new document (with optional encryption via Kong)
  router.post("/api/documents", async (req, res) => {
    try {
      const { documentService } = await import("../services/document-service");

      const schema = z.object({
        tenantId: z.string().min(1),
        projectId: z.string().optional(),
        name: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
        category: z.string().max(50).optional(),
        content: z.string().optional(),
        encrypt: z.boolean().optional(),
        encryptionMode: z.enum(["high_security", "balanced", "performance", "adaptive"]).optional(),
      });

      const data = schema.parse(req.body);

      const result = await documentService.upload({
        tenantId: data.tenantId,
        projectId: data.projectId,
        name: data.name,
        description: data.description,
        category: data.category,
        content: data.content,
        encrypt: data.encrypt,
        encryptionMode: data.encryptionMode,
      });

      const response: any = { ...result.document };
      if (result.encryptionFailed) {
        response.encryptionFailed = true;
        response.message = "Encryption unavailable, document stored unencrypted";
      }

      res.status(201).json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating document:", error);
      res.status(500).json({ error: "Failed to create document" });
    }
  });

  router.post("/api/documents/tern", async (req, res) => {
    try {
      const { documentService } = await import("../services/document-service");

      const schema = z.object({
        tenantId: z.string().min(1),
        projectId: z.string().optional(),
        name: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
        category: z.string().max(50).optional(),
        content: z.string().optional(),
        fileData: z.string().optional(),
        mimeType: z.string().optional(),
        encrypt: z.boolean().optional(),
        encryptionMode: z.enum(["high_security", "balanced", "performance", "adaptive"]).optional(),
      });

      const data = schema.parse(req.body);

      const result = await documentService.uploadTern({
        ...data,
        useTernFormat: true,
      });

      res.status(201).json({
        ...result.document,
        ternFormat: true,
        savings: result.savingsPercent,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating TERN document:", error);
      res.status(500).json({ error: "Failed to create TERN document" });
    }
  });

  router.get("/api/documents/:id/tern", async (req, res) => {
    try {
      const { documentService } = await import("../services/document-service");

      const result = await documentService.downloadTern(req.params.id);
      if (!result) {
        return res.status(404).json({ error: "TERN document not found or not in TERN format" });
      }

      res.json({
        header: result.header,
        data: result.data.toString("base64"),
        mimeType: result.mimeType,
        size: result.data.length,
      });
    } catch (error: any) {
      console.error("Error downloading TERN document:", error);
      res.status(500).json({ error: error.message || "Failed to download TERN document" });
    }
  });

  // Decrypt a document (fetch decrypted content)
  router.get("/api/documents/:id/decrypt", async (req, res) => {
    try {
      const { documentService } = await import("../services/document-service");

      const result = await documentService.decrypt(req.params.id);
      res.json(result);
    } catch (error: any) {
      if (error.message === "Document not found") {
        return res.status(404).json({ error: "Document not found" });
      }
      console.error("Error decrypting document:", error);
      res.status(500).json({ error: "Failed to decrypt document" });
    }
  });

  // Update a document
  router.patch("/api/documents/:id", async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(1000).optional(),
        category: z.string().max(50).optional(),
        status: z.enum(["draft", "pending_review", "approved", "archived", "encrypted"]).optional(),
        projectId: z.string().nullable().optional(),
      });
      
      const data = schema.parse(req.body);
      const doc = await storage.updateDocument(req.params.id, data);
      
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      res.json(doc);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating document:", error);
      res.status(500).json({ error: "Failed to update document" });
    }
  });

  // Delete a document
  router.delete("/api/documents/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteDocument(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  router.post("/api/documents/bulk-encrypt", async (req, res) => {
    try {
      const { documentService } = await import("../services/document-service");

      const schema = z.object({
        mode: z.enum(["high_security", "balanced", "performance", "adaptive"]).optional(),
      });

      const data = schema.parse(req.body);
      const tenantId = await getDefaultTenantId();
      if (!tenantId) {
        return res.status(400).json({ error: "No tenant context" });
      }
      const result = await documentService.bulkEncrypt(tenantId, data.mode || "balanced");

      res.json({
        total: result.total,
        alreadyEncrypted: result.alreadyEncrypted,
        encrypted: result.succeeded.length,
        failed: result.failed.length,
        succeededIds: result.succeeded,
        failedDetails: result.failed,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error in bulk encryption:", error);
      res.status(500).json({ error: "Failed to bulk encrypt documents" });
    }
  });

  // ==================== DOCUMENT META TAGS ====================

  // Get meta tags for a document
  router.get("/api/documents/:id/meta-tags", async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      const tags = await storage.getDocumentMetaTags(req.params.id);
      res.json(tags);
    } catch (error) {
      console.error("Error fetching document meta tags:", error);
      res.status(500).json({ error: "Failed to fetch meta tags" });
    }
  });

  // Set meta tags for a document (replaces all existing tags)
  router.put("/api/documents/:id/meta-tags", async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      const schema = z.object({
        tags: z.array(z.object({
          dimensionType: z.string().min(1).max(50),
          wbsCodeId: z.string().uuid().nullable().optional(),
          customValue: z.string().max(200).nullable().optional(),
        })),
      });
      
      const data = schema.parse(req.body);
      const savedTags = await storage.setDocumentMetaTags(req.params.id, data.tags);
      
      res.json(savedTags);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error setting document meta tags:", error);
      res.status(500).json({ error: "Failed to set meta tags" });
    }
  });

  // Filter documents by meta tags
  router.post("/api/documents/filter", async (req, res) => {
    try {
      const schema = z.object({
        tenantId: z.string().uuid().optional(),
        filters: z.record(z.array(z.string())), // { dimensionType: [codeId1, codeId2] }
      });
      
      const data = schema.parse(req.body);
      const tenantId = data.tenantId || await getDefaultTenantId();
      
      const documents = await storage.getDocumentsWithMetaTags(tenantId, data.filters);
      res.json(documents);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error filtering documents:", error);
      res.status(500).json({ error: "Failed to filter documents" });
    }
  });

  // ==================== KONG SERVICE ENDPOINTS ====================

  router.get("/api/kong/timestamp", async (req, res) => {
    try {
      const { kongService } = await import("../kong-service");
      const result = await kongService.getTimestamp();
      res.json(result);
    } catch (error) {
      console.error("Error fetching Kong timestamp:", error);
      res.status(500).json({ error: "Failed to fetch timestamp from Kong" });
    }
  });

  // Get Kong demo stats (compression statistics)
  router.get("/api/kong/stats", async (req, res) => {
    try {
      const { kongService } = await import("../kong-service");
      const result = await kongService.getDemoStats();
      res.json(result);
    } catch (error) {
      console.error("Error fetching Kong stats:", error);
      res.status(500).json({ error: "Failed to fetch stats from Kong" });
    }
  });

  // Get Kong API documentation
  router.get("/api/kong/docs", async (req, res) => {
    try {
      const { kongService } = await import("../kong-service");
      const result = await kongService.getApiDocs();
      res.json(result);
    } catch (error) {
      console.error("Error fetching Kong docs:", error);
      res.status(500).json({ error: "Failed to fetch docs from Kong" });
    }
  });

  // Get phase configuration
  router.get("/api/kong/phase-config/:mode", async (req, res) => {
    try {
      const { kongService } = await import("../kong-service");
      const mode = req.params.mode as "high_security" | "balanced" | "performance" | "adaptive";
      const result = await kongService.getPhaseConfig(mode);
      res.json(result);
    } catch (error) {
      console.error("Error fetching Kong phase config:", error);
      res.status(500).json({ error: "Failed to fetch phase config from Kong" });
    }
  });

  return router;
}
