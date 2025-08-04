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

## Prerequisites

### For Fastify APIs
- [Node.js/NPM](https://nodejs.org/en/)
- [MongoDB using Docker](https://github.com/fabianmagrini/docker-samples/tree/master/mongo)
- [Postman](https://www.postman.com/) (for testing REST API)

### For 12-Factor App
- [Node.js 18+](https://nodejs.org/en/)
- [Docker and Docker Compose](https://docs.docker.com/) (optional for monitoring stack)
- TypeScript knowledge recommended

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
