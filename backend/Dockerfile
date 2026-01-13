FROM node:22-bookworm-slim AS build

WORKDIR /app

# Prisma engines require OpenSSL at runtime; install it in build too for safety.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# Install backend dependencies first (better layer caching)
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

# ============================================================================
# Build the web client (Expo)
# ============================================================================
FROM node:22-bookworm-slim AS client-build

WORKDIR /app

# Build args for client environment variables (passed from render.yaml or docker build)
# These are inlined into the JS bundle at build time.
ARG EXPO_PUBLIC_API_URL
ARG EXPO_PUBLIC_AUTH0_DOMAIN
ARG EXPO_PUBLIC_AUTH0_CLIENT_ID
ARG EXPO_PUBLIC_AUTH0_AUDIENCE

# Make build args available as env vars during the build
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_AUTH0_DOMAIN=$EXPO_PUBLIC_AUTH0_DOMAIN
ENV EXPO_PUBLIC_AUTH0_CLIENT_ID=$EXPO_PUBLIC_AUTH0_CLIENT_ID
ENV EXPO_PUBLIC_AUTH0_AUDIENCE=$EXPO_PUBLIC_AUTH0_AUDIENCE

# Install client dependencies
COPY client/package-lock.json client/package.json ./client/
WORKDIR /app/client
RUN npm ci

# Copy client and shared sources
WORKDIR /app
COPY client/ ./client/
COPY shared/ ./shared/

# Build the Expo web client
WORKDIR /app/client
RUN npx expo export --platform web


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

# Copy compiled backend output
COPY --from=build /app/backend/dist ./dist

# Copy the built web client (Expo export output)
COPY --from=client-build /app/client/dist ./client-dist

# Add container entrypoint (db push then start)
COPY backend/docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

