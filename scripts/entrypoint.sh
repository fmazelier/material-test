#!/bin/sh
set -e

# ─── Resolve app name ─────────────────────────────────────────────
APP_NAME=$(cat /etc/app-name)
CONFIG_PATH="/usr/share/nginx/html/app/config.json"
BASE_HREF=$(cat /etc/base-href)

echo ""
echo "  🚀 Starting ${APP_NAME}"
echo "  📂 Config  : ${CONFIG_PATH}"
echo "  🔗 BaseHref: ${BASE_HREF}"
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

# ─── Generate nginx conf ──────────────────────────────────────────
sed "s|\${BASE_HREF}|${BASE_HREF}|g" \
  /etc/nginx/conf.d/nginx.template \
  > /etc/nginx/conf.d/default.conf
echo "  ✅ nginx.conf generated for base href: ${BASE_HREF}"

# ─── Start nginx ──────────────────────────────────────────────────
echo ""
echo "  🌐 Starting nginx..."
echo ""
exec nginx -g "daemon off;"
