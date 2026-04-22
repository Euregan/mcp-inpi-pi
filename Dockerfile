# Dockerfile — mcp-inpi-pi (transport HTTP expérimental)
#
# Build  : docker build -t mcp-inpi-pi .
# Run    : docker run -p 3000:3000 -e INPI_USERNAME=… -e INPI_PASSWORD=… mcp-inpi-pi
#
# Note : ce Dockerfile cible le transport HTTP (streamable HTTP).
#        Le transport stdio par défaut ne nécessite pas de conteneur.

# ── Build ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/index-http.js"]
