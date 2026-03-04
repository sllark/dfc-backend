# ===== Build stage =====
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (including devDependencies for build)
COPY package.json package-lock.json ./
RUN npm ci

# Prisma schema and migrations (needed for generate + deploy)
COPY prisma ./prisma/

# Generate Prisma client (uses output in schema: ../src/generated/prisma)
RUN npx prisma generate

# Source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ===== Production stage =====
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Prisma (schema + migrations for migrate deploy at runtime)
COPY prisma ./prisma/
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Built app + generated Prisma client (app requires ../generated/prisma from dist/)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated ./dist/generated

# Uploads directory (optional; can be mounted as volume)
RUN mkdir -p uploads

# Run migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
