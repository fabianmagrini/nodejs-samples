# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This is a Node.js samples repository containing several implementations:

- `fastify-api/` - REST API with Node.js, MongoDB, Fastify and Swagger
- `fastify-graphql-api/` - GraphQL API with Node.js, MongoDB, Fastify and Swagger
- `12-factor-app/` - Production-grade 12-factor app with TypeScript, Express, monitoring, and observability
- `vanillajs-api/` - Lightweight REST API using only Node.js built-in modules
- `hotpagecache/` - TypeScript library for caching paginated data with Redis
- `opentelemetry-demo/` - Microservices demo with distributed tracing and observability using OpenTelemetry

### Fastify APIs Architecture (fastify-api & fastify-graphql-api)
- `src/index.js` - Main application entry point
- `src/controllers/` - Business logic controllers
- `src/models/` - Mongoose data models
- `src/routes/` - API route definitions
- `src/config/` - Configuration files (Swagger setup)
- `src/schema/` - GraphQL schema (GraphQL API only)
- `src/helpers/` - Utility functions and seeding scripts

### 12-Factor App Architecture
- `src/index.ts` - TypeScript application entry point
- `src/controllers/` - HTTP request handlers
- `src/middleware/` - Express middleware (logging, metrics, resilience)
- `src/models/` - Data models and interfaces
- `src/monitoring/` - Health checks, metrics, tracing
- `src/routes/` - API route definitions
- `src/services/` - Business logic layer
- `src/utils/` - Utility functions (logger, resilience)
- `src/config/` - Configuration management
- `.claude/skills/` - Custom Claude Code skills for this project
  - `review.md` - `/review` skill: structured code review focused on this stack

## Development Commands

Each project must be run from its respective directory.

### Fastify APIs (fastify-api & fastify-graphql-api)
```bash
# Install dependencies
npm install

# Start development server with hot reload
npm start

# Run tests (currently not implemented)
npm test

# GraphQL API only - Seed database with fake data
npm run seed
```

### 12-Factor App
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Lint code
npm run lint

# Type checking
npm run typecheck
```

## Prerequisites

### Fastify APIs
- Node.js/NPM
- MongoDB (recommended via Docker)
- Both APIs connect to `mongodb://localhost/footballfan`

### 12-Factor App
- Node.js 18+
- TypeScript
- Docker and Docker Compose (optional for monitoring stack)

### OpenTelemetry Demo
- Node.js 20+, npm 10+
- Docker and Docker Compose v2

## API Access

### REST API (fastify-api)
- Server: http://localhost:3000
- Swagger documentation: http://localhost:3000/documentation
- Endpoints: `/api/feeds` (CRUD operations)

### GraphQL API (fastify-graphql-api)
- Server: http://localhost:3000
- GraphiQL interface: http://localhost:3000/graphiql
- Swagger documentation: http://localhost:3000/documentation
- GraphQL endpoint with queries for feeds and mutations for data manipulation

### 12-Factor App
- Server: http://localhost:3000
- Health check: http://localhost:3000/health
- Readiness check: http://localhost:3000/ready
- Liveness check: http://localhost:3000/live
- Metrics: http://localhost:3000/metrics
- API endpoints: `/api/users` (CRUD operations)
- Jaeger UI: http://localhost:16686 (with Docker Compose)
- Prometheus: http://localhost:9090 (with Docker Compose)

## Data Models

### Fastify APIs
Both APIs use the same Feed model with MongoDB via Mongoose, containing basic feed information (name, url, etc.).

### 12-Factor App
Uses TypeScript interfaces for User model with in-memory storage (production-ready architecture for external database integration).

### OpenTelemetry Demo
- `services/generator/` - Password orchestrator, calls all four character services concurrently
- `services/lower/`, `services/upper/`, `services/digit/`, `services/special/` - Character generator microservices
- `services/load/` - Continuous load generator (2 replicas in Docker Compose)
- `docker-compose.yml` - Full stack: services + OTel Collector + Jaeger + Prometheus + Grafana + TimescaleDB
- `otel-collector-config.yml` - Collector pipeline configuration
- `grafana/provisioning/` - Pre-provisioned dashboards and datasources

Each service has a `tracing.ts` that must be imported first in `index.ts` for auto-instrumentation to work correctly.