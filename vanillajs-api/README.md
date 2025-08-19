# Vanilla JavaScript Node.js API

A lightweight REST API built with Node.js using only vanilla JavaScript and built-in modules. No external dependencies except for what Node.js provides out of the box.

## Features

- **Pure Node.js**: Built using only Node.js built-in modules
- **RESTful API**: Complete CRUD operations for users and products
- **File-based Database**: JSON file storage with query capabilities
- **Middleware System**: CORS, logging, error handling
- **Input Validation**: Built-in validation system
- **Error Handling**: Comprehensive error handling with proper HTTP status codes
- **Testing**: Custom test runner using Node.js assert module
- **Configuration**: Environment-based configuration

## Project Structure

```
vanillajs-api/
├── src/
│   ├── server.js              # Main server entry point
│   ├── routes/                # Route handlers
│   │   ├── index.js           # General routes (health, info)
│   │   ├── users.js           # User CRUD operations
│   │   └── products.js        # Product CRUD operations
│   ├── middleware/            # Custom middleware
│   │   ├── cors.js            # CORS handling
│   │   ├── logger.js          # Request logging
│   │   └── error.js           # Error handling
│   ├── utils/                 # Utility functions
│   │   ├── router.js          # Custom router implementation
│   │   ├── parser.js          # Request/URL parsing
│   │   ├── response.js        # Response helpers
│   │   ├── validation.js      # Input validation
│   │   └── logger.js          # Logging system
│   ├── data/                  # Data layer
│   │   └── database.js        # File-based database
│   └── config/                # Configuration
│       └── config.js          # App configuration
├── tests/                     # Test files
│   └── test-runner.js         # Custom test runner
├── data/                      # Database files (auto-created)
├── package.json
├── .env
└── README.md
```

## Quick Start

1. **Install Node.js** (version 14+ required)

2. **Clone and navigate to the project**:
   ```bash
   cd vanillajs-api
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **The API will be available at**: `http://localhost:3000`

## API Endpoints

### General
- `GET /` - API information
- `GET /health` - Health check

### Users
- `GET /api/users` - Get all users (with pagination and search)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Products
- `GET /api/products` - Get all products (with filtering and search)
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

## Usage Examples

### Create a User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "status": "active"
  }'
```

### Get Users with Search
```bash
curl "http://localhost:3000/api/users?search=john&limit=5&offset=0"
```

### Create a Product
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop",
    "price": 999.99,
    "category": "electronics",
    "description": "High-performance laptop",
    "inStock": true,
    "quantity": 10
  }'
```

### Filter Products
```bash
curl "http://localhost:3000/api/products?category=electronics&minPrice=500&maxPrice=1500"
```

## Configuration

Environment variables can be set in `.env` file:

```env
PORT=3000
NODE_ENV=development
DB_PATH=./data/db.json
CORS_ORIGIN=*
```

## Testing

Run the test suite:

```bash
npm test
```

The tests include:
- Health check endpoint
- API info endpoint
- 404 handling
- User CRUD operations
- Product CRUD operations
- Validation testing

## Data Storage

The API uses a file-based database that stores data in JSON format. The database file is automatically created at the specified path (default: `./data/db.json`).

Data structure:
```json
{
  "users": [
    {
      "id": "unique-id",
      "name": "John Doe",
      "email": "john@example.com",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "products": [
    {
      "id": "unique-id",
      "name": "Product Name",
      "price": 29.99,
      "category": "electronics",
      "description": "Product description",
      "inStock": true,
      "quantity": 100,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## Architecture

### Router System
Custom router implementation supporting:
- HTTP method routing (GET, POST, PUT, DELETE)
- Route parameters (`:id`)
- Query string parsing
- Middleware chain execution

### Middleware System
- **CORS**: Cross-origin resource sharing
- **Logger**: Request/response logging with timestamps
- **Error Handler**: Centralized error handling with proper HTTP status codes

### Validation System
Built-in validation with support for:
- Required fields
- Type checking (string, number, email)
- Length constraints
- Custom validators
- Detailed error messages

### Database Layer
Simple file-based database with features:
- CRUD operations
- Query filtering
- Pagination support
- Automatic ID generation
- Timestamps for created/updated records

## Error Handling

The API provides consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Validation errors include field-specific details:

```json
{
  "success": false,
  "error": "Validation failed",
  "errors": {
    "name": "name is required",
    "email": "email must be a valid email"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Development

### Adding New Routes
1. Create route handlers in `src/routes/`
2. Register routes in `src/server.js`
3. Add validation as needed
4. Write tests in `tests/`

### Extending the Database
The database class can be extended to support:
- More complex queries
- Relationships between collections
- Indexing for better performance
- Database migrations

## Performance Considerations

- File-based database is suitable for small to medium datasets
- For production use, consider implementing caching
- Large datasets may benefit from streaming responses
- Database operations are async to prevent blocking

## Security Features

- Input validation and sanitization
- CORS configuration
- Error message sanitization
- No external dependencies reduces attack surface

## License

MIT License