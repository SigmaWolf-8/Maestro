import { randomUUID } from "crypto";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function parseCurrency(val: string | undefined | null): string | null {
  if (!val || val.trim() === "") return null;
  const cleaned = val.replace(/[$,]/g, "").trim();
  if (cleaned === "" || isNaN(parseFloat(cleaned))) return null;
  return cleaned;
}

function parseDate(val: string | undefined | null): Date | null {
  if (!val || val.trim() === "") return null;
  const d = new Date(val.trim());
  return isNaN(d.getTime()) ? null : d;
}

function parseBool(val: string | undefined | null): boolean {
  if (!val) return false;
  return val.trim().toLowerCase() === "yes";
}

function parseDecimal(val: string | undefined | null): string | null {
  if (!val || val.trim() === "") return null;
  const cleaned = val.replace(/[$,]/g, "").trim();
  if (cleaned === "" || cleaned === "*" || isNaN(parseFloat(cleaned))) return null;
  return cleaned;
}

function parseTSV(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter(l => l.trim() !== "");
  if (lines.length === 0) return [];
  
  const headers = lines[0].split("\t").map(h => h.trim());
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (cols[j] || "").trim();
    }
    rows.push(row);
  }
  return rows;
}

async function main() {
  const pmItemsFile = path.resolve(__dirname, "../../attached_assets/Pasted-ID-Title-SortNum-PS-ProductNum-OldPriceEffective-OldPri_1771810683255.txt");
  const pmCompileFile = path.resolve(__dirname, "../../attached_assets/Pasted-ID-Title-SortNum-PS-Vendor-PSSub-SubVendor-Quantity-Qno_1771810768632.txt");

  console.log("Parsing PM Items TSV...");
  const pmRows = parseTSV(pmItemsFile);
  console.log(`Parsed ${pmRows.length} PM items`);

  console.log("Parsing PM Compile Items TSV...");
  const compileRows = parseTSV(pmCompileFile);
  console.log(`Parsed ${compileRows.length} PM compile items`);

  const { rows: tenants } = await pool.query("SELECT id FROM tenants");
  console.log(`Found ${tenants.length} tenants`);

  const now = new Date();

  for (const tenant of tenants) {
    const tid = tenant.id;
    
    await pool.query("DELETE FROM pm_compile_items WHERE tenant_id = $1", [tid]);
    await pool.query("DELETE FROM pm_items WHERE tenant_id = $1", [tid]);
    console.log(`Cleared old data for tenant ${tid}`);

    // Insert PM Items in batches
    const batchSize = 50;
    let inserted = 0;
    
    for (let i = 0; i < pmRows.length; i += batchSize) {
      const batch = pmRows.slice(i, i + batchSize);
      const values: any[] = [];
      const placeholders: string[] = [];
      let paramIdx = 1;

      for (const row of batch) {
        const ps = row["PS"] || "";
        const vendor = row["Vendor"] || "";
        if (!ps || !vendor) continue;

        const nCols = 20;
        const phs = Array.from({length: nCols}, (_, k) => `$${paramIdx + k}`).join(",");
        placeholders.push(`(${phs})`);
        values.push(
          randomUUID(),
          tid,
          row["Title"] || null,
          parseInt(row["SortNum"]) || 0,
          ps,
          row["ProductNum"] || null,
          row["SKU"] || null,
          parseCurrency(row["OldPrice"]),
          parseDate(row["OldPriceEffective"]),
          parseCurrency(row["Price"]),
          parseDecimal(row["MU"]),
          parseDate(row["LastUpdate"]),
          parseCurrency(row["NewUpdate"]),
          parseDate(row["Effective"]),
          row["Comments"] || null,
          vendor,
          row["Category"] || null,
          parseBool(row["PUP"]),
          parseBool(row["PMCompile"]),
          parseCurrency(row["SellPrice"])
        );
        paramIdx += nCols;
      }

      if (placeholders.length > 0) {
        await pool.query(
          `INSERT INTO pm_items (id, tenant_id, title, sort_num, ps, product_num, sku, old_price, old_price_effective, price, mu, last_update, new_update, effective, comments, vendor, category, pup, pm_compile, sell_price)
           VALUES ${placeholders.join(",")}`,
          values
        );
        inserted += placeholders.length;
      }
    }
    console.log(`Inserted ${inserted} PM items for tenant ${tid}`);

    // Insert PM Compile Items in batches
    let compileInserted = 0;
    
    for (let i = 0; i < compileRows.length; i += batchSize) {
      const batch = compileRows.slice(i, i + batchSize);
      const values: any[] = [];
      const placeholders: string[] = [];
      let paramIdx = 1;

      for (const row of batch) {
        const ps = row["PS"] || "";
        const psSub = row["PSSub"] || "";
        const vendor = row["Vendor"] || "";
        
        if (!ps) continue;

        const nCols = 21;
        const phs = Array.from({length: nCols}, (_, k) => `$${paramIdx + k}`).join(",");
        placeholders.push(`(${phs})`);
        values.push(
          randomUUID(),
          tid,
          row["Title"] || null,
          parseInt(row["SortNum"]) || 0,
          ps,
          psSub || ps,
          vendor || null,
          row["SubVendor"] || null,
          parseDecimal(row["Quantity"]),
          row["Qnotes"] || row["QNotes"] || null,
          row["ExpressionValue"] || null,
          parseCurrency(row["Price"]),
          parseCurrency(row["Subtotal"]),
          row["ExpressionValue2"] || null,
          parseDecimal(row["Quantity2"]),
          row["QNotes2"] || null,
          parseCurrency(row["Subtotal2"]),
          row["ExpressionValue3"] || null,
          parseDecimal(row["Quantity3"]),
          row["QNotes3"] || null,
          parseCurrency(row["LineTotal"])
        );
        paramIdx += nCols;
      }

      if (placeholders.length > 0) {
        await pool.query(
          `INSERT INTO pm_compile_items (id, tenant_id, title, sort_num, ps, ps_sub, vendor, sub_vendor, quantity, q_notes, expression_value, price, subtotal, expression_value_2, quantity_2, q_notes_2, subtotal_2, expression_value_3, quantity_3, q_notes_3, line_total)
           VALUES ${placeholders.join(",")}`,
          values
        );
        compileInserted += placeholders.length;
      }
    }
    console.log(`Inserted ${compileInserted} PM compile items for tenant ${tid}`);
  }

  // Summary
  const { rows: [pmCount] } = await pool.query("SELECT COUNT(*) as count FROM pm_items");
  const { rows: [compileCount] } = await pool.query("SELECT COUNT(*) as count FROM pm_compile_items");
  const { rows: [asmCount] } = await pool.query("SELECT COUNT(*) as count FROM pm_items WHERE pm_compile = true");
  
  console.log(`\n=== SEED COMPLETE ===`);
  console.log(`Total PM items: ${pmCount.count}`);
  console.log(`Total PM compile (assembly child) items: ${compileCount.count}`);
  console.log(`Items flagged as assemblies (PMCompile=Yes): ${asmCount.count}`);
  console.log(`Tenants: ${tenants.length}`);
  
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
