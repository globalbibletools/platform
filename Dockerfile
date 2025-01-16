# syntax=docker/dockerfile:1

FROM node:18-slim AS base

FROM base AS deps
WORKDIR /app
COPY package*.json patches/ .
RUN npm ci

FROM deps AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN --mount=type=secret,id=database-url,env=DATABASE_URL \
    npm run build
 
FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone .
COPY --from=build --chown=nextjs:nodejs /app/.next/static .next/static
COPY --from=build --chown=nextjs:nodejs /app/public public
CMD node server.js

FROM node:18 AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV PORT=3000
ENV NODE_ENV=development
EXPOSE 3000
CMD npm run dev
