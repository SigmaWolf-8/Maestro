import { Router } from "express";
import { storage } from "../storage";
import { insertPmItemSchema, insertPmCompileItemSchema } from "@shared/schema";

const ALLOWED_ITEM_UPDATE_FIELDS = new Set([
  "title", "sortNum", "ps", "productNum", "sku", "oldPrice", "oldPriceEffective",
  "price", "mu", "lastUpdate", "newUpdate", "effective", "comments", "vendor",
  "category", "pup", "pmCompile", "sellPrice", "wbsCode", "archived",
]);

const ALLOWED_COMPILE_UPDATE_FIELDS = new Set([
  "title", "sortNum", "psSub", "subVendor", "quantity", "expressionValue",
  "quantity2", "expressionValue2", "quantity3", "expressionValue3",
  "price", "subtotal", "subtotal2", "lineTotal",
]);

function sanitizeUpdate(body: Record<string, any>, allowed: Set<string>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(body)) {
    if (allowed.has(key)) result[key] = body[key];
  }
  return result;
}

export function createPriceMasterRouter() {
  const router = Router();

  router.get("/api/price-master/items", async (req, res) => {
    try {
      const { tenantId, vendor, category, wbsCode, archived } = req.query;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const filters: any = {};
      if (vendor) filters.vendor = vendor as string;
      if (category) filters.category = category as string;
      if (wbsCode) filters.wbsCode = wbsCode as string;
      if (archived !== undefined) filters.archived = archived === "true";
      const items = await storage.getPmItems(tenantId as string, filters);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/api/price-master/items/:id", async (req, res) => {
    try {
      const { tenantId } = req.query;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const item = await storage.getPmItem(req.params.id);
      if (!item || item.tenantId !== tenantId) return res.status(404).json({ error: "Item not found" });
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/api/price-master/items", async (req, res) => {
    try {
      const parsed = insertPmItemSchema.parse(req.body);
      const item = await storage.createPmItem(parsed);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.patch("/api/price-master/items/:id", async (req, res) => {
    try {
      const { tenantId } = req.body;
      const item = await storage.getPmItem(req.params.id);
      if (!item) return res.status(404).json({ error: "Item not found" });
      if (tenantId && item.tenantId !== tenantId) return res.status(403).json({ error: "Access denied" });
      const sanitized = sanitizeUpdate(req.body, ALLOWED_ITEM_UPDATE_FIELDS);
      if (Object.keys(sanitized).length === 0) return res.status(400).json({ error: "No valid fields to update" });
      const updated = await storage.updatePmItem(req.params.id, sanitized);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete("/api/price-master/items/:id", async (req, res) => {
    try {
      const { tenantId } = req.query;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const item = await storage.getPmItem(req.params.id);
      if (!item || item.tenantId !== tenantId) return res.status(404).json({ error: "Item not found" });
      await storage.deletePmItem(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/api/price-master/vendors", async (req, res) => {
    try {
      const { tenantId } = req.query;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const vendors = await storage.getPmVendors(tenantId as string);
      res.json(vendors);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/api/price-master/categories", async (req, res) => {
    try {
      const { tenantId, vendor } = req.query;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const categories = await storage.getPmCategories(tenantId as string, vendor as string | undefined);
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/api/price-master/compile", async (req, res) => {
    try {
      const { tenantId, ps, vendor } = req.query;
      if (!tenantId || !ps) return res.status(400).json({ error: "tenantId and ps are required" });
      const items = await storage.getPmCompileItems(tenantId as string, ps as string, vendor as string | undefined);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/api/price-master/compile", async (req, res) => {
    try {
      const parsed = insertPmCompileItemSchema.parse(req.body);
      const item = await storage.createPmCompileItem(parsed);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.patch("/api/price-master/compile/:id", async (req, res) => {
    try {
      const { tenantId } = req.body;
      const item = await storage.getPmCompileItem(req.params.id);
      if (!item) return res.status(404).json({ error: "Item not found" });
      if (tenantId && item.tenantId !== tenantId) return res.status(403).json({ error: "Access denied" });
      const sanitized = sanitizeUpdate(req.body, ALLOWED_COMPILE_UPDATE_FIELDS);
      if (Object.keys(sanitized).length === 0) return res.status(400).json({ error: "No valid fields to update" });
      const updated = await storage.updatePmCompileItem(req.params.id, sanitized);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete("/api/price-master/compile/:id", async (req, res) => {
    try {
      const { tenantId } = req.query;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const item = await storage.getPmCompileItem(req.params.id);
      if (!item || item.tenantId !== tenantId) return res.status(404).json({ error: "Item not found" });
      await storage.deletePmCompileItem(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/api/price-master/calculate-compile", async (req, res) => {
    try {
      const { tenantId, ps, vendor } = req.body;
      if (!tenantId || !ps) return res.status(400).json({ error: "tenantId and ps are required" });
      const compileItems = await storage.getPmCompileItems(tenantId, ps, vendor);
      let total = 0;
      for (const item of compileItems) {
        const price = parseFloat(item.price || "0");
        const qty = parseFloat(item.quantity || "1");
        const expr = item.expressionValue || "0";
        let subtotal = price;
        if (expr === "*") subtotal = qty * price;
        else if (expr === "/") subtotal = qty / price;
        else if (expr === "+") subtotal = qty + price;
        else if (expr === "-") subtotal = qty - price;

        const qty2 = parseFloat(item.quantity2 || "1");
        const expr2 = item.expressionValue2 || "0";
        let subtotal2 = subtotal;
        if (expr2 === "*") subtotal2 = subtotal * qty2;
        else if (expr2 === "/") subtotal2 = subtotal / qty2;
        else if (expr2 === "+") subtotal2 = subtotal + qty2;
        else if (expr2 === "-") subtotal2 = subtotal - qty2;

        const qty3 = parseFloat(item.quantity3 || "1");
        const expr3 = item.expressionValue3 || "0";
        let lineTotal = subtotal2;
        if (expr3 === "*") lineTotal = subtotal2 * qty3;
        else if (expr3 === "/") lineTotal = subtotal2 / qty3;
        else if (expr3 === "+") lineTotal = subtotal2 + qty3;
        else if (expr3 === "-") lineTotal = subtotal2 - qty3;

        await storage.updatePmCompileItem(item.id, {
          subtotal: subtotal.toFixed(2),
          subtotal2: subtotal2.toFixed(2),
          lineTotal: lineTotal.toFixed(2),
        });
        total += lineTotal;
      }

      if (vendor) {
        const pmItem = (await storage.getPmItems(tenantId, { vendor }))
          .find(i => i.ps === ps);
        if (pmItem) {
          await storage.updatePmItem(pmItem.id, {
            price: total.toFixed(2),
            sellPrice: (total * parseFloat(pmItem.mu || "1")).toFixed(2),
          });
        }
      }

      res.json({ total: Math.round(total * 100) / 100, itemsCalculated: compileItems.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
