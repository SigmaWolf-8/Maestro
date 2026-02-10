import { Router, Request, Response } from "express";
import { storage } from "../storage";

export function createWopiRouter(): Router {
  const router = Router();

  router.get("/api/wopi/files/:id", async (req: Request, res: Response) => {
    try {
      const { getFileInfo, validateAccessToken } = await import("../services/wopi-host-service");
      const accessToken = req.query.access_token as string;
      
      if (!accessToken) {
        return res.status(401).json({ error: "Access token required" });
      }
      
      const tokenData = validateAccessToken(accessToken);
      if (!tokenData) {
        return res.status(401).json({ error: "Invalid or expired access token" });
      }

      if (tokenData.fileId !== req.params.id) {
        return res.status(403).json({ error: "Token not authorized for this document" });
      }

      const fileInfo = await getFileInfo(req.params.id, tokenData.userId);
      if (!fileInfo) {
        return res.status(404).json({ error: "File not found" });
      }

      res.json(fileInfo);
    } catch (error) {
      console.error("Error getting WOPI file info:", error);
      res.status(500).json({ error: "Failed to get file info" });
    }
  });

  router.get("/api/wopi/files/:id/contents", async (req: Request, res: Response) => {
    try {
      const { validateAccessToken } = await import("../services/wopi-host-service");
      const accessToken = req.query.access_token as string;
      
      if (!accessToken) {
        return res.status(401).json({ error: "Access token required" });
      }
      
      const tokenData = validateAccessToken(accessToken);
      if (!tokenData) {
        return res.status(401).json({ error: "Invalid or expired access token" });
      }

      if (tokenData.fileId !== req.params.id) {
        return res.status(403).json({ error: "Token not authorized for this document" });
      }

      const doc = await storage.getDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: "File not found" });
      }

      const content = doc.plainContent || doc.encryptedContent || "";
      res.setHeader("Content-Type", doc.mimeType || "application/octet-stream");
      res.send(Buffer.from(content, "base64"));
    } catch (error) {
      console.error("Error getting WOPI file contents:", error);
      res.status(500).json({ error: "Failed to get file contents" });
    }
  });

  router.post("/api/wopi/token/:documentId", async (req: Request, res: Response) => {
    try {
      const { generateAccessToken, isOfficeDocument } = await import("../services/wopi-host-service");
      const doc = await storage.getDocument(req.params.documentId);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }

      if (!isOfficeDocument(doc.name)) {
        return res.status(400).json({ error: "Not a supported Office document" });
      }

      const userId = (req.session as any)?.passport?.user?.id || "anonymous";
      const canWrite = req.body?.readOnly !== true;
      const token = generateAccessToken(userId, req.params.documentId, canWrite);

      res.json({
        accessToken: token.token,
        tokenTtl: token.tokenTtl,
        wopiSrc: `${req.protocol}://${req.get("host")}/api/wopi/files/${req.params.documentId}`,
      });
    } catch (error) {
      console.error("Error generating WOPI token:", error);
      res.status(500).json({ error: "Failed to generate access token" });
    }
  });

  router.post("/api/wopi/files/:id/contents", async (req: Request, res: Response) => {
    try {
      const { validateAccessToken, putFile } = await import("../services/wopi-host-service");
      const accessToken = req.query.access_token as string;

      if (!accessToken) {
        return res.status(401).json({ error: "Access token required" });
      }

      const tokenData = validateAccessToken(accessToken);
      if (!tokenData) {
        return res.status(401).json({ error: "Invalid or expired access token" });
      }

      if (tokenData.fileId !== req.params.id) {
        return res.status(403).json({ error: "Token not authorized for this document" });
      }

      if (!tokenData.permissions.includes("edit")) {
        return res.status(403).json({ error: "Write permission required" });
      }

      const lockId = req.headers["x-wopi-lock"] as string || null;
      const doc = await storage.getDocument(req.params.id);
      const tenantId = doc?.tenantId || "";

      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      await new Promise<void>((resolve) => req.on("end", resolve));
      const content = Buffer.concat(chunks);

      const result = await putFile(req.params.id, lockId, content, tokenData.userId, tenantId);
      if (!result.success) {
        res.setHeader("X-WOPI-Lock", result.error || "");
        return res.status(result.statusCode).json({ error: result.error });
      }

      res.setHeader("X-WOPI-ItemVersion", result.version || "");
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("WOPI PutFile error:", error);
      res.status(500).json({ error: "Failed to save file" });
    }
  });

  router.post("/api/wopi/files/:id", async (req: Request, res: Response) => {
    try {
      const { validateAccessToken, lockFile, unlockFile, refreshLock, unlockAndRelock, getLock, deleteFile, renameFile } = await import("../services/wopi-host-service");
      const accessToken = req.query.access_token as string;

      if (!accessToken) {
        return res.status(401).json({ error: "Access token required" });
      }

      const tokenData = validateAccessToken(accessToken);
      if (!tokenData) {
        return res.status(401).json({ error: "Invalid or expired access token" });
      }

      if (tokenData.fileId !== req.params.id) {
        return res.status(403).json({ error: "Token not authorized for this document" });
      }

      const override = req.headers["x-wopi-override"] as string;
      const lockId = req.headers["x-wopi-lock"] as string || "";
      const oldLockId = req.headers["x-wopi-oldlock"] as string || "";
      const doc = await storage.getDocument(req.params.id);
      const tenantId = doc?.tenantId || "";

      let result;

      switch (override) {
        case "LOCK": {
          if (oldLockId) {
            result = await unlockAndRelock(req.params.id, oldLockId, lockId, tokenData.userId, tenantId);
          } else {
            result = await lockFile(req.params.id, lockId, tokenData.userId, tenantId);
          }
          break;
        }
        case "UNLOCK": {
          result = await unlockFile(req.params.id, lockId, tokenData.userId, tenantId);
          break;
        }
        case "REFRESH_LOCK": {
          result = await refreshLock(req.params.id, lockId, tokenData.userId, tenantId);
          break;
        }
        case "GET_LOCK": {
          result = await getLock(req.params.id);
          break;
        }
        case "DELETE": {
          const delResult = await deleteFile(req.params.id, lockId || null, tokenData.userId, tenantId);
          if (!delResult.success) {
            res.setHeader("X-WOPI-Lock", delResult.error || "");
            return res.status(delResult.statusCode).json({ error: delResult.error });
          }
          return res.status(200).json({ success: true });
        }
        case "RENAME_FILE": {
          const newName = req.headers["x-wopi-requestedname"] as string || "";
          const renResult = await renameFile(req.params.id, lockId || null, newName, tokenData.userId, tenantId);
          if (!renResult.success) {
            return res.status(renResult.statusCode).json({ error: renResult.error });
          }
          return res.status(200).json({ Name: renResult.name });
        }
        default:
          return res.status(501).json({ error: `Unsupported WOPI override: ${override}` });
      }

      if (!result.success) {
        res.setHeader("X-WOPI-Lock", result.existingLockId || "");
        return res.status(result.statusCode).json({ error: result.error });
      }

      res.setHeader("X-WOPI-Lock", result.lockId || "");
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("WOPI operation error:", error);
      res.status(500).json({ error: "WOPI operation failed" });
    }
  });

  router.get("/api/wopi/files/:id/share", async (req: Request, res: Response) => {
    try {
      const { validateAccessToken, getShareUrl } = await import("../services/wopi-host-service");
      const accessToken = req.query.access_token as string;

      if (!accessToken) {
        return res.status(401).json({ error: "Access token required" });
      }

      const tokenData = validateAccessToken(accessToken);
      if (!tokenData) {
        return res.status(401).json({ error: "Invalid or expired access token" });
      }

      const doc = await storage.getDocument(req.params.id);
      const tenantId = doc?.tenantId || "";

      const result = await getShareUrl(req.params.id, tokenData.userId, tenantId);
      if (!result) {
        return res.status(404).json({ error: "File not found" });
      }

      res.json({ ShareUrl: result.url });
    } catch (error) {
      console.error("WOPI GetShareUrl error:", error);
      res.status(500).json({ error: "Failed to get share URL" });
    }
  });

  router.get("/api/wopi/discovery", async (_req: Request, res: Response) => {
    try {
      const { getOfficeOnlineUrl } = await import("../services/wopi-host-service");
      const discovery = {
        supportedExtensions: ["docx", "doc", "xlsx", "xls", "pptx", "ppt"],
        actions: [
          { ext: "docx", name: "view", url: getOfficeOnlineUrl("docx", "view") },
          { ext: "docx", name: "edit", url: getOfficeOnlineUrl("docx", "edit") },
          { ext: "xlsx", name: "view", url: getOfficeOnlineUrl("xlsx", "view") },
          { ext: "xlsx", name: "edit", url: getOfficeOnlineUrl("xlsx", "edit") },
          { ext: "pptx", name: "view", url: getOfficeOnlineUrl("pptx", "view") },
          { ext: "pptx", name: "edit", url: getOfficeOnlineUrl("pptx", "edit") },
        ],
      };
      res.json(discovery);
    } catch (error) {
      console.error("WOPI Discovery error:", error);
      res.status(500).json({ error: "Failed to get WOPI discovery" });
    }
  });

  return router;
}
