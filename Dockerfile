# ─── Stage 1 : Build ───────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

COPY . .

# Read app name from package.json and write it to a file for stage 2
RUN node -e "const p = require('./package.json'); require('fs').writeFileSync('.app-name', p.name);"

# Guard + reset deployedAt before build
RUN node -e " \
  const fs = require('fs'); \
  const path = 'public/config.json'; \
  if (!fs.existsSync(path)) { \
    console.error('❌ config.json not found at ' + path + ' — aborting build.'); \
    process.exit(1); \
  } \
  const config = JSON.parse(fs.readFileSync(path, 'utf8')); \
  config.deployedAt = null; \
  fs.writeFileSync(path, JSON.stringify(config, null, 2) + '\n'); \
  console.log('✅ config.json ready:', JSON.stringify(config)); \
"

RUN npm run build

# ─── Stage 2 : Serve ───────────────────────────────────────────────
FROM nginx:alpine AS runner

RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy app name file and the full dist folder
COPY --from=builder /app/.app-name /etc/app-name
COPY --from=builder /app/dist /app/dist

COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

CMD ["/entrypoint.sh"]
