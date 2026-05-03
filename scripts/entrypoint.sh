#!/bin/sh
set -e

# ─── Resolve app name ─────────────────────────────────────────────
APP_NAME=$(cat /etc/app-name)
CONFIG_PATH="/app/dist/${APP_NAME}/browser/config.json"

echo ""
echo "  🚀 Starting ${APP_NAME}"
echo "  📂 Config path: ${CONFIG_PATH}"
echo ""

# ─── Guard: config.json must exist ────────────────────────────────
if [ ! -f "$CONFIG_PATH" ]; then
  echo "❌ config.json not found at ${CONFIG_PATH} — aborting."
  exit 1
fi

# ─── Inject API_URL if provided ───────────────────────────────────
if [ -n "$API_URL" ]; then
  sed -i "s|\"apiUrl\":.*|\"apiUrl\": \"${API_URL}\"|" "$CONFIG_PATH"
  echo "✅ apiUrl injected: ${API_URL}"
else
  echo "ℹ️  API_URL not set — keeping apiUrl from config.json"
fi

# ─── Inject deployedAt only if currently null ─────────────────────
CURRENT=$(grep '"deployedAt"' "$CONFIG_PATH" || echo "")
if echo "$CURRENT" | grep -q "null"; then
  DEPLOYED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  sed -i "s|\"deployedAt\": null|\"deployedAt\": \"${DEPLOYED_AT}\"|" "$CONFIG_PATH"
  echo "✅ deployedAt injected: ${DEPLOYED_AT}"
else
  echo "ℹ️  deployedAt already set — skipping (container restart detected)"
fi

# ─── Copy dist to nginx html folder ───────────────────────────────
cp -r /app/dist/${APP_NAME}/browser/. /usr/share/nginx/html/${APP_NAME}/

# ─── Hand off to nginx ─────────────────────────────────────────────
echo "  🌐 Starting nginx..."
exec nginx -g "daemon off;"
