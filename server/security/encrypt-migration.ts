import { db } from "../db";
import { sql } from "drizzle-orm";
import {
  tenants,
  tenantUsers,
  projects,
  wbsNodes,
  navigationItems,
  tenantApplications,
  wbsTemplates,
  userGroups,
  documents,
  wbsMasterCodes,
  documentMetaTags,
  customers,
  quotes,
  vendors,
  vendorContacts,
  employeeRoles,
  documentLocks,
  documentAuditLogs,
  wopiSessions,
  msGraphTokens,
  subscriptionPlans,
  tenantSubscriptions,
  subscriptionInvoices,
  pricingConfig,
  stripeSync,
  scheduleTaskTemplates,
  scheduleTasks,
} from "@shared/schema";
import { encryptField } from "../services/data-encryption-service";
import { ENCRYPTION_FIELD_MAP, ENCRYPTED_MARKER } from "./encryption-map";
import { eq } from "drizzle-orm";

const TABLE_REFS: Record<string, any> = {
  tenants,
  tenantUsers,
  projects,
  wbsNodes,
  navigationItems,
  tenantApplications,
  wbsTemplates,
  userGroups,
  documents,
  wbsMasterCodes,
  documentMetaTags,
  customers,
  quotes,
  vendors,
  vendorContacts,
  employeeRoles,
  documentLocks,
  documentAuditLogs,
  wopiSessions,
  msGraphTokens,
  subscriptionPlans,
  tenantSubscriptions,
  subscriptionInvoices,
  pricingConfig,
  stripeSync,
  scheduleTaskTemplates,
  scheduleTasks,
};

function isAlreadyEncrypted(value: string): boolean {
  if (!value.startsWith("{")) return false;
  try {
    const parsed = JSON.parse(value);
    return parsed && parsed.__marker === ENCRYPTED_MARKER;
  } catch {
    return false;
  }
}

export interface MigrationResult {
  table: string;
  totalRows: number;
  encryptedRows: number;
  skippedRows: number;
  errors: number;
}

export interface FullMigrationResult {
  success: boolean;
  tables: MigrationResult[];
  totalEncrypted: number;
  totalSkipped: number;
  totalErrors: number;
  durationMs: number;
}

export async function encryptExistingData(): Promise<FullMigrationResult> {
  const startTime = Date.now();
  const results: MigrationResult[] = [];
  let totalEncrypted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const [tableName, fields] of Object.entries(ENCRYPTION_FIELD_MAP)) {
    const tableRef = TABLE_REFS[tableName];
    if (!tableRef) {
      console.log(`[EncryptMigration] Table ${tableName} not found in refs, skipping`);
      continue;
    }

    const result: MigrationResult = {
      table: tableName,
      totalRows: 0,
      encryptedRows: 0,
      skippedRows: 0,
      errors: 0,
    };

    try {
      const rows = await db.select().from(tableRef);
      result.totalRows = rows.length;

      for (const row of rows) {
        let needsUpdate = false;
        const updates: Record<string, any> = {};

        for (const field of fields) {
          const value = (row as any)[field];
          if (value && typeof value === "string" && !isAlreadyEncrypted(value)) {
            const encrypted = encryptField(value);
            if (encrypted && encrypted !== value) {
              updates[field] = encrypted;
              needsUpdate = true;
            }
          }
        }

        if (needsUpdate) {
          try {
            const idField = tableRef.id;
            const rowId = (row as any).id;
            await db.update(tableRef).set(updates).where(eq(idField, rowId));
            result.encryptedRows++;
          } catch (err) {
            console.error(`[EncryptMigration] Error encrypting row in ${tableName}:`, err);
            result.errors++;
          }
        } else {
          result.skippedRows++;
        }
      }
    } catch (err) {
      console.error(`[EncryptMigration] Error processing table ${tableName}:`, err);
      result.errors++;
    }

    results.push(result);
    totalEncrypted += result.encryptedRows;
    totalSkipped += result.skippedRows;
    totalErrors += result.errors;

    console.log(
      `[EncryptMigration] ${tableName}: ${result.encryptedRows} encrypted, ${result.skippedRows} skipped, ${result.errors} errors`
    );
  }

  const durationMs = Date.now() - startTime;
  console.log(
    `[EncryptMigration] Complete: ${totalEncrypted} encrypted, ${totalSkipped} skipped, ${totalErrors} errors in ${durationMs}ms`
  );

  return {
    success: totalErrors === 0,
    tables: results,
    totalEncrypted,
    totalSkipped,
    totalErrors,
    durationMs,
  };
}

export async function getEncryptionStatus(): Promise<{
  tables: { name: string; totalRows: number; encryptedRows: number; plaintextRows: number }[];
}> {
  const tableStatus = [];

  for (const [tableName, fields] of Object.entries(ENCRYPTION_FIELD_MAP)) {
    const tableRef = TABLE_REFS[tableName];
    if (!tableRef) continue;

    try {
      const rows = await db.select().from(tableRef);
      let encryptedCount = 0;
      let plaintextCount = 0;

      for (const row of rows) {
        let hasPlaintext = false;
        let hasEncrypted = false;

        for (const field of fields) {
          const value = (row as any)[field];
          if (value && typeof value === "string") {
            if (isAlreadyEncrypted(value)) {
              hasEncrypted = true;
            } else {
              hasPlaintext = true;
            }
          }
        }

        if (hasEncrypted && !hasPlaintext) encryptedCount++;
        else if (hasPlaintext) plaintextCount++;
      }

      tableStatus.push({
        name: tableName,
        totalRows: rows.length,
        encryptedRows: encryptedCount,
        plaintextRows: plaintextCount,
      });
    } catch {
      tableStatus.push({
        name: tableName,
        totalRows: 0,
        encryptedRows: 0,
        plaintextRows: 0,
      });
    }
  }

  return { tables: tableStatus };
}
