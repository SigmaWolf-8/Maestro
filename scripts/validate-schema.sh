#!/bin/bash
set -euo pipefail

echo "=== The Maestro - Schema Validator ==="
echo ""

echo "Step 1: TypeScript compilation check..."
npx tsc --noEmit --skipLibCheck shared/schema.ts
echo "TypeScript: PASS"

echo ""
echo "Step 2: Checking barrel exports..."
DOMAINS=(tenants users projects wbs documents subscriptions billing)
for domain in "${DOMAINS[@]}"; do
  if [ -f "shared/schema/${domain}.ts" ]; then
    echo "  Domain '${domain}': EXISTS"
  else
    echo "  Domain '${domain}': MISSING"
    exit 1
  fi
done
echo "Barrel exports: PASS"

echo ""
echo "Step 3: Checking storage interface..."
if grep -q "IStorage" server/storage.ts; then
  echo "IStorage interface: PRESENT"
else
  echo "IStorage interface: MISSING"
  exit 1
fi

echo ""
echo "=== All schema validations passed ==="
