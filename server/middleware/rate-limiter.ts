import rateLimit from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

const PLAN_RATE_LIMITS: Record<string, { windowMs: number; max: number }> = {
  essentials: { windowMs: 60_000, max: 100 },
  professional: { windowMs: 60_000, max: 500 },
  enterprise: { windowMs: 60_000, max: 2000 },
  "quantum-enterprise": { windowMs: 60_000, max: 10000 },
  default: { windowMs: 60_000, max: 60 },
};

function extractTenantId(req: Request): string {
  const tenantId =
    (req.headers["x-tenant-id"] as string) ||
    (req.query.tenantId as string) ||
    "default";
  return tenantId;
}

export const globalApiLimiter = rateLimit({
  windowMs: 60_000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  keyGenerator: (req: Request) => {
    return (
      (req.user as any)?.id ||
      req.ip ||
      "anonymous"
    );
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again later." },
});

export const webhookLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many webhook requests." },
});

export const plenumnetLimiter = rateLimit({
  windowMs: 60_000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "PlenumNET rate limit exceeded." },
  keyGenerator: (req: Request) => {
    return extractTenantId(req);
  },
});

export async function tenantAwareRateLimiter(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = extractTenantId(req);
    if (tenantId === "default") {
      return globalApiLimiter(req, res, next);
    }

    const sub = await storage.getTenantSubscription(tenantId);
    let planCode = "default";
    if (sub) {
      const plans = await storage.getSubscriptionPlans();
      const plan = plans.find(p => p.id === sub.planId);
      planCode = plan?.code ?? "default";
    }

    const limits = PLAN_RATE_LIMITS[planCode] || PLAN_RATE_LIMITS.default;

    const limiter = rateLimit({
      windowMs: limits.windowMs,
      max: limits.max,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: "Rate limit exceeded for your plan tier.",
        plan: planCode,
        limit: limits.max,
        windowMs: limits.windowMs,
      },
      keyGenerator: () => tenantId,
    });

    return limiter(req, res, next);
  } catch {
    return next();
  }
}
