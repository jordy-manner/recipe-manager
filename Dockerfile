# syntax=docker/dockerfile:1

# ── Stage 1: production deps ──────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# postinstall runs prisma generate; skip it here — prisma CLI absent with --omit=dev
RUN npm ci --omit=dev --ignore-scripts

# ── Stage 2: full build ───────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
# Copy schema before npm ci so postinstall (prisma generate) can find it
COPY prisma ./prisma
COPY prisma.config.ts ./
# Placeholder URL needed before npm ci — postinstall runs prisma generate which reads DATABASE_URL
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 3: lean runtime image ───────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Next.js standalone server (bundles its own minimal node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public          ./public

# Full prod node_modules — prisma CLI dep tree (effect, fast-check…) too deep to cherry-pick
COPY --from=deps    --chown=nextjs:nodejs /app/node_modules    ./node_modules
# Schema + migrations + config (datasource URL for prisma migrate deploy)
COPY --from=builder --chown=nextjs:nodejs /app/prisma          ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./

COPY --chown=nextjs:nodejs scripts/docker-entrypoint.sh ./
RUN chmod +x /app/docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["/app/docker-entrypoint.sh"]
