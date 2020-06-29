# REST API with NodeJS

REST API with Node.js, MongoDB, Fastify and Swagger.

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

Navigate to <http://localhost:3000/documentation> for the api documentation.

## New project initialisation

```sh
mkdir fastify-api
cd fastify-api
mkdir src
cd src
touch index.js
cd ..
npm init
npm i nodemon mongoose fastify fastify-swagger boom
```

To set up nodemon add the following line to the package.json file in the scripts object:

```sh
“start”: “./node_modules/nodemon/bin/nodemon.js ./src/index.js”,
```

Run the application with working directory where package.json:

```sh
npm start
```

Now can navigate to <http://localhost:3000/>

## Use Postman to try the API and seed database

### Finding all

```json
GET http://localhost:3000/api/feeds
```

### Finding one

```json
GET http://localhost:3000/api/feeds/<id>
```

### Create

```json
POST http://localhost:3000/api/feeds
{
"name": "TheWorldGame",
"url": "foo"
}
```

### Updating

```json
PUT http://localhost:3000/api/feeds/<id>
{
"name": "TheWorldGame",
"url": "foo"
}
```

### Deleting

```json
DELETE http://localhost:3000/api/feeds/<id>
```
