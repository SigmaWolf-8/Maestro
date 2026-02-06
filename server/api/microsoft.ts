import { Router, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import * as microsoftGraph from "../microsoft-graph";
import nodemailer from "nodemailer";
import { z } from "zod";
import { getDefaultTenantId } from "./tenants";

const emailSendSchema = z.object({
  to: z.string().min(1, "Recipient email is required").email("Please enter a valid email address"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string(),
  cc: z.string().email().optional().or(z.literal("")),
});

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

export function createMicrosoftRouter(): Router {
  const router = Router();

  router.post("/api/email/send", validateBody(emailSendSchema), async (req, res) => {
    try {
      const { to, subject, body, cc } = req.body;

      const session = req.session as any;
      const userId = session?.passport?.user?.claims?.sub;

      if (userId) {
        const { authStorage } = await import("../replit_integrations/auth/storage");
        const authUser = await authStorage.getUser(userId);
        const userConfig = (authUser?.config as any) || {};
        const userEmail = userConfig.emailSettings;

        if (userEmail?.email && userEmail?.password) {
          console.log("Sending email via user SMTP:", { to, subject, from: userEmail.email });

          const transporter = nodemailer.createTransport({
            host: userEmail.host || "smtp.office365.com",
            port: userEmail.port || 587,
            secure: false,
            auth: {
              user: userEmail.email,
              pass: userEmail.password,
            },
          });

          await transporter.sendMail({
            from: userEmail.email,
            to,
            cc,
            subject,
            html: body,
          });

          return res.json({
            success: true,
            message: "Email sent successfully",
          });
        }
      }

      const accessToken = session?.microsoft?.accessToken;

      if (accessToken) {
        console.log("Sending email via Microsoft 365 Graph API:", { to, subject });

        const result = await microsoftGraph.sendEmail(accessToken, { to, subject, body, cc });

        if (result.success) {
          return res.json({
            success: true,
            message: "Email sent successfully via Microsoft 365",
          });
        } else {
          return res.status(500).json({
            error: "Failed to send email",
            message: result.error,
          });
        }
      }

      return res.status(401).json({
        error: "Email not configured",
        message: "Please configure your email settings in your Profile to send emails",
      });
    } catch (error: any) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "Failed to send email", message: error.message });
    }
  });

  router.post("/api/tenants/:id/smtp-config", async (req: Request, res: Response) => {
    try {
      const tenantId = req.params.id;
      const { email, password, host, port } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      const updatedConfig = {
        ...tenant.config,
        smtp: {
          email,
          password,
          host: host || "smtp.office365.com",
          port: port || 587,
        },
      };

      await storage.updateTenant(tenantId, { config: updatedConfig });
      res.json({ success: true, message: "Email configuration saved" });
    } catch (error) {
      console.error("Save SMTP config error:", error);
      res.status(500).json({ error: "Failed to save configuration" });
    }
  });

  router.get("/api/smtp/status", async (req: Request, res: Response) => {
    try {
      const tenantId = req.query.tenantId as string;
      if (!tenantId) {
        return res.json({ configured: false });
      }
      
      const tenant = await storage.getTenant(tenantId);
      const smtpConfig = tenant?.config?.smtp;
      
      res.json({ 
        configured: !!(smtpConfig?.email && smtpConfig?.password),
        email: smtpConfig?.email || null,
      });
    } catch (error) {
      res.json({ configured: false });
    }
  });

  router.get("/api/microsoft/status", async (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string;
    const session = req.session as any;
    const accessToken = session?.microsoft?.accessToken;
    const email = session?.microsoft?.email;
    
    const connected = !!accessToken;
    
    if (tenantId) {
      try {
        const tenant = await storage.getTenant(tenantId);
        const tenantConfig = tenant?.config?.microsoft;
        const configured = microsoftGraph.isTenantConfigured(tenantConfig);
        res.json({ connected, email, configured, tenantConfigured: !!tenantConfig?.clientId });
      } catch {
        res.json({ connected, email, configured: microsoftGraph.isConfigured(), tenantConfigured: false });
      }
    } else {
      res.json({ connected, email, configured: microsoftGraph.isConfigured(), tenantConfigured: false });
    }
  });

  router.get("/api/microsoft/connect", async (req: Request, res: Response) => {
    try {
      const tenantId = req.query.tenantId as string;
      const sessionId = "default-user";
      
      let credentials: { clientId: string; clientSecret: string; tenantId: string } | null = null;
      
      if (tenantId) {
        const tenant = await storage.getTenant(tenantId);
        if (tenant?.config?.microsoft?.clientId && tenant?.config?.microsoft?.clientSecret) {
          credentials = {
            clientId: tenant.config.microsoft.clientId,
            clientSecret: tenant.config.microsoft.clientSecret,
            tenantId: tenant.config.microsoft.tenantId || "common",
          };
        }
      }
      
      if (!credentials) {
        credentials = microsoftGraph.getCredentials();
      }
      
      if (!credentials) {
        return res.redirect("/settings?error=microsoft_not_configured");
      }
      
      const state = microsoftGraph.generateOAuthState(sessionId, tenantId, credentials);
      const authUrl = microsoftGraph.getAuthUrl(state, credentials);
      res.redirect(authUrl);
    } catch (error) {
      console.error("Microsoft connect error:", error);
      res.redirect("/settings?error=microsoft_connect_failed");
    }
  });

  router.post("/api/microsoft/disconnect", async (req: Request, res: Response) => {
    try {
      const session = req.session as any;
      if (session?.microsoft) {
        delete session.microsoft;
      }
      res.json({ success: true, message: "Microsoft 365 disconnected" });
    } catch (error) {
      console.error("Microsoft disconnect error:", error);
      res.status(500).json({ error: "Failed to disconnect" });
    }
  });

  router.post("/api/tenants/:id/microsoft-config", async (req: Request, res: Response) => {
    try {
      const tenantId = req.params.id;
      const { clientId, clientSecret, tenantId: azureTenantId } = req.body;

      if (!clientId || !clientSecret) {
        return res.status(400).json({ error: "Client ID and Client Secret are required" });
      }

      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      const updatedConfig = {
        ...tenant.config,
        microsoft: {
          clientId,
          clientSecret,
          tenantId: azureTenantId || "common",
        },
      };

      await storage.updateTenant(tenantId, { config: updatedConfig });
      res.json({ success: true, message: "Microsoft 365 configuration saved" });
    } catch (error) {
      console.error("Save Microsoft config error:", error);
      res.status(500).json({ error: "Failed to save configuration" });
    }
  });

  router.get("/api/microsoft/auth-url", async (req: Request, res: Response) => {
    try {
      const tenantId = req.query.tenantId as string;
      const sessionId = "default-user";
      
      let credentials: { clientId: string; clientSecret: string; tenantId: string } | null = null;
      
      if (tenantId) {
        const tenant = await storage.getTenant(tenantId);
        if (tenant?.config?.microsoft?.clientId && tenant?.config?.microsoft?.clientSecret) {
          credentials = {
            clientId: tenant.config.microsoft.clientId,
            clientSecret: tenant.config.microsoft.clientSecret,
            tenantId: tenant.config.microsoft.tenantId || "common",
          };
        }
      }
      
      if (!credentials) {
        credentials = microsoftGraph.getCredentials();
      }
      
      if (!credentials) {
        return res.status(400).json({ 
          error: "Microsoft 365 not configured",
          needsConfig: true,
          message: "Please configure your Microsoft 365 credentials"
        });
      }
      
      const state = microsoftGraph.generateOAuthState(sessionId, tenantId, credentials);
      const authUrl = microsoftGraph.getAuthUrl(state, credentials);
      res.json({ authUrl, state });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/api/microsoft/callback", async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;
      
      if (!code || typeof code !== "string") {
        return res.status(400).send("Missing authorization code");
      }
      
      if (!state || typeof state !== "string") {
        return res.status(400).send("Missing or invalid state parameter");
      }
      
      const stateValidation = microsoftGraph.validateOAuthState(state);
      if (!stateValidation.valid) {
        console.error("OAuth state validation failed");
        return res.redirect("/documents/files?microsoft=error&message=" + encodeURIComponent("OAuth state validation failed. Please try again."));
      }
      
      let credentials = stateValidation.credentials;
      
      if (!credentials) {
        if (stateValidation.tenantId) {
          const tenant = await storage.getTenant(stateValidation.tenantId);
          if (tenant?.config?.microsoft) {
            credentials = {
              clientId: tenant.config.microsoft.clientId,
              clientSecret: tenant.config.microsoft.clientSecret,
              tenantId: tenant.config.microsoft.tenantId || "common",
            };
          }
        }
        if (!credentials) {
          credentials = microsoftGraph.getCredentials() || undefined;
        }
      }
      
      if (!credentials) {
        return res.redirect("/documents/files?microsoft=error&message=" + encodeURIComponent("No credentials available"));
      }
      
      const token = await microsoftGraph.exchangeCodeForToken(code, credentials);
      
      const sessionId = stateValidation.userId || "default-user";
      await microsoftGraph.storeToken(sessionId, token);
      
      if (stateValidation.tenantId && credentials) {
        microsoftGraph.setStoredCredentials(stateValidation.tenantId, credentials);
      }
      
      res.redirect("/documents/files?microsoft=connected");
    } catch (error: any) {
      console.error("Microsoft OAuth callback error:", error);
      res.redirect("/documents/files?microsoft=error&message=" + encodeURIComponent(error.message));
    }
  });

  router.post("/api/microsoft/upload", async (req: Request, res: Response) => {
    try {
      const sessionId = "default-user";
      const tenantId = req.body.tenantId as string;
      
      let credentials = tenantId ? microsoftGraph.getStoredCredentials(tenantId) : undefined;
      if (!credentials) {
        credentials = microsoftGraph.getCredentials() || undefined;
      }
      
      const accessToken = await microsoftGraph.getValidToken(sessionId, credentials);
      
      if (!accessToken) {
        return res.status(401).json({ error: "Not authenticated with Microsoft" });
      }
      
      const { fileName, content, mimeType } = req.body;
      
      if (!fileName || !content) {
        return res.status(400).json({ error: "Missing fileName or content" });
      }
      
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      
      let fileBuffer: Buffer;
      try {
        if (content.startsWith("data:")) {
          const base64Data = content.split(",")[1];
          if (!base64Data) {
            return res.status(400).json({ error: "Invalid data URL format" });
          }
          fileBuffer = Buffer.from(base64Data, "base64");
        } else {
          fileBuffer = Buffer.from(content, "base64");
        }
      } catch (decodeError) {
        return res.status(400).json({ error: "Failed to decode file content" });
      }
      
      const maxSize = 50 * 1024 * 1024;
      if (fileBuffer.length > maxSize) {
        return res.status(400).json({ error: "File size exceeds 50MB limit" });
      }
      
      const uploadResult = await microsoftGraph.uploadToOneDrive(
        accessToken,
        sanitizedFileName,
        fileBuffer,
        mimeType || "application/octet-stream"
      );
      
      const urls = await microsoftGraph.getOneDriveFileUrl(accessToken, uploadResult.id);
      
      res.json({
        ...uploadResult,
        editUrl: urls.editUrl,
      });
    } catch (error: any) {
      console.error("Microsoft upload error:", error);
      res.status(500).json({ 
        error: "Upload failed", 
        details: error.message 
      });
    }
  });

  router.get("/api/microsoft/edit-url/:fileId", async (req: Request, res: Response) => {
    try {
      const sessionId = "default-user";
      const accessToken = await microsoftGraph.getValidToken(sessionId);
      
      if (!accessToken) {
        return res.status(401).json({ error: "Not authenticated with Microsoft" });
      }
      
      const { fileId } = req.params;
      const urls = await microsoftGraph.getOneDriveFileUrl(accessToken, fileId);
      
      res.json(urls);
    } catch (error: any) {
      console.error("Microsoft get edit URL error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/api/microsoft/files", async (_req: Request, res: Response) => {
    try {
      const sessionId = "default-user";
      const accessToken = await microsoftGraph.getValidToken(sessionId);
      
      if (!accessToken) {
        return res.status(401).json({ error: "Not authenticated with Microsoft" });
      }
      
      const files = await microsoftGraph.listOneDriveFiles(accessToken);
      res.json(files);
    } catch (error: any) {
      console.error("Microsoft list files error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/api/microsoft/sync/:fileId", async (req: Request, res: Response) => {
    try {
      const sessionId = "default-user";
      const tenantId = req.body.tenantId as string;
      const documentId = req.body.documentId as string;
      
      let credentials = tenantId ? microsoftGraph.getStoredCredentials(tenantId) : undefined;
      if (!credentials) {
        credentials = microsoftGraph.getCredentials() || undefined;
      }
      
      const accessToken = await microsoftGraph.getValidToken(sessionId, credentials);
      
      if (!accessToken) {
        return res.status(401).json({ error: "Not authenticated with Microsoft" });
      }
      
      const { fileId } = req.params;
      
      if (!documentId) {
        return res.status(400).json({ error: "Missing documentId" });
      }
      
      const downloadResult = await microsoftGraph.downloadFromOneDrive(accessToken, fileId);
      
      const base64Content = downloadResult.content.toString('base64');
      
      const updatedDoc = await storage.updateDocument(documentId, {
        plainContent: base64Content,
        originalSizeBytes: downloadResult.content.length,
        updatedAt: new Date(),
      });
      
      res.json({
        success: true,
        name: downloadResult.name,
        size: downloadResult.content.length,
        lastModified: downloadResult.lastModified,
        message: "Document synced from OneDrive",
        document: updatedDoc
      });
    } catch (error: any) {
      console.error("Microsoft sync error:", error);
      res.status(500).json({ 
        error: "Sync failed", 
        details: error.message 
      });
    }
  });

  router.get("/api/microsoft/connected", async (req: Request, res: Response) => {
    const sessionId = "default-user";
    const tenantId = req.query.tenantId as string;
    
    let isConfigured = false;
    let credentials: { clientId: string; clientSecret: string; tenantId: string } | undefined;
    
    if (tenantId) {
      try {
        const tenant = await storage.getTenant(tenantId);
        if (tenant?.config?.microsoft?.clientId && tenant?.config?.microsoft?.clientSecret) {
          isConfigured = true;
          credentials = {
            clientId: tenant.config.microsoft.clientId,
            clientSecret: tenant.config.microsoft.clientSecret,
            tenantId: tenant.config.microsoft.tenantId || "common",
          };
        }
      } catch {
      }
    }
    
    if (!isConfigured) {
      const envCreds = microsoftGraph.getCredentials();
      if (envCreds) {
        isConfigured = true;
        credentials = envCreds;
      }
    }
    
    const accessToken = isConfigured ? await microsoftGraph.getValidToken(sessionId, credentials) : null;
    res.json({ 
      configured: isConfigured,
      connected: !!accessToken 
    });
  });

  return router;
}
