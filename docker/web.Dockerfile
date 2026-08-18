# Frontend: build the SPA, then serve the static bundle with SPA fallback.
# Debian-based so `esbuild`'s native build script (used by the Vite build) runs.

# ---- build stage ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN npm install -g pnpm@11.8.0

# VITE_* is inlined at BUILD time. The WebSocket originates from the browser on the host (not this
# container), so the relay must be addressed as localhost — Docker-internal DNS never applies.
ARG VITE_PARTYKIT_HOST=localhost:1999
ENV VITE_PARTYKIT_HOST=$VITE_PARTYKIT_HOST

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile && pnpm rebuild esbuild
COPY . .
RUN pnpm build

# ---- serve stage ----
FROM node:22-bookworm-slim AS serve
WORKDIR /app
RUN npm install -g serve@14
COPY --from=build /app/dist ./dist
EXPOSE 8087
# -s = SPA fallback, so /w/<room> observer links and /r/<code> resume links resolve to index.html.
CMD ["serve", "-s", "dist", "-l", "8087"]
