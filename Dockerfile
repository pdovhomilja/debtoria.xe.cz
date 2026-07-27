# Production image: next build (standalone) + prisma migrate deploy on boot.
FROM node:22-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm exec prisma generate
# Build never talks to the DB or MinIO (static pages are locale/marketing
# only), but the zod env schema validates at import time — give it dummies.
# Real values come from the runtime environment.
ENV NEXT_TELEMETRY_DISABLED=1
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    SESSION_SECRET="build-time-placeholder-secret-0123456789abcdef" \
    MINIO_ENDPOINT="localhost" \
    MINIO_PORT="9000" \
    MINIO_ACCESS_KEY="build" \
    MINIO_SECRET_KEY="build" \
    MINIO_BUCKET="build" \
    APP_URL="http://localhost:3000" \
    pnpm build

FROM node:22-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
# Prisma CLI (pinned to the app's version) so `migrate deploy` works offline at boot.
RUN npm install -g prisma@6.19.3
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
EXPOSE 3000
CMD ["sh", "-c", "prisma migrate deploy && exec node server.js"]
