# NodeJS samples

This repository contains Node.js API samples demonstrating different approaches to building web APIs.

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

## Prerequisites

- [Node.js/NPM](https://nodejs.org/en/)
- [MongoDB using Docker](https://github.com/fabianmagrini/docker-samples/tree/master/mongo)
- [Postman](https://www.postman.com/) (for testing REST API)

## Quick Start

1. Choose a project directory (`fastify-api` or `fastify-graphql-api`)
2. Install dependencies: `npm install`
3. Start the server: `npm start`

Each project runs on http://localhost:3000 and connects to `mongodb://localhost/footballfan`.
