# syntax=docker/dockerfile:1

FROM node:18-slim AS build
WORKDIR /app
COPY package*.json .
COPY patches/ ./patches/
RUN npm ci
COPY . .
RUN npm run build:job-worker
 
FROM public.ecr.aws/lambda/nodejs:18 AS runner
COPY --from=build /app/dist/job-worker.js ${LAMBDA_TASK_ROOT}
CMD ["job-worker.handler"]

