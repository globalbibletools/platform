# syntax=docker/dockerfile:1

FROM node:18-alpine AS base

FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY . .
RUN npx turbo prune @gbt/github-export-worker --docker
 
FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=builder /app/out/json/ .
RUN npm install
COPY --from=builder /app/out/full/ .
RUN npx turbo run build
RUN npm prune --production
 
FROM public.ecr.aws/lambda/nodejs:18 AS runner
COPY --from=installer /app ${LAMBDA_TASK_ROOT}
CMD ["apps/github-export-worker/dist/index.handler"]

