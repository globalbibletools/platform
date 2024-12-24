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
COPY --from=installer --chown=nextjs:nodejs /app/apps/server/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/server/.next/static ./apps/web/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/server/public ./apps/web/public
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

# Run the import worker in production
# FROM public.ecr.aws/lambda/nodejs:18 AS import-worker
# RUN npm i pg@8.12.0
# COPY --from=builder /app/.next/server/import-worker.js ${LAMBDA_TASK_ROOT}
# COPY --from=builder /app/.next/server/webpack-runtime.js ${LAMBDA_TASK_ROOT}
# CMD ["import-worker.handler"]

# Run the github export worker in production
# FROM public.ecr.aws/lambda/nodejs:18 AS github-export-worker
# RUN npm i pg@8.12.0 @aws-sdk/client-sqs@3.678.0 aws-lambda@1.0.7 @octokit/rest@21.0.2 pg-cursor@2.12.1
# COPY --from=builder /app/.next/server/github-export-worker.js ${LAMBDA_TASK_ROOT}
# COPY --from=builder /app/.next/server/webpack-runtime.js ${LAMBDA_TASK_ROOT}
# CMD ["github-export-worker.handler"]
