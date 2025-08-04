# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This is a Node.js samples repository containing two main API implementations:

- `fastify-api/` - REST API with Node.js, MongoDB, Fastify and Swagger
- `fastify-graphql-api/` - GraphQL API with Node.js, MongoDB, Fastify and Swagger

Both projects follow a similar architecture:
- `src/index.js` - Main application entry point
- `src/controllers/` - Business logic controllers
- `src/models/` - Mongoose data models
- `src/routes/` - API route definitions
- `src/config/` - Configuration files (Swagger setup)
- `src/schema/` - GraphQL schema (GraphQL API only)
- `src/helpers/` - Utility functions and seeding scripts

## Development Commands

Each project must be run from its respective directory (`fastify-api/` or `fastify-graphql-api/`).

### Common Commands
```bash
# Install dependencies
npm install

# Start development server with hot reload
npm start

# Run tests (currently not implemented)
npm test
```

### GraphQL API Specific Commands
```bash
# Seed database with fake data
npm run seed
```

## Prerequisites

- Node.js/NPM
- MongoDB (recommended via Docker)
- Both APIs connect to `mongodb://localhost/footballfan`

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

## Data Model

Both APIs use the same Feed model with MongoDB via Mongoose, containing basic feed information (name, url, etc.).