import { Router, Request, Response } from "express";
import { getPlenumNetClient } from "../integrations/plenum-net-core-client";
import type { TritA, Representation } from "../plenumnet/ternary-types";
import { encryptExistingData, getEncryptionStatus } from "../security/encrypt-migration";

function serializeBigInts(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInts);
  if (typeof obj === "object") {
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = serializeBigInts(obj[key]);
      }
    }
    return result;
  }
  return obj;
}

function jsonSafe(res: Response, data: any) {
  res.json(serializeBigInts(data));
}

export function createPlenumNetRouter(): Router {
  const router = Router();

  router.get("/api/plenumnet/health", (_req: Request, res: Response) => {
    const client = getPlenumNetClient();
    jsonSafe(res, client.healthCheck());
  });

  router.get("/api/plenumnet/timestamp", (_req: Request, res: Response) => {
    const client = getPlenumNetClient();
    jsonSafe(res, client.getFemtosecondTimestamp());
  });

  router.get("/api/plenumnet/timing-metrics", (_req: Request, res: Response) => {
    const client = getPlenumNetClient();
    jsonSafe(res, client.getTimingMetrics());
  });

  router.get("/api/plenumnet/timing/self-test", (req: Request, res: Response) => {
    const sampleCount = parseInt(String(req.query.samples || "1000"), 10);
    const clampedCount = Math.min(Math.max(sampleCount, 10), 10000);
    const client = getPlenumNetClient();
    jsonSafe(res, client.runTimingSelfTest(clampedCount));
  });

  router.get("/api/plenumnet/timing/batch/:count", (req: Request, res: Response) => {
    const count = parseInt(String(req.params.count), 10);
    if (isNaN(count) || count <= 0 || count > 1000) {
      return res.status(400).json({ error: "Count must be between 1 and 1000" });
    }
    const client = getPlenumNetClient();
    jsonSafe(res, { count, timestamps: client.generateTimestampBatch(count) });
  });

  router.post("/api/plenumnet/ternary/add", (req: Request, res: Response) => {
    const { a, b } = req.body;
    if (a === undefined || b === undefined) {
      return res.status(400).json({ error: "Both 'a' and 'b' trit values required (-1, 0, 1)" });
    }
    const client = getPlenumNetClient();
    jsonSafe(res, client.ternaryAdd(a as TritA, b as TritA));
  });

  router.post("/api/plenumnet/ternary/multiply", (req: Request, res: Response) => {
    const { a, b } = req.body;
    if (a === undefined || b === undefined) {
      return res.status(400).json({ error: "Both 'a' and 'b' trit values required (-1, 0, 1)" });
    }
    const client = getPlenumNetClient();
    jsonSafe(res, client.ternaryMultiply(a as TritA, b as TritA));
  });

  router.post("/api/plenumnet/ternary/rotate", (req: Request, res: Response) => {
    const { value, steps } = req.body;
    if (value === undefined) {
      return res.status(400).json({ error: "Trit value required (-1, 0, 1)" });
    }
    const client = getPlenumNetClient();
    jsonSafe(res, client.ternaryRotate(value as TritA, steps || 1));
  });

  router.post("/api/plenumnet/ternary/xor", (req: Request, res: Response) => {
    const { a, b } = req.body;
    if (a === undefined || b === undefined) {
      return res.status(400).json({ error: "Both 'a' and 'b' trit values required" });
    }
    const client = getPlenumNetClient();
    jsonSafe(res, client.ternaryXor(a as TritA, b as TritA));
  });

  router.post("/api/plenumnet/ternary/not", (req: Request, res: Response) => {
    const { value } = req.body;
    if (value === undefined) {
      return res.status(400).json({ error: "Trit value required (-1, 0, 1)" });
    }
    const client = getPlenumNetClient();
    jsonSafe(res, client.ternaryNot(value as TritA));
  });

  router.post("/api/plenumnet/ternary/batch-add", (req: Request, res: Response) => {
    const { pairs } = req.body;
    if (!Array.isArray(pairs) || pairs.length === 0) {
      return res.status(400).json({ error: "Array of {a, b} pairs required" });
    }
    if (pairs.length > 1000) {
      return res.status(400).json({ error: "Maximum 1000 pairs per batch" });
    }
    const client = getPlenumNetClient();
    jsonSafe(res, { count: pairs.length, results: client.batchTernaryAdd(pairs) });
  });

  router.post("/api/plenumnet/ternary/convert", (req: Request, res: Response) => {
    const { value, from, to } = req.body;
    if (value === undefined || !from || !to) {
      return res.status(400).json({ error: "value, from (A/B/C), and to (A/B/C) required" });
    }
    const client = getPlenumNetClient();
    jsonSafe(res, client.convertTrit(value, from as Representation, to as Representation));
  });

  router.get("/api/plenumnet/ternary/density/:tritCount", (req: Request, res: Response) => {
    const tritCount = parseInt(String(req.params.tritCount), 10);
    if (isNaN(tritCount) || tritCount <= 0) {
      return res.status(400).json({ error: "Valid trit count required" });
    }
    const client = getPlenumNetClient();
    jsonSafe(res, client.calculateInformationDensity(tritCount));
  });

  router.get("/api/plenumnet/ternary/density-benchmark", (_req: Request, res: Response) => {
    const client = getPlenumNetClient();
    jsonSafe(res, client.runDensityBenchmark());
  });

  router.post("/api/plenumnet/phase/encrypt", (req: Request, res: Response) => {
    const { data, mode } = req.body;
    if (!data) {
      return res.status(400).json({ error: "Data string required" });
    }
    const client = getPlenumNetClient();
    jsonSafe(res, client.phaseEncrypt(data, mode));
  });

  router.post("/api/plenumnet/phase/decrypt", (req: Request, res: Response) => {
    const { encrypted } = req.body;
    if (!encrypted) {
      return res.status(400).json({ error: "Encrypted phase data required" });
    }

    const rebuildBigInts = (obj: any) => {
      if (obj.primaryPhase?.timestamp) {
        obj.primaryPhase.timestamp.femtoseconds = BigInt(obj.primaryPhase.timestamp.femtoseconds);
        obj.primaryPhase.timestamp.salviEpochOffset = BigInt(obj.primaryPhase.timestamp.salviEpochOffset);
      }
      if (obj.secondaryPhase?.timestamp) {
        obj.secondaryPhase.timestamp.femtoseconds = BigInt(obj.secondaryPhase.timestamp.femtoseconds);
        obj.secondaryPhase.timestamp.salviEpochOffset = BigInt(obj.secondaryPhase.timestamp.salviEpochOffset);
      }
      if (obj.guardianPhase?.timestamp) {
        obj.guardianPhase.timestamp.femtoseconds = BigInt(obj.guardianPhase.timestamp.femtoseconds);
        obj.guardianPhase.timestamp.salviEpochOffset = BigInt(obj.guardianPhase.timestamp.salviEpochOffset);
      }
      return obj;
    };

    const client = getPlenumNetClient();
    jsonSafe(res, client.phaseDecrypt(rebuildBigInts(encrypted)));
  });

  router.post("/api/plenumnet/encode", (req: Request, res: Response) => {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: "Data string required" });
    }
    const client = getPlenumNetClient();
    jsonSafe(res, client.compress(data));
  });

  router.post("/api/plenumnet/hash", (req: Request, res: Response) => {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: "Data string required" });
    }
    const client = getPlenumNetClient();
    const hash = client.computeTernaryHash(data);
    res.json({ data, hash });
  });

  router.get("/api/plenumnet/security-mode", (req: Request, res: Response) => {
    const requested = typeof req.query.mode === "string" ? req.query.mode : undefined;
    const client = getPlenumNetClient();
    const mode = client.resolveSecurityMode(requested);
    const headers = client.getSecurityHeaders(mode);
    res.json({ mode, headers });
  });

  router.get("/api/plenumnet/cnsa/compliance", (_req: Request, res: Response) => {
    const client = getPlenumNetClient();
    res.json(client.getCnsaCompliance());
  });

  router.get("/api/plenumnet/cnsa/by-category", (_req: Request, res: Response) => {
    const client = getPlenumNetClient();
    res.json(client.getCnsaByCategory());
  });

  router.get("/api/plenumnet/tribonacci", (_req: Request, res: Response) => {
    const client = getPlenumNetClient();
    jsonSafe(res, client.getTribonacciConstants());
  });

  router.get("/api/plenumnet/demo-operations", (_req: Request, res: Response) => {
    const client = getPlenumNetClient();

    const addResults = [
      client.ternaryAdd(-1 as TritA, -1 as TritA),
      client.ternaryAdd(-1 as TritA, 0 as TritA),
      client.ternaryAdd(-1 as TritA, 1 as TritA),
      client.ternaryAdd(0 as TritA, 0 as TritA),
      client.ternaryAdd(0 as TritA, 1 as TritA),
      client.ternaryAdd(1 as TritA, 1 as TritA),
    ];

    const multiplyResults = [
      client.ternaryMultiply(-1 as TritA, -1 as TritA),
      client.ternaryMultiply(-1 as TritA, 0 as TritA),
      client.ternaryMultiply(-1 as TritA, 1 as TritA),
      client.ternaryMultiply(0 as TritA, 1 as TritA),
      client.ternaryMultiply(1 as TritA, 1 as TritA),
    ];

    const rotateResults = [
      client.ternaryRotate(-1 as TritA, 1),
      client.ternaryRotate(0 as TritA, 1),
      client.ternaryRotate(1 as TritA, 1),
    ];

    const density = client.calculateInformationDensity(100);

    const phaseEncryptDemo = client.phaseEncrypt("PlenumNET Security Test", "balanced");
    const decryptResult = client.phaseDecrypt(phaseEncryptDemo.encrypted);

    const compressionDemo = client.compress("The Maestro Construction ERP PlenumNET Security Framework");

    const hashDemo = client.computeTernaryHash("PlenumNET v4.0.0");

    const timestamp = client.getFemtosecondTimestamp();

    const cnsaSummary = client.getCnsaCompliance();

    jsonSafe(res, {
      ternaryArithmetic: { addition: addResults, multiplication: multiplyResults, rotation: rotateResults },
      informationDensity: density,
      phaseEncryption: {
        mode: phaseEncryptDemo.mode,
        recombinationSuccess: decryptResult.success,
        phaseAlignment: decryptResult.phaseAlignment,
        guardianValidation: decryptResult.guardianValidation,
      },
      ternaryCompression: compressionDemo,
      ternaryHash: hashDemo,
      femtosecondTiming: {
        iso: timestamp.iso,
        humanReadable: timestamp.humanReadable,
        precision: timestamp.precision,
        value: timestamp.value,
      },
      cnsaCompliance: {
        coverage: `${cnsaSummary.implementedCount}/${cnsaSummary.totalAlgorithms}`,
        coveragePercent: cnsaSummary.coveragePercent,
        fipsTarget: cnsaSummary.fipsTarget,
      },
    });
  });

  router.get("/api/plenumnet/encryption/status", async (_req: Request, res: Response) => {
    try {
      const status = await getEncryptionStatus();
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/api/plenumnet/encryption/migrate", async (_req: Request, res: Response) => {
    try {
      const result = await encryptExistingData();
      jsonSafe(res, result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
