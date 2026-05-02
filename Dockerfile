# ─── Stage 1 : Build ───────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

# Copy source files
COPY . .

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
