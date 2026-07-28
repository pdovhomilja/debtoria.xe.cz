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
# Bundle the demo seed so it can run in the runtime image (which has no
# tsx/devDeps). Packages left external ship in the standalone node_modules.
# Only @prisma/client stays external (top-level in standalone, has a native
# engine); pure-JS deps (bcryptjs, minio, zod, …) are bundled in.
RUN pnpm exec esbuild prisma/seed.ts --bundle --platform=node --format=cjs \
    --external:@prisma/client --external:.prisma \
    --outfile=/app/seed.cjs

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
# One-time demo data: docker exec <container> node seed.cjs
COPY --from=build /app/seed.cjs ./seed.cjs
EXPOSE 3000
CMD ["sh", "-c", "prisma migrate deploy && exec node server.js"]
