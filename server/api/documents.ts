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
      const { kongService } = await import("../kong-service");
      
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
      
      // Sanitize content - remove null bytes that PostgreSQL can't handle in UTF8 text columns
      // This is necessary for binary files like PDFs that get parsed as text
      if (data.content) {
        data.content = data.content.replace(/\0/g, '');
      }
      
      let encryptedContent: string | null = null;
      let originalSize = 0;
      let compressedSize = 0;
      let savingsPercent = 0;
      let kongTimestamp: string | null = null;
      let checksum: string | null = null;
      
      // Get timestamp from Kong for audit trail
      try {
        const timestampResult = await kongService.getTimestamp();
        kongTimestamp = timestampResult.timestamp.humanReadable;
      } catch (e) {
        console.warn("Could not get Kong timestamp:", e);
      }
      
      // Track if encryption was attempted but failed
      let encryptionFailed = false;
      
      // Encrypt/compress if requested
      if (data.content && data.encrypt) {
        try {
          const mode = data.encryptionMode || "balanced";
          const encryptResult = await kongService.encryptData(data.content, mode);
          encryptedContent = JSON.stringify(encryptResult.encrypted);
          originalSize = encryptResult.originalSize;
          compressedSize = encryptResult.encryptedSize;
          savingsPercent = originalSize > 0 
            ? ((originalSize - compressedSize) / originalSize) * 100 
            : 0;
          checksum = encryptResult.encrypted.checksum;
        } catch (e) {
          console.warn("Kong encryption failed, falling back to unencrypted storage:", e);
          encryptionFailed = true;
          // Still calculate original size for unencrypted storage
          originalSize = Buffer.byteLength(data.content, 'utf8');
        }
      } else if (data.content) {
        originalSize = Buffer.byteLength(data.content, 'utf8');
      }
      
      // Determine what content to store - ALWAYS preserve content
      const storeEncrypted = !!encryptedContent;
      const storedPlainContent = storeEncrypted ? null : data.content;
      
      const doc = await storage.createDocument({
        tenantId: data.tenantId,
        projectId: data.projectId,
        name: data.name,
        description: data.description,
        category: data.category,
        status: storeEncrypted ? "encrypted" : "draft",
        originalSizeBytes: originalSize,
        compressedSizeBytes: compressedSize > 0 ? compressedSize : null,
        isEncrypted: storeEncrypted,
        encryptionMode: storeEncrypted ? (data.encryptionMode || "balanced") : null,
        encryptedContent: encryptedContent,
        plainContent: storedPlainContent,
        checksum: checksum,
        kongTimestamp: kongTimestamp,
        savingsPercent: savingsPercent > 0 ? String(savingsPercent.toFixed(2)) : null,
      });
      
      // Include encryption status in response
      const response: any = { ...doc };
      if (encryptionFailed) {
        response.encryptionFailed = true;
        response.message = "Kong encryption unavailable, document stored unencrypted";
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

  // Decrypt a document (fetch decrypted content)
  router.get("/api/documents/:id/decrypt", async (req, res) => {
    try {
      const { kongService } = await import("../kong-service");
      
      const doc = await storage.getDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      if (!doc.isEncrypted || !doc.encryptedContent) {
        return res.json({ content: doc.plainContent, encrypted: false });
      }
      
      try {
        const encrypted = JSON.parse(doc.encryptedContent);
        const decryptResult = await kongService.decryptData(encrypted);
        res.json({ 
          content: decryptResult.data, 
          encrypted: true,
          mode: decryptResult.mode 
        });
      } catch (e) {
        console.error("Decryption failed:", e);
        res.status(500).json({ error: "Failed to decrypt document" });
      }
    } catch (error) {
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
