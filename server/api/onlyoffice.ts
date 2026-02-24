import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { getDefaultTenantId } from "./tenants";
import { documentService } from "../services/document-service";

function normalizeServerUrl(url: string): string {
  let normalized = (url || "").trim();
  if (!normalized) return "";
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }
  normalized = normalized.replace(/\/+$/, "");
  return normalized;
}

export function createOnlyOfficeRouter(): Router {
  const router = Router();

  router.get("/api/onlyoffice/config", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenantId as string) || (await getDefaultTenantId());
      const tenant = await storage.getTenant(tenantId);
      const config = (tenant?.config || {}) as Record<string, any>;
      const serverUrl = normalizeServerUrl(config.onlyofficeUrl || process.env.ONLYOFFICE_URL || "");
      const jwtSecret = config.onlyofficeSecret || process.env.ONLYOFFICE_SECRET || "";

      res.json({
        configured: !!serverUrl,
        serverUrl,
        hasSecret: !!jwtSecret,
      });
    } catch (error) {
      console.error("Error fetching ONLYOFFICE config:", error);
      res.status(500).json({ error: "Failed to fetch ONLYOFFICE configuration" });
    }
  });

  router.post("/api/onlyoffice/config", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.body.tenantId as string) || (await getDefaultTenantId());
      const { serverUrl, jwtSecret } = req.body;
      const normalizedUrl = normalizeServerUrl(serverUrl);

      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      const currentConfig = (tenant.config || {}) as Record<string, any>;
      await storage.updateTenant(tenantId, {
        config: {
          ...currentConfig,
          onlyofficeUrl: normalizedUrl,
          onlyofficeSecret: (jwtSecret || "").trim(),
        },
      });

      res.json({ success: true, serverUrl: normalizedUrl });
    } catch (error) {
      console.error("Error saving ONLYOFFICE config:", error);
      res.status(500).json({ error: "Failed to save ONLYOFFICE configuration" });
    }
  });

  router.post("/api/onlyoffice/test-connection", async (req: Request, res: Response) => {
    try {
      const { serverUrl } = req.body;
      const normalizedUrl = normalizeServerUrl(serverUrl);

      if (!normalizedUrl) {
        return res.status(400).json({ error: "No URL provided" });
      }

      let connected = false;
      let message = "";
      let serverType = "unknown";

      const isDocSpaceUrl = /docspace/i.test(normalizedUrl);

      const apiJsUrl = `${normalizedUrl}/web-apps/apps/api/documents/api.js`;
      const healthCheckUrl = `${normalizedUrl}/healthcheck`;

      const controller1 = new AbortController();
      const timeout1 = setTimeout(() => controller1.abort(), 8000);

      try {
        const apiRes = await fetch(apiJsUrl, { signal: controller1.signal });
        clearTimeout(timeout1);
        if (apiRes.ok) {
          const text = await apiRes.text();
          if (text.includes("DocsAPI") || text.includes("docEditor")) {
            connected = true;
            serverType = "documentserver";
            message = "Document Server is connected and ready";
          } else {
            message = "Server responded but the editor API was not found at this URL. If you're using DocSpace, note that DocSpace does not expose the Document Server editor API — you need a standalone ONLYOFFICE Document Server (Docs) instead. Check that the URL points to the Document Server (typically port 80 or 443) and ends without /web-apps.";
          }
        } else {
          message = `Editor API returned status ${apiRes.status}. Verify this is an ONLYOFFICE Document Server (not DocSpace). The editor API path /web-apps/apps/api/documents/api.js must be accessible.`;
        }
      } catch {
        clearTimeout(timeout1);
        const controller2 = new AbortController();
        const timeout2 = setTimeout(() => controller2.abort(), 8000);
        try {
          const healthRes = await fetch(healthCheckUrl, { signal: controller2.signal });
          clearTimeout(timeout2);
          if (healthRes.ok) {
            if (isDocSpaceUrl) {
              connected = false;
              serverType = "docspace";
              message = "This is a DocSpace URL, not a Document Server. DocSpace is a different product. You need the Document Server (Docs) URL — typically http://your-ip:port or your server's public address.";
            } else {
              const text = await healthRes.text();
              if (text.toLowerCase().includes("true")) {
                connected = true;
                serverType = "documentserver";
                message = "Document Server is connected and ready";
              } else {
                message = `Server responded but health check returned: ${text}`;
              }
            }
          } else {
            message = `Health check returned status ${healthRes.status}. Verify this is a Document Server URL.`;
          }
        } catch {
          clearTimeout(timeout2);
          if (normalizedUrl.includes("localhost") || normalizedUrl.includes("127.0.0.1")) {
            message = "Cannot reach localhost from this cloud server. Your Document Server needs to be accessible via a public URL or IP address (not localhost). Use your computer's public IP or a tunnel service like ngrok.";
          } else {
            message = `Could not reach ${normalizedUrl}. Verify the URL is correct, the server is running, and it's accessible from the internet.`;
          }
        }
      }

      res.json({ connected, message, normalizedUrl, serverType });
    } catch (error) {
      console.error("Error testing ONLYOFFICE connection:", error);
      res.status(500).json({ error: "Connection test failed" });
    }
  });

  router.get("/api/onlyoffice/editor-config/:documentId", async (req: Request, res: Response) => {
    try {
      const documentId = req.params.documentId as string;
      const tenantId = (req.query.tenantId as string) || (await getDefaultTenantId());

      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      const tenant = await storage.getTenant(tenantId);
      const tenantConfig = (tenant?.config || {}) as Record<string, any>;
      const serverUrl = normalizeServerUrl(tenantConfig.onlyofficeUrl || process.env.ONLYOFFICE_URL || "");
      const jwtSecret = tenantConfig.onlyofficeSecret || process.env.ONLYOFFICE_SECRET || "";

      if (!serverUrl) {
        return res.status(400).json({ error: "ONLYOFFICE Document Server URL not configured" });
      }

      const ext = document.name.split(".").pop()?.toLowerCase() || "";
      let documentType = "word";
      if (["xlsx", "xls", "csv"].includes(ext)) documentType = "cell";
      if (["pptx", "ppt"].includes(ext)) documentType = "slide";

      const protocol = req.protocol;
      const host = req.get("host");
      const appUrl = `${protocol}://${host}`;

      const docKey = `${documentId}_${Date.now()}`;

      const editorConfig: Record<string, any> = {
        document: {
          fileType: ext,
          key: docKey,
          title: document.name,
          url: `${appUrl}/api/onlyoffice/download/${documentId}`,
          permissions: {
            comment: true,
            download: true,
            edit: true,
            print: true,
            review: true,
          },
        },
        documentType,
        editorConfig: {
          callbackUrl: `${appUrl}/api/onlyoffice/callback/${documentId}`,
          lang: "en",
          mode: "edit",
          customization: {
            autosave: true,
            chat: false,
            comments: true,
            compactHeader: false,
            compactToolbar: false,
            forcesave: true,
            help: true,
            hideRightMenu: false,
            hideRulers: false,
            submitForm: false,
            about: false,
            feedback: false,
          },
          user: {
            id: "maestro-user",
            name: "Maestro User",
          },
        },
        height: "100%",
        width: "100%",
        type: "desktop",
      };

      if (jwtSecret) {
        try {
          const jwt = await import("jsonwebtoken");
          const token = (jwt.default || jwt).sign(editorConfig, jwtSecret);
          editorConfig.token = token;
        } catch {
          console.warn("[ONLYOFFICE] JWT signing skipped - jsonwebtoken not available");
        }
      }

      res.json({
        config: editorConfig,
        serverUrl,
      });
    } catch (error) {
      console.error("Error generating ONLYOFFICE editor config:", error);
      res.status(500).json({ error: "Failed to generate editor configuration" });
    }
  });

  router.get("/api/onlyoffice/download/:documentId", async (req: Request, res: Response) => {
    try {
      const documentId = req.params.documentId as string;
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      let content = document.plainContent || "";

      if (document.isEncrypted && document.encryptedContent) {
        try {
          const decrypted = await documentService.decrypt(documentId);
          content = decrypted.content || "";
        } catch (err) {
          console.error("[ONLYOFFICE] Failed to decrypt document for download:", err);
          return res.status(500).json({ error: "Failed to decrypt document for editing" });
        }
      }

      if (content.startsWith("data:")) {
        const matches = content.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, "base64");
          res.setHeader("Content-Type", mimeType);
          res.setHeader("Content-Disposition", `attachment; filename="${document.name}"`);
          res.setHeader("Content-Length", buffer.length.toString());
          return res.send(buffer);
        }
      }

      const buffer = Buffer.from(content, "utf-8");
      const ext = document.name.split(".").pop()?.toLowerCase() || "txt";
      const mimeTypes: Record<string, string> = {
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        pdf: "application/pdf",
        txt: "text/plain",
        csv: "text/csv",
      };

      res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${document.name}"`);
      res.setHeader("Content-Length", buffer.length.toString());
      res.send(buffer);
    } catch (error) {
      console.error("Error downloading document for ONLYOFFICE:", error);
      res.status(500).json({ error: "Failed to download document" });
    }
  });

  router.post("/api/onlyoffice/callback/:documentId", async (req: Request, res: Response) => {
    try {
      const documentId = req.params.documentId as string;
      const { status, url } = req.body;

      if (status === 2 || status === 6) {
        if (url) {
          try {
            const response = await fetch(url);
            if (response.ok) {
              const buffer = await response.arrayBuffer();
              const base64 = Buffer.from(buffer).toString("base64");
              const ext = req.body.filetype || "docx";
              const mimeTypes: Record<string, string> = {
                docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
              };
              const mimeType = mimeTypes[ext] || "application/octet-stream";
              const dataUrl = `data:${mimeType};base64,${base64}`;

              const doc = await storage.getDocument(documentId);
              if (doc?.isEncrypted && doc.encryptionMode) {
                try {
                  await storage.updateDocument(documentId, {
                    plainContent: dataUrl,
                    originalSizeBytes: buffer.byteLength,
                  });
                  await documentService.reEncrypt(documentId, doc.encryptionMode as any);
                  console.log(`[ONLYOFFICE] Document ${documentId} saved and re-encrypted (${buffer.byteLength} bytes)`);
                } catch (encErr) {
                  console.error("[ONLYOFFICE] Re-encryption failed, saving as plain:", encErr);
                  await storage.updateDocument(documentId, {
                    plainContent: dataUrl,
                    originalSizeBytes: buffer.byteLength,
                  });
                }
              } else {
                await storage.updateDocument(documentId, {
                  plainContent: dataUrl,
                  originalSizeBytes: buffer.byteLength,
                });
              }

              console.log(`[ONLYOFFICE] Document ${documentId} saved successfully (${buffer.byteLength} bytes)`);
            }
          } catch (err) {
            console.error("[ONLYOFFICE] Error fetching saved document:", err);
          }
        }
      }

      res.json({ error: 0 });
    } catch (error) {
      console.error("Error in ONLYOFFICE callback:", error);
      res.json({ error: 0 });
    }
  });

  return router;
}
