# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests for cache efficiency
COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN npm ci --workspace=@pmt/frontend --workspace=@pmt/shared-types --include-workspace-root

# Copy source
COPY apps/frontend ./apps/frontend
COPY packages/shared-types ./packages/shared-types

WORKDIR /app/apps/frontend

# Build — Vite outputs to apps/frontend/dist
RUN npm run build

# ── Stage 2: Serve with nginx ─────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/pmt.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
