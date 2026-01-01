# Multi-stage Dockerfile for production

# Builder stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps
COPY package.json package-lock.json* ./
RUN npm ci --silent

# Copy source & build frontend
COPY . .
RUN npm run build

# Runner stage
FROM node:20-alpine AS runner
WORKDIR /app

# Install only production deps
COPY package.json package-lock.json* ./
RUN npm ci --only=production --silent

# Copy build output and app files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.env.validate ./.env.validate

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "server.js"]
