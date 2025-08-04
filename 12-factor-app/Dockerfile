# Multi-stage build for production optimization
FROM node:18-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory and user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Development stage
FROM base AS development
ENV NODE_ENV=development
RUN npm ci --include=dev
COPY . .
USER nodeuser
EXPOSE 3000
CMD ["dumb-init", "npm", "run", "dev"]

# Build stage
FROM base AS build
ENV NODE_ENV=production
RUN npm ci --include=dev
COPY . .
RUN npm run build && \
    npm prune --production && \
    npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Security: Install dumb-init and create non-root user
RUN apk add --no-cache dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy built application and production dependencies
COPY --from=build --chown=nodeuser:nodejs /app/dist ./dist
COPY --from=build --chown=nodeuser:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodeuser:nodejs /app/package*.json ./

# Create logs directory
RUN mkdir -p logs && chown nodeuser:nodejs logs

# Security: Switch to non-root user
USER nodeuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Expose port
EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]