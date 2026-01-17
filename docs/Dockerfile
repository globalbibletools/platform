# syntax=docker/dockerfile:1

FROM node:22-slim

WORKDIR /app/docs

COPY docs/package*.json ./
RUN npm ci

COPY . ../.

CMD npm run start
