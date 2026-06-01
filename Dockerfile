# syntax=docker/dockerfile:1

# ──────────────────────────────────────────────────────────────────────────
# AegisCase Frontend — multi-stage build
#   Stage 1 (build): compile the Vite SPA to static assets in /app/dist
#   Stage 2 (serve): copy those assets into nginx and serve them
#
# It is a STATIC SPA. There is NO Node server at runtime — nginx serves the
# built files and falls back to index.html for client-side routing.
#
# Env vars are VITE_-prefixed and therefore INLINED AT BUILD TIME. To point the
# FE at a different gateway, pass --build-arg VITE_API_BASE_URL=... (see below).
# ──────────────────────────────────────────────────────────────────────────

# ---- Stage 1: build ----
FROM node:20-alpine AS build

WORKDIR /app

# Install deps first (better layer caching). package-lock.json => use npm ci.
COPY package.json package-lock.json ./
RUN npm ci

# The only variable the browser needs is the API gateway base URL. The FE does
# NOT talk to Keycloak directly, so no Keycloak URL is required here.
# Default targets the public gateway URL the browser will hit on the host.
ARG VITE_API_BASE_URL=http://localhost:3000
ARG VITE_ENV=production
ARG VITE_SENTRY_DSN=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_ENV=$VITE_ENV \
    VITE_SENTRY_DSN=$VITE_SENTRY_DSN

# Copy the rest of the source and build (tsc -b && vite build -> /app/dist)
COPY . .
RUN npm run build

# ---- Stage 2: serve ----
FROM nginx:1.27-alpine AS serve

# SPA-aware nginx config (history fallback to index.html + asset caching)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static build output
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
