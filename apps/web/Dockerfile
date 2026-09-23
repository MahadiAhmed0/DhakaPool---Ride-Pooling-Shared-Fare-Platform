# Web image (ARCHITECTURE §12.1). Built from the repository root: docker build -f apps/web/Dockerfile .

# 1) Install dependencies and build the Next.js standalone server.
FROM node:24-bookworm-slim AS build
WORKDIR /app
# The /api proxy target is compiled into the build (ADR-0009).
ARG API_INTERNAL_URL=http://api:4000
ENV API_INTERNAL_URL=$API_INTERNAL_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @dhakapool/shared --workspace @dhakapool/web --include-workspace-root
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build --workspace @dhakapool/shared && npm run build --workspace @dhakapool/web

# 2) Run only the self-contained server and its static files.
FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
