# ── Stage 1: build the React SPA ─────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# VITE_* vars are inlined at build time — pass them as build args.
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_PLATFORM_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_PLATFORM_BASE_URL=$VITE_PLATFORM_BASE_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: nginx serving the built SPA ─────────────────────────────────────
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
