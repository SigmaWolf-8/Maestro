import type { Express } from "express";
import { z } from "zod";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";

const emailConfigSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().optional().default(""),
  host: z.string().optional().default("smtp.office365.com"),
  port: z.number().int().min(1).max(65535).optional().default(587),
});

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch("/api/auth/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName } = req.body;
      
      const user = await authStorage.upsertUser({
        id: userId,
        firstName: firstName || null,
        lastName: lastName || null,
      });
      
      res.json(user);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.get("/api/auth/email-config", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const config = (user.config as any) || {};
      const emailSettings = config.emailSettings || {};
      res.json({
        configured: !!(emailSettings.email && emailSettings.password),
        email: emailSettings.email || null,
        host: emailSettings.host || "smtp.office365.com",
        port: emailSettings.port || 587,
      });
    } catch (error) {
      console.error("Error fetching email config:", error);
      res.status(500).json({ message: "Failed to fetch email config" });
    }
  });

  app.post("/api/auth/email-config", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = emailConfigSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { email, password, host, port } = parsed.data;

      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const existingConfig = (user.config as any) || {};
      const existingEmailSettings = existingConfig.emailSettings || {};

      const resolvedPassword = password || existingEmailSettings.password;
      if (!resolvedPassword) {
        return res.status(400).json({ message: "Password is required for initial email setup" });
      }

      const updatedConfig = {
        ...existingConfig,
        emailSettings: {
          email,
          password: resolvedPassword,
          host,
          port,
        },
      };

      await authStorage.updateUserConfig(userId, updatedConfig);
      res.json({ success: true, message: "Email settings saved" });
    } catch (error) {
      console.error("Error saving email config:", error);
      res.status(500).json({ message: "Failed to save email config" });
    }
  });

  app.delete("/api/auth/email-config", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const existingConfig = (user.config as any) || {};
      const { emailSettings, ...rest } = existingConfig;
      await authStorage.updateUserConfig(userId, rest);
      res.json({ success: true, message: "Email settings removed" });
    } catch (error) {
      console.error("Error removing email config:", error);
      res.status(500).json({ message: "Failed to remove email config" });
    }
  });
}
