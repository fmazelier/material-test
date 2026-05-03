# ─── Stage 1 : Build ───────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

# Copy source files
COPY . .

# Inject deployedAt into config.json right before the Angular build
# Fails the build explicitly if config.json is missing
RUN node -e " \
  const fs = require('fs'); \
  const path = 'public/config.json'; \
  if (!fs.existsSync(path)) { \
    console.error('❌ config.json not found at ' + path + ' — aborting build.'); \
    process.exit(1); \
  } \
  const config = JSON.parse(fs.readFileSync(path, 'utf8')); \
  config.deployedAt = new Date().toISOString(); \
  fs.writeFileSync(path, JSON.stringify(config, null, 2) + '\n'); \
  console.log('✅ config.json patched:', JSON.stringify(config)); \
"

RUN npm run build

# ─── Stage 2 : Serve ───────────────────────────────────────────────
FROM nginx:alpine AS runner

# Delete default nginx config
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the Angular build (adapt "material-test" to the name in angular.json)
COPY --from=builder /app/dist/material-test/browser /usr/share/nginx/html/material-test

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

