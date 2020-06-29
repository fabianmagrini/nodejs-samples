# GraphQL API with NodeJS

GraphQL API with Node.js, MongoDB, Fastify and Swagger.

## Prerequisites

* [NodeJS/NPM](https://nodejs.org/en/)
* [MongoDB using Docker](https://github.com/fabianmagrini/docker-samples/tree/master/mongo)
* [Postman](https://www.postman.com/)

## Setup

```sh
# install dependencies
npm install

# serve with hot reload
npm start
```

Navigate to <http://localhost:3000/graphiql> for GraphiQL.

## New project initialisation

Copy <https://github.com/fabianmagrini/nodejs-samples/tree/master/fastify-api>

```sh
# upgrades your package.json dependencies to the latest versions
npm install -g npm-check-updates

# Upgrade package file
ncu -u

# install dependencies
npm install

# serve with hot reload
npm start
```

Now can navigate to <http://localhost:3000/>

### Seed data

Seed fake data using faker

```sh
npm i faker -D
```

Add command to package.json:

```sh
"seed": "node ./src/helpers/seed.js"
```

Run

```sh
npm run seed
```

### GraphQL

install GraphQL

```sh
npm i fastify-gql graphql
```

Open the GraphiQL: http://localhost:3000/graphiql

feeds

```js
{
    feeds {
        _id
        name
    }
}
```

feed

```js
{
    feed(id: "5ef9614a275afee8d1cfa772") {
        _id
        name
    }
}
```

mutations

addFeed

```js
mutation{
    addFeed(
        name:"Mutation Test"
        url:"foobar"
    ) {
        _id
        name
    }
}
```
