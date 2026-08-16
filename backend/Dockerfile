# syntax=docker/dockerfile:1
# Shared Dockerfile for every NestJS service — context must be ./backend.
# The container builds ALL services once and starts the one named by the
# SERVICE environment variable (default: gateway). This avoids build args,
# which makes deployment identical on Docker Compose, Railway, Render, etc.
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY services ./services
RUN if [ -f package-lock.json ]; then npm ci; else npm install --no-audit --no-fund; fi

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY services ./services
RUN npm run build --workspaces --if-present

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/services ./services
ENV SERVICE=gateway
EXPOSE 3000
CMD ["sh", "-c", "node services/${SERVICE}/dist/main.js"]
