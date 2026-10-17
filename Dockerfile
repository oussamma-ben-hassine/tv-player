# Stage 1: Build Frontend (React + Vite + Tailwind)
FROM node:20-alpine AS frontend-builder
ENV NODE_ENV=development
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --include=dev
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend (NestJS + TypeScript + Prisma)
FROM node:20-alpine AS backend-builder
ENV NODE_ENV=development
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
COPY prisma/ ./prisma/
RUN npm install --include=dev
RUN npx prisma generate
COPY tsconfig*.json ./
COPY src/ ./src/
RUN npx tsc -p tsconfig.build.json

# Stage 3: Image finale de production
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl wget curl

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_URL="file:/app/data/tvplayer.db"

RUN mkdir -p /app/data

COPY package*.json ./
RUN npm install --omit=dev

COPY prisma/ ./prisma/
RUN npx prisma generate

COPY --from=backend-builder /app/dist ./dist
COPY --from=frontend-builder /app/dist/public ./dist/public
COPY --from=frontend-builder /app/dist/public ./public
COPY scripts/ ./scripts/

RUN chmod +x ./scripts/*.sh

EXPOSE 3000

HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

ENTRYPOINT ["./scripts/entrypoint.sh"]
