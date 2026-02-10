#!/usr/bin/env node
import { randomUUID } from "crypto";

const BASE_URL = process.env.WOPI_HOST_URL || "http://localhost:5000";

const WOPI_ENDPOINTS = [
  { method: "GET", path: "/wopi/discovery", name: "WOPI Discovery" },
  { method: "GET", path: "/wopi/files/{id}", name: "CheckFileInfo" },
  { method: "GET", path: "/wopi/files/{id}/contents", name: "GetFile" },
  { method: "POST", path: "/wopi/files/{id}/contents", name: "PutFile" },
  { method: "POST", path: "/wopi/files/{id}/lock", name: "Lock" },
  { method: "POST", path: "/wopi/files/{id}/unlock", name: "Unlock" },
  { method: "POST", path: "/wopi/files/{id}/refreshlock", name: "RefreshLock" },
  { method: "POST", path: "/wopi/files/{id}/unlockAndRelock", name: "UnlockAndRelock" },
  { method: "GET", path: "/wopi/files/{id}/lock", name: "GetLock" },
  { method: "POST", path: "/wopi/files/{id}/delete", name: "DeleteFile" },
  { method: "POST", path: "/wopi/files/{id}/rename", name: "RenameFile" },
  { method: "GET", path: "/wopi/files/{id}/shareurl", name: "GetShareUrl" },
];

async function validateEndpoint(endpoint, testFileId) {
  const url = `${BASE_URL}${endpoint.path.replace("{id}", testFileId)}`;
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: endpoint.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer test-token`,
      },
      signal: AbortSignal.timeout(10000),
    });

    const elapsed = Date.now() - startTime;
    const status = response.status;

    const isExpectedStatus =
      status === 200 ||
      status === 401 ||
      status === 404 ||
      status === 409 ||
      status === 501;

    return {
      name: endpoint.name,
      method: endpoint.method,
      path: endpoint.path,
      status,
      elapsed,
      success: isExpectedStatus,
      note: status === 401 ? "Auth required (expected)" : status === 501 ? "Not implemented" : "",
    };
  } catch (err) {
    return {
      name: endpoint.name,
      method: endpoint.method,
      path: endpoint.path,
      status: 0,
      elapsed: Date.now() - startTime,
      success: false,
      note: `Error: ${err.message}`,
    };
  }
}

async function main() {
  console.log("WOPI Host Endpoint Validator");
  console.log(`Target: ${BASE_URL}`);
  console.log("=".repeat(70));

  const testFileId = randomUUID();
  const results = [];

  for (const endpoint of WOPI_ENDPOINTS) {
    const result = await validateEndpoint(endpoint, testFileId);
    results.push(result);

    const statusIcon = result.success ? "\u2705" : "\u274C";
    const statusStr = result.status > 0 ? `${result.status}` : "ERR";
    console.log(
      `${statusIcon} ${result.method.padEnd(5)} ${result.name.padEnd(20)} ${statusStr.padEnd(5)} ${result.elapsed}ms ${result.note}`
    );
  }

  console.log("=".repeat(70));

  const passed = results.filter((r) => r.success).length;
  const total = results.length;
  console.log(`\nResults: ${passed}/${total} endpoints responding`);

  if (passed < total) {
    console.log("\nFailed endpoints:");
    results
      .filter((r) => !r.success)
      .forEach((r) => console.log(`  - ${r.name}: ${r.note}`));
  }

  process.exit(passed === total ? 0 : 1);
}

main().catch(console.error);
