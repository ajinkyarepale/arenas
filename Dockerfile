# ---------------------------------------------------------------------------
# Arenas — production image
#
# This app runs behind a custom Node server (server.ts) that hosts Next.js,
# Socket.io and the round scheduler in one process, so it is a normal
# long-running container rather than a serverless bundle.
# ---------------------------------------------------------------------------

# --- Stage 1: install every dependency, including build-time ones ----------
FROM node:20-slim AS deps
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# --- Stage 2: build ---------------------------------------------------------
FROM node:20-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `npm run build` already runs `prisma generate` before `next build`.
# DATABASE_URL is only read at runtime, but Prisma wants the var to exist.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Stage 3: runtime -------------------------------------------------------
FROM node:20-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Production dependencies only. `tsx` (runs server.ts), `next`, the Prisma
# client and the Prisma CLI (for `migrate deploy`) are all in `dependencies`.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate && npm cache clean --force

# The custom server is TypeScript and imports from src/ at runtime, so the
# source tree and tsconfig (for its path aliases) ship with the image.
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/tsconfig.json ./tsconfig.json

EXPOSE 3000
CMD ["npm", "run", "start"]
