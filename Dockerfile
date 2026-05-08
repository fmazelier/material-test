# ─── Stage 1: Build ────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies first to maximize Docker layer cache hits
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

# Copy build scripts before source to preserve cache when only source changes
COPY scripts ./scripts/
COPY . .

# Extract app name and base href from project config files
RUN node scripts/prepare-build.mjs

# Ensure config.json exists and reset deployedAt before build
RUN node scripts/guard-config.mjs

# Falls back to "build" if "build:ci" is not defined in package.json
RUN npm run build:ci 2>/dev/null || npm run build

# Extract the actual base href from the compiled index.html
RUN node scripts/post-build.mjs

# ─── Stage 2: Serve ────────────────────────────────────────────────
# nginx-unprivileged runs as a non-root user (uid 101) for security
FROM nginxinc/nginx-unprivileged:alpine3.23-perl AS runner

# UID 101 is the default nginx user in nginxinc/nginx-unprivileged
# Declared as ARG to allow override at build time if needed:
# docker build --build-arg UID=1001 ...
ARG UID=101
USER root

# Clean default nginx content and config
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

# Copy nginx config template (rendered at runtime with actual BASE_HREF)
COPY nginx.conf.template /etc/nginx/conf.d/nginx.template

# Copy build artifacts from builder stage
COPY --from=builder /app/.app-name /etc/app-name
COPY --from=builder /app/.base-href /etc/base-href
COPY --from=builder /app/dist /app/dist

# Copy compiled Angular app to nginx serving directory at build time
RUN APP_NAME=$(cat /etc/app-name) && \
    mkdir -p /usr/share/nginx/html/app && \
    cp -r /app/dist/${APP_NAME}/browser/. /usr/share/nginx/html/app

# Copy and prepare the entrypoint script
COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Grant ownership of all runtime files to the nginx user
RUN chown -R ${UID} /app /usr/share/nginx/html /etc/nginx /etc/app-name /etc/base-href /entrypoint.sh

USER $UID

EXPOSE 8080

# Overridden by K8s readiness/liveness probes in production
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/ || exit 1

CMD ["/entrypoint.sh"]
