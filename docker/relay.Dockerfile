# Relay Worker for local one-command runs.
#
# Cloudflare's local Workers runtime (`workerd`, which `wrangler dev` uses) is a glibc native
# binary — it does NOT run on Alpine/musl, so the base MUST be Debian-based.
FROM node:22-bookworm-slim

WORKDIR /app
# Local mode needs no account; silence wrangler's interactive first-run telemetry prompt.
ENV WRANGLER_SEND_METRICS=false CI=1

RUN npm install -g pnpm@11.8.0

# Install deps first (cached layer). `pnpm rebuild` forces the native build scripts that stock
# pnpm skips by default (the repo's pnpm-workspace.yaml uses a sandbox-only approval key).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile && pnpm rebuild workerd esbuild

# The Worker source + config (server.ts imports ../src/session/protocol.ts).
COPY . .

EXPOSE 1999
# `--local` (also the default): simulated Durable Object + KV via workerd, fully offline.
CMD ["pnpm", "exec", "wrangler", "dev", "--local", "--ip", "0.0.0.0", "--port", "1999"]
