#!/bin/bash
set -e

KONG_ADMIN_URL="${KONG_ADMIN_URL:-http://localhost:8001}"

echo "=== Kong Gateway Configuration ==="
echo "Admin URL: $KONG_ADMIN_URL"
echo ""

echo "[1/3] Checking Kong connectivity..."
if ! curl -s "$KONG_ADMIN_URL/status" > /dev/null 2>&1; then
  echo "WARNING: Kong Admin API not reachable at $KONG_ADMIN_URL"
  echo "Kong configuration will be applied when gateway is available."
  exit 0
fi

echo "  Kong is reachable."

echo ""
echo "[2/3] Applying declarative config..."
if command -v deck > /dev/null 2>&1; then
  deck sync --kong-addr "$KONG_ADMIN_URL" --state kong/kong.yml
  echo "  Main config applied."

  if [ -f kong/wopi-bridge.yaml ]; then
    deck sync --kong-addr "$KONG_ADMIN_URL" --state kong/wopi-bridge.yaml
    echo "  WOPI bridge config applied."
  fi
else
  echo "  decK CLI not found. Applying via Admin API..."
  curl -s -X POST "$KONG_ADMIN_URL/config" \
    -F "config=@kong/kong.yml" \
    --header "Content-Type: multipart/form-data"
  echo "  Config applied via Admin API."
fi

echo ""
echo "[3/3] Verifying services..."
SERVICES=$(curl -s "$KONG_ADMIN_URL/services" | grep -o '"name":"[^"]*"' | wc -l)
echo "  Active services: $SERVICES"

echo ""
echo "=== Kong configuration complete ==="
