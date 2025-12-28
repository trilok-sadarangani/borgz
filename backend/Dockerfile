FROM node:22-bookworm-slim AS build

WORKDIR /app

# Prisma engines require OpenSSL at runtime; install it in build too for safety.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# Install dependencies first (better layer caching)
COPY backend/package-lock.json backend/package.json ./backend/
WORKDIR /app/backend
RUN npm ci

# Copy sources (including shared types for TS compilation)
WORKDIR /app
COPY backend/ ./backend/
COPY shared/ ./shared/

# Generate Prisma client + build TS
WORKDIR /app/backend
RUN npm run db:generate
RUN npm run build


FROM node:22-bookworm-slim AS runtime

WORKDIR /app

# Prisma engines require OpenSSL at runtime.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# Install production deps only
COPY backend/package-lock.json backend/package.json ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev

# Prisma schema + Prisma config are required at runtime for db push / generate
WORKDIR /app
COPY backend/prisma ./backend/prisma
COPY backend/prisma.config.ts ./backend/prisma.config.ts

# Generate Prisma client in the runtime image (ensures engines match runtime)
WORKDIR /app/backend
RUN npm run db:generate

# Copy compiled output
COPY --from=build /app/backend/dist ./dist

# Add container entrypoint (db push then start)
COPY backend/docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

