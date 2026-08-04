# API image (NestJS + Prisma) built from the pnpm workspace.
# Debian slim over alpine: argon2/prisma ship glibc prebuilds, no toolchain needed.
FROM node:22-slim

# Prisma engines need openssl at runtime.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

RUN corepack enable
WORKDIR /app

COPY . .

# Install only the API and its workspace dependencies (mobile/admin excluded).
RUN pnpm install --frozen-lockfile --filter @mara/api...

# Build workspace deps (mortgage-calc, shared-types) then the API itself.
RUN pnpm --filter @mara/api... run build

ENV NODE_ENV=production
EXPOSE 3001

# Apply pending migrations on boot, then serve. `prisma migrate deploy` is a
# no-op when the schema is current, so restarts are safe.
CMD ["sh", "-c", "cd apps/api && npx prisma migrate deploy && node dist/main.js"]
