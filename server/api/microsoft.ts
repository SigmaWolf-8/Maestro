import { Router, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import * as microsoftGraph from "../microsoft-graph";
import { z } from "zod";
import { getDefaultTenantId } from "./tenants";
import { sendEmail, testResendConnection } from "../services/email-service";

const emailSendSchema = z.object({
  to: z.string().min(1, "Recipient email is required").email("Please enter a valid email address"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string(),
  cc: z.string().email().optional().or(z.literal("")),
  tenantId: z.string().optional(),
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
      const { to, subject, body, cc, tenantId: bodyTenantId } = req.body;
      const tenantId = (req.query.tenantId as string) || bodyTenantId || "";

      const passportUser = (req as any).user;
      const userId = passportUser?.claims?.sub;
      const session = req.session as any;

      if (!userId) {
        const sessionUserId = session?.passport?.user?.claims?.sub;
        if (!sessionUserId) {
          return res.status(401).json({
            error: "Not authenticated",
            message: "Please log in to send emails",
          });
        }
      }

      const resolvedUserId = userId || session?.passport?.user?.claims?.sub;

      const accessToken = session?.microsoft?.accessToken;
      if (accessToken) {
        console.log("Sending email via Microsoft 365 Graph API:", { to, subject });
        try {
          const graphResult = await microsoftGraph.sendEmail(accessToken, { to, subject, body, cc });
          if (graphResult.success) {
            return res.json({
              success: true,
              message: "Email sent successfully via Microsoft 365",
              provider: "microsoft",
            });
          }
          console.warn("Graph API send failed, will try Resend/SMTP fallback:", graphResult.error);
        } catch (graphErr: any) {
          console.warn("Graph API error, will try Resend/SMTP fallback:", graphErr.message);
        }
      }

      let userSmtp = null;
      if (resolvedUserId) {
        const { authStorage } = await import("../replit_integrations/auth/storage");
        const authUser = await authStorage.getUser(resolvedUserId);
        const userConfig = (authUser?.config as any) || {};
        const userEmail = userConfig.emailSettings;
        if (userEmail?.email && userEmail?.password) {
          userSmtp = {
            email: userEmail.email,
            password: userEmail.password,
            host: userEmail.host,
            port: userEmail.port,
          };
        }
      }

      const result = await sendEmail(tenantId, { to, subject, body, cc: cc || undefined }, userSmtp);

      if (result.success) {
        return res.json({
          success: true,
          message: result.message,
          provider: result.provider,
        });
      }

      return res.status(400).json({
        error: "Email send failed",
        message: result.message,
        provider: result.provider,
      });
    } catch (error: any) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "Failed to send email", message: error.message });
    }
  });

  router.post("/api/email/test-resend", async (req: Request, res: Response) => {
    try {
      const { apiKey } = req.body;
      if (!apiKey) {
        return res.status(400).json({ error: "API key is required" });
      }
      const result = await testResendConnection(apiKey);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  router.post("/api/email/send-test", async (req: Request, res: Response) => {
    try {
      const { tenantId, to } = req.body;
      if (!tenantId || !to) {
        return res.status(400).json({ error: "tenantId and to are required" });
      }

      const result = await sendEmail(tenantId, {
        to,
        subject: "The Maestro - Test Email",
        body: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #0f766e, #115e59); padding: 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px;">The Maestro</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0;">Construction ERP</p>
            </div>
            <div style="padding: 24px; background: white; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <h2 style="color: #111827; margin-top: 0;">Email Configuration Test</h2>
              <p style="color: #374151;">This is a test email from The Maestro ERP. If you received this message, your email configuration is working correctly.</p>
              <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 12px; margin: 16px 0;">
                <p style="color: #166534; margin: 0; font-weight: 500;">Email delivery is active and ready for use.</p>
              </div>
              <p style="color: #6b7280; font-size: 12px; margin-bottom: 0;">Sent from The Maestro ERP</p>
            </div>
          </div>
        `,
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  router.get("/api/email/config", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenantId as string) || (await getDefaultTenantId());
      const tenant = await storage.getTenant(tenantId);
      const config = (tenant?.config || {}) as Record<string, any>;

      const hasResend = !!(config.resendApiKey || process.env.RESEND_API_KEY);
      const resendFromEmail = config.resendFromEmail || process.env.RESEND_FROM_EMAIL || "";
      const resendFromName = config.resendFromName || "";
      const hasSmtp = !!(config.smtp?.email && config.smtp?.password);
      const smtpEmail = config.smtp?.email || "";
      const smtpHost = config.smtp?.host || "smtp.office365.com";
      const smtpPort = config.smtp?.port || 587;

      res.json({
        provider: hasResend ? "resend" : hasSmtp ? "smtp" : "none",
        resend: {
          configured: hasResend,
          fromEmail: resendFromEmail,
          fromName: resendFromName,
          hasApiKey: !!config.resendApiKey,
          usingEnvKey: !config.resendApiKey && !!process.env.RESEND_API_KEY,
        },
        smtp: {
          configured: hasSmtp,
          email: smtpEmail,
          host: smtpHost,
          port: smtpPort,
        },
      });
    } catch (error) {
      console.error("Error fetching email config:", error);
      res.status(500).json({ error: "Failed to fetch email configuration" });
    }
  });

  router.post("/api/email/config", async (req: Request, res: Response) => {
    try {
      const { tenantId, provider, resendApiKey, resendFromEmail, resendFromName, smtpEmail, smtpPassword, smtpHost, smtpPort } = req.body;
      const resolvedTenantId = tenantId || (await getDefaultTenantId());
      const tenant = await storage.getTenant(resolvedTenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      const currentConfig = (tenant.config || {}) as Record<string, any>;
      const updatedConfig: Record<string, any> = { ...currentConfig };

      if (provider === "resend") {
        if (resendApiKey) updatedConfig.resendApiKey = resendApiKey;
        updatedConfig.resendFromEmail = resendFromEmail || currentConfig.resendFromEmail || "";
        updatedConfig.resendFromName = resendFromName !== undefined ? resendFromName : (currentConfig.resendFromName || "");
      } else if (provider === "smtp") {
        updatedConfig.smtp = {
          email: smtpEmail || currentConfig.smtp?.email,
          password: smtpPassword || currentConfig.smtp?.password,
          host: smtpHost || currentConfig.smtp?.host || "smtp.office365.com",
          port: smtpPort || currentConfig.smtp?.port || 587,
        };
      }

      await storage.updateTenant(resolvedTenantId, { config: updatedConfig });
      res.json({ success: true, message: "Email configuration saved" });
    } catch (error) {
      console.error("Save email config error:", error);
      res.status(500).json({ error: "Failed to save configuration" });
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
      await microsoftGraph.storeToken(sessionId, token, stateValidation.tenantId);
      
      if (stateValidation.tenantId && credentials) {
        microsoftGraph.setStoredCredentials(stateValidation.tenantId, credentials);
      }
      
      const successHtml = `<!DOCTYPE html><html><head><title>Microsoft 365 Connected</title></head><body>
        <p>Connected successfully. This window will close automatically.</p>
        <script>
          if (window.opener) { window.close(); }
          else { window.location.href = "/documents/files?microsoft=connected"; }
        </script></body></html>`;
      res.type("html").send(successHtml);
    } catch (error: any) {
      console.error("Microsoft OAuth callback error:", error);
      const safeMsg = (error.message || "Unknown error").replace(/[<>"'&]/g, '');
      const isSecretError = safeMsg.includes("invalid_client") || safeMsg.includes("Invalid client secret") || safeMsg.includes("7000215");
      const errorHtml = `<!DOCTYPE html><html><head><title>Connection Failed</title>
        <style>body{font-family:system-ui,sans-serif;padding:24px;max-width:500px;margin:0 auto;color:#333}
        .err{background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:12px;margin:12px 0;font-size:13px}
        .hint{background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:12px;margin:12px 0;font-size:13px}
        button{background:#2563eb;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px}
        button:hover{background:#1d4ed8}
        h3{margin:0 0 8px}</style></head><body>
        <h3>Microsoft 365 Connection Failed</h3>
        <div class="err">${isSecretError 
          ? "The client secret is invalid. Make sure you're using the secret <b>Value</b>, not the secret <b>ID</b>."
          : safeMsg}</div>
        ${isSecretError ? '<div class="hint"><b>To fix:</b> Go to Azure Portal → your app → Certificates &amp; secrets → create a new secret → copy the <b>Value</b> column.</div>' : ''}
        <button onclick="window.opener ? window.close() : window.location.href='/documents/files?microsoft=reconfigure'">
          ${isSecretError ? 'Close &amp; Update Credentials' : 'Close'}</button>
        </body></html>`;
      res.type("html").send(errorHtml);
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
      
      const accessToken = await microsoftGraph.getValidToken(sessionId, credentials, tenantId);
      
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

  router.get("/api/microsoft/preview/:fileId", async (req: Request, res: Response) => {
    try {
      const sessionId = "default-user";
      const tenantId = req.query.tenantId as string;

      let credentials = tenantId ? microsoftGraph.getStoredCredentials(tenantId) : undefined;
      if (!credentials) {
        credentials = microsoftGraph.getCredentials() || undefined;
      }

      const accessToken = await microsoftGraph.getValidToken(sessionId, credentials, tenantId);

      if (!accessToken) {
        return res.status(401).json({ error: "Not authenticated with Microsoft" });
      }

      const { fileId } = req.params;
      const previewUrl = await microsoftGraph.getFilePreviewUrl(accessToken, fileId);

      res.json({ previewUrl });
    } catch (error: any) {
      console.error("Microsoft get preview URL error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/api/microsoft/edit-url/:fileId", async (req: Request, res: Response) => {
    try {
      const sessionId = "default-user";
      const tenantId = req.query.tenantId as string;
      
      let credentials = tenantId ? microsoftGraph.getStoredCredentials(tenantId) : undefined;
      if (!credentials) {
        credentials = microsoftGraph.getCredentials() || undefined;
      }
      
      const accessToken = await microsoftGraph.getValidToken(sessionId, credentials, tenantId);
      
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

  router.get("/api/microsoft/files", async (req: Request, res: Response) => {
    try {
      const sessionId = "default-user";
      const tenantId = req.query.tenantId as string;
      
      let credentials = tenantId ? microsoftGraph.getStoredCredentials(tenantId) : undefined;
      if (!credentials) {
        credentials = microsoftGraph.getCredentials() || undefined;
      }
      
      const accessToken = await microsoftGraph.getValidToken(sessionId, credentials, tenantId);
      
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
      
      const accessToken = await microsoftGraph.getValidToken(sessionId, credentials, tenantId);
      
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
    
    const accessToken = isConfigured ? await microsoftGraph.getValidToken(sessionId, credentials, tenantId) : null;
    res.json({ 
      configured: isConfigured,
      connected: !!accessToken 
    });
  });

  return router;
}
