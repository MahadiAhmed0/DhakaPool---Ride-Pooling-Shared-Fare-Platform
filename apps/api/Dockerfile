# API image (ARCHITECTURE §12.1). Built from the repository root: docker build -f apps/api/Dockerfile .

# 1) Install dependencies and compile TypeScript.
FROM node:24-bookworm-slim AS build
# Prisma looks for OpenSSL to pick its engine; the slim image does not include it.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @dhakapool/shared --workspace @dhakapool/api --include-workspace-root
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build --workspace @dhakapool/shared && npm run build --workspace @dhakapool/api

# 2) Run. The Prisma CLI stays installed so migrations run when the container starts.
FROM node:24-bookworm-slim AS runtime
# Prisma looks for OpenSSL to pick its engine; the slim image does not include it.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app ./
USER node
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["npm", "run", "start:prod"]
