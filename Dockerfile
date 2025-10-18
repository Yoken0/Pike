# Pike - AI-powered document assistant
# Multi-stage Dockerfile optimized for development and production

# Base stage with common dependencies
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies for better performance
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    wget \
    && npm install -g npm@latest

# Copy package files
COPY package*.json ./

# Development stage
FROM base AS development

    # Install all dependencies including dev dependencies
    RUN npm install

# Copy source code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S pike -u 1001 -G nodejs

# Change ownership of app directory
RUN chown -R pike:nodejs /app

# Set npm cache directory
RUN mkdir -p /home/pike/.npm && chown -R pike:nodejs /home/pike

USER pike

# Expose port
EXPOSE 3000

# Health check for development
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/stats || exit 1

# Start development server with hot reload
CMD ["npm", "run", "dev"]

# Builder stage for production
FROM base AS builder

# Install all dependencies (including dev dependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build:vite

# Production stage
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Install only runtime dependencies
RUN apk add --no-cache \
    python3 \
    wget \
    && npm install -g npm@latest

# Copy package files
COPY package*.json ./

# Install production dependencies including vite (needed by server)
RUN npm ci --only=production && npm install vite && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/vite.config.ts ./vite.config.ts

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S pike -u 1001 -G nodejs

# Change ownership of app directory
RUN chown -R pike:nodejs /app

# Set npm cache directory
RUN mkdir -p /home/pike/.npm && chown -R pike:nodejs /home/pike

USER pike

# Expose port
EXPOSE 5000

# Health check for production
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/stats || exit 1

# Start the application
CMD ["npx", "tsx", "server/index.ts"]

# Default to production stage
FROM production