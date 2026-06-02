# ─── Stage 1: Build ────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

# Verdaccio credentials — pass at build time:
ARG VERDACCIO_USER
ARG VERDACCIO_PASSWORD
ARG VERDACCIO_REGISTRY="https://npm.florianmazelier.dev"

# Disable Husky git hooks in CI/Docker environment
ENV HUSKY=0

# Install dependencies first to maximize Docker layer cache hits
COPY package.json package-lock.json ./

# Authenticate with Verdaccio, install, then remove credentials
RUN if [ -n "${VERDACCIO_USER}" ] && [ -n "${VERDACCIO_PASSWORD}" ]; then \
      ENCODED=$(printf '%s:%s' "${VERDACCIO_USER}" "${VERDACCIO_PASSWORD}" | base64 | tr -d '\n') && \
      REGISTRY_HOST="${VERDACCIO_REGISTRY#https://}" && \
      echo "//${REGISTRY_HOST}/:_auth=${ENCODED}" >> ~/.npmrc; \
    else \
      echo "ERROR: VERDACCIO_USER and VERDACCIO_PASSWORD build args are required." >&2 && exit 1; \
    fi && \
    npm ci --prefer-offline && \
    rm -f ~/.npmrc

# Copy build scripts before source to preserve cache when only source changes
COPY scripts ./scripts/
COPY . .

# Extract app name from project config files
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
COPY nginx/nginx.conf.template /etc/nginx/templates/nginx.conf.template

# Copy security headers config snippet (included in nginx.conf.template) to set HTTP security headers
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf

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

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

CMD ["/entrypoint.sh"]
