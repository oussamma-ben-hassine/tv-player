# Stage 1: Build Frontend (React + Vite + Tailwind)
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend (NestJS + TypeScript + Prisma)
FROM node:20-alpine AS backend-builder
WORKDIR /app
COPY package*.json ./
COPY prisma/ ./prisma/
RUN npm install
RUN npx prisma generate
COPY tsconfig*.json ./
COPY src/ ./src/
RUN npx tsc -p tsconfig.build.json

# Stage 3: Image finale de production
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl wget curl

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

COPY package*.json ./
RUN npm install --omit=dev

COPY prisma/ ./prisma/
RUN npx prisma generate

COPY --from=backend-builder /app/dist ./dist
COPY --from=frontend-builder /app/dist/public ./dist/public
COPY scripts/ ./scripts/

RUN chmod +x ./scripts/*.sh

EXPOSE 3000

HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

ENTRYPOINT ["./scripts/entrypoint.sh"]
