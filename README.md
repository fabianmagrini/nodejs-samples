# NodeJS samples

This repository contains Node.js samples demonstrating different approaches to building web APIs and production-grade applications.

## Projects

### [fastify-api](./fastify-api/)
REST API built with Node.js, MongoDB, Fastify and Swagger.

- **Tech Stack**: Node.js, Fastify, MongoDB, Mongoose, Swagger
- **Features**: CRUD operations, API documentation, hot reload
- **Documentation**: http://localhost:3000/documentation

### [fastify-graphql-api](./fastify-graphql-api/)
GraphQL API built with Node.js, MongoDB, Fastify and Swagger.

- **Tech Stack**: Node.js, Fastify, GraphQL, MongoDB, Mongoose, Swagger
- **Features**: GraphQL queries/mutations, GraphiQL interface, data seeding
- **GraphiQL**: http://localhost:3000/graphiql

### [12-factor-app](./12-factor-app/)
Production-grade 12-factor application with comprehensive monitoring and observability.

- **Tech Stack**: TypeScript, Express, OpenTelemetry, Prometheus, Winston
- **Features**: Distributed tracing, metrics, health checks, graceful shutdown, resilience patterns
- **Monitoring**: Jaeger tracing, Prometheus metrics, structured logging
- **Health**: http://localhost:3000/health
- **Metrics**: http://localhost:3000/metrics

### [vanillajs-api](./vanillajs-api/)
Lightweight REST API built with pure Node.js using only built-in modules.

- **Tech Stack**: Pure Node.js (no external dependencies)
- **Features**: CRUD operations, file-based database, custom router, middleware system, input validation
- **Testing**: Custom test runner with Node.js assert module
- **API**: http://localhost:3000

## Prerequisites

### For Fastify APIs
- [Node.js/NPM](https://nodejs.org/en/)
- [MongoDB using Docker](https://github.com/fabianmagrini/docker-samples/tree/master/mongo)
- [Postman](https://www.postman.com/) (for testing REST API)

### For 12-Factor App
- [Node.js 18+](https://nodejs.org/en/)
- [Docker and Docker Compose](https://docs.docker.com/) (optional for monitoring stack)
- TypeScript knowledge recommended

### For Vanilla JS API
- [Node.js 14+](https://nodejs.org/en/)
- No external dependencies required

## Quick Start

### Fastify APIs
1. Choose a project directory (`fastify-api` or `fastify-graphql-api`)
2. Install dependencies: `npm install`
3. Start the server: `npm start`

Each project runs on http://localhost:3000 and connects to `mongodb://localhost/footballfan`.

### 12-Factor App
1. Navigate to `12-factor-app` directory
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Optional: Start monitoring stack with `docker-compose -f docker-compose.dev.yml up`

The application runs on http://localhost:3000 with comprehensive monitoring and observability features.

### Vanilla JS API
1. Navigate to `vanillajs-api` directory
2. Start the server: `npm start`

The API runs on http://localhost:3000 with no external dependencies required.
