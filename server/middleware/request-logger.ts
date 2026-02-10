import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export interface RequestLog {
  correlationId: string;
  method: string;
  path: string;
  tenantId: string;
  userId: string;
  statusCode: number;
  durationMs: number;
  timestamp: string;
  userAgent: string;
  ip: string;
  error?: string;
  errorType?: string;
}

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      requestStartTime?: [number, number];
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const correlationId = (req.headers["x-correlation-id"] as string) || crypto.randomUUID();
  req.correlationId = correlationId;
  req.requestStartTime = process.hrtime();

  res.setHeader("X-Correlation-ID", correlationId);

  const originalEnd = res.end;
  res.end = function (...args: any[]) {
    const hrDuration = process.hrtime(req.requestStartTime);
    const durationMs = Math.round(hrDuration[0] * 1000 + hrDuration[1] / 1_000_000);

    const log: RequestLog = {
      correlationId,
      method: req.method,
      path: req.originalUrl || req.path,
      tenantId: (req.headers["x-tenant-id"] as string) || "default",
      userId: (req.user as any)?.id || "anonymous",
      statusCode: res.statusCode,
      durationMs,
      timestamp: new Date().toISOString(),
      userAgent: req.headers["user-agent"] || "",
      ip: req.ip || req.socket.remoteAddress || "",
    };

    if (res.statusCode >= 400) {
      log.errorType = classifyError(res.statusCode);
    }

    const level = res.statusCode >= 500 ? "ERROR" : res.statusCode >= 400 ? "WARN" : "INFO";

    if (req.path.startsWith("/api/")) {
      console.log(`[${level}] ${JSON.stringify(log)}`);
    }

    return (originalEnd as Function).apply(res, args);
  } as typeof res.end;

  next();
}

function classifyError(statusCode: number): string {
  switch (statusCode) {
    case 400: return "BAD_REQUEST";
    case 401: return "UNAUTHORIZED";
    case 403: return "FORBIDDEN";
    case 404: return "NOT_FOUND";
    case 409: return "CONFLICT";
    case 422: return "VALIDATION_ERROR";
    case 429: return "RATE_LIMITED";
    case 500: return "INTERNAL_ERROR";
    case 502: return "BAD_GATEWAY";
    case 503: return "SERVICE_UNAVAILABLE";
    default: return statusCode >= 500 ? "SERVER_ERROR" : "CLIENT_ERROR";
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const correlationId = req.correlationId || "unknown";

  console.error(`[ERROR] ${JSON.stringify({
    correlationId,
    error: err.message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    path: req.originalUrl || req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  })}`);

  if (res.headersSent) return;

  const statusCode = (err as any).statusCode || 500;
  res.status(statusCode).json({
    error: statusCode >= 500 ? "Internal server error" : err.message,
    correlationId,
    ...(process.env.NODE_ENV !== "production" && { details: err.message }),
  });
}
