# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# OpenSSL is required by the Prisma query engine on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Copy root workspace manifests first for better layer caching
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install ALL workspace deps (needed for nest build)
RUN npm ci --workspace=@pmt/backend --workspace=@pmt/shared-types --include-workspace-root

# Copy source
COPY apps/backend ./apps/backend
COPY packages/shared-types ./packages/shared-types

# Generate Prisma client
WORKDIR /app/apps/backend
RUN npx prisma generate

# Remove stale incremental build info, then compile
RUN rm -f tsconfig.build.tsbuildinfo && npm run build

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:20-alpine AS runner

# OpenSSL is required by the Prisma query engine on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

# Install only production deps
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN npm ci --workspace=@pmt/backend --workspace=@pmt/shared-types --include-workspace-root --omit=dev

# Copy compiled output and Prisma schema/migrations
COPY --from=builder /app/apps/backend/dist          ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma        ./apps/backend/prisma
# Copy generated Prisma client (already inside node_modules via monorepo)
COPY --from=builder /app/node_modules/.prisma       ./node_modules/.prisma

WORKDIR /app/apps/backend

EXPOSE 3001

# Run migrations then start (safe for rolling deployments)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
