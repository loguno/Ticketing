# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Note: prisma generate will run during build phase if prisma is configured
RUN npx prisma generate || true
RUN npm run build

# Stage 2: Production Run
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copia delle configurazioni
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/workers ./src/workers

# Creazione cartella per gli allegati
RUN mkdir -p /app/attachments

EXPOSE 3000
CMD ["npm", "run", "start"]
