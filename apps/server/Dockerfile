# syntax=docker/dockerfile:1

FROM node:18-alpine AS base

FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY . .
RUN npx turbo prune @gbt/server --docker
 
FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=builder /app/out/json/ .
RUN npm install
COPY --from=builder /app/out/full/ .
RUN --mount=type=secret,id=database-url,env=DATABASE_URL \
    npx turbo run build
 
FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
COPY --from=installer --chown=nextjs:nodejs /app/apps/server/.next/standalone .
COPY --from=installer --chown=nextjs:nodejs /app/apps/server/.next/static apps/server/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/server/public apps/server/public
CMD node apps/server/server.js

FROM base AS dev
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY . .
RUN npm install
ENV PORT=3000
ENV NODE_ENV=development
EXPOSE 3000
CMD npx turbo dev
