# HotPageCache

A TypeScript abstraction for high-performance caching of paginated data using Redis Sorted Sets (ZSETs) and Hashes.

## Overview

HotPageCache is designed to provide rapid access to frequently requested ("hot") pages of data, making it an ideal caching layer for applications with backends like Cassandra or Elasticsearch where pagination can be computationally expensive.

### Key Features

- **High Performance**: Leverages Redis for sub-millisecond response times
- **Cache-Aside Pattern**: Gives developers full control over caching strategy
- **Type Safety**: Built with TypeScript and Zod validation
- **Efficient Storage**: Uses Redis ZSETs for ordering and Hashes for data
- **Automatic TTL**: Built-in time-to-live for cache entries
- **Generic Design**: Works with any paginated data type

## Installation

```bash
npm install ioredis zod
```

Then add the HotPageCache source files to your project.

## Quick Start

```typescript
import Redis from 'ioredis';
import { z } from 'zod';
import { HotPageCache } from './src';

// Define your data schema
const ArticleSchema = z.object({
  id: z.number(),
  title: z.string(),
  author: z.string(),
  publishedAt: z.number(),
});

type Article = z.infer<typeof ArticleSchema>;

// Initialize Redis client
const redisClient = new Redis({
  host: 'localhost',
  port: 6379,
});

// Create cache instance
const cache = new HotPageCache<Article>({
  redisClient,
  ttlSeconds: 3600, // 1 hour
  cacheKeyPrefix: 'myapp',
});

// Use the cache
async function getArticles(page: number, pageSize: number) {
  const queryKey = 'articles:latest';

  // Try cache first
  let result = await cache.getPage(queryKey, page, pageSize, ArticleSchema);

  if (!result) {
    // Cache miss - fetch from backend
    const articles = await fetchFromDatabase(page, pageSize);

    // Populate cache for future requests
    await cache.setPage(
      queryKey,
      articles.items,
      articles.total,
      (article) => article.publishedAt // Score for ordering
    );

    return articles;
  }

  return result;
}
```

## Architecture

### Redis Data Model

HotPageCache uses two Redis data structures:

1. **ZSET (Sorted Set)** - For ordering items
   - Key: `{prefix}:zset:{queryKey}`
   - Members: Item IDs
   - Score: Numeric value for ordering (e.g., timestamp)
   - Complexity: O(log(N) + M) for page retrieval

2. **Hash** - For storing item data
   - Key: `{prefix}:hash:{itemId}`
   - Fields: Object properties (JSON stringified)
   - Complexity: O(1) for item access

### Workflow

1. Application requests a page via `getPage()`
2. **Cache Hit**: Return cached data immediately
3. **Cache Miss**: Return `null`, application fetches from backend
4. Application calls `setPage()` to populate cache
5. Future requests benefit from cached data

## API Reference

### Constructor

```typescript
new HotPageCache<T>(config: HotPageCacheConfig)
```

**Parameters:**
- `config.redisClient`: Initialized ioredis client
- `config.ttlSeconds`: Cache entry TTL in seconds
- `config.cacheKeyPrefix`: Namespace prefix for Redis keys

### Methods

#### getPage()

Retrieves a page of data from the cache.

```typescript
async getPage(
  queryKey: string,
  page: number,
  pageSize: number,
  schema: ZodSchema<T>
): Promise<PaginatedResult<T> | null>
```

**Parameters:**
- `queryKey`: Unique identifier for the cached query (e.g., 'articles:latest')
- `page`: 1-based page number
- `pageSize`: Items per page
- `schema`: Zod schema for validation

**Returns:** `PaginatedResult<T>` on cache hit, `null` on cache miss or error

**PaginatedResult:**
```typescript
{
  items: T[];           // Items on current page
  page: number;         // Current page number
  pageSize: number;     // Items per page
  total: number;        // Total items available
  totalPages: number;   // Total number of pages
}
```

#### setPage()

Populates the cache with items for a query.

```typescript
async setPage(
  queryKey: string,
  items: T[],
  total: number,
  scoreSelector: (item: T) => number
): Promise<void>
```

**Parameters:**
- `queryKey`: Unique identifier for the query
- `items`: Array of items to cache
- `total`: Total items available in backend
- `scoreSelector`: Function returning numeric score for ZSET ordering

**Example score selectors:**
```typescript
// Chronological ordering (newest first)
(item) => item.timestamp

// Relevance-based ordering
(item) => item.searchScore

// Custom ordering
(item) => item.priority * 1000 + item.timestamp
```

#### invalidateQuery()

Invalidates the cache for a specific query.

```typescript
async invalidateQuery(queryKey: string): Promise<void>
```

**Parameters:**
- `queryKey`: Query identifier to invalidate

**Note:** Only removes the ZSET. Individual item Hashes remain and expire based on TTL.

## Usage Patterns

### Basic Cache-Aside Pattern

```typescript
async function getData(page: number) {
  // Try cache
  let result = await cache.getPage('myquery', page, 10, MySchema);

  if (!result) {
    // Fetch from backend
    const data = await backend.query(page, 10);

    // Populate cache
    await cache.setPage('myquery', data.items, data.total, scoreFunc);

    return data;
  }

  return result;
}
```

### Cache Invalidation on Updates

```typescript
async function addNewArticle(article: Article) {
  // Save to database
  await database.insert(article);

  // Invalidate cache so next request fetches fresh data
  await cache.invalidateQuery('articles:latest');
}
```

### Multiple Query Keys

```typescript
// Cache different queries separately
await cache.setPage('articles:latest', items, total, scoreFunc);
await cache.setPage('articles:trending', items, total, scoreFunc);
await cache.setPage('articles:user:123', items, total, scoreFunc);
```

## Best Practices

### 1. Choose Appropriate TTL

```typescript
// Short TTL for frequently changing data
const newsCache = new HotPageCache({ ttlSeconds: 300 }); // 5 minutes

// Longer TTL for stable data
const archiveCache = new HotPageCache({ ttlSeconds: 86400 }); // 24 hours
```

### 2. Use Descriptive Query Keys

```typescript
// Good
'articles:latest'
'products:category:electronics:bestsellers'
'users:active:lastweek'

// Avoid
'query1'
'data'
'cache'
```

### 3. Handle Cache Failures Gracefully

The library already handles Redis errors by returning `null`, allowing your app to fall back to the backend:

```typescript
const result = await cache.getPage(...);
if (!result) {
  // Could be cache miss or Redis error
  // Either way, fetch from backend
  return await fetchFromBackend();
}
```

### 4. Select Appropriate Scores

```typescript
// Time-based (newest first)
scoreSelector: (item) => item.createdAt

// Time-based (oldest first)
scoreSelector: (item) => -item.createdAt

// Search relevance
scoreSelector: (item) => item.searchScore

// Combined scoring
scoreSelector: (item) => item.popularity * 0.7 + item.recency * 0.3
```

### 5. Monitor Cache Performance

```typescript
async function getDataWithMetrics(page: number) {
  const start = Date.now();
  let result = await cache.getPage(...);

  if (result) {
    console.log(`Cache hit in ${Date.now() - start}ms`);
  } else {
    console.log('Cache miss, fetching from backend...');
    result = await fetchAndCache();
  }

  return result;
}
```

## Performance Considerations

### Redis Operations Complexity

- `getPage()`: O(log(N) + M) where N = total items, M = page size
- `setPage()`: O(K * log(N)) where K = items to cache
- `invalidateQuery()`: O(1)

### Optimization Tips

1. **Batch Operations**: The library uses Redis pipelining automatically
2. **Score Selection**: Use simple numeric values (avoid complex calculations)
3. **Page Size**: Balance between network overhead and granularity (typically 10-100 items)
4. **Shared Items**: Items can be shared across multiple query caches without duplication

### Memory Usage

Approximate memory per cached page:
```
Memory = (Item Count × Average Item Size) + ZSET Overhead
```

ZSET overhead: ~50 bytes per member

## Error Handling

All methods handle Redis errors gracefully:

- `getPage()`: Returns `null` on error
- `setPage()`: Logs error and continues
- `invalidateQuery()`: Logs error and continues

Errors are logged to console. Add custom error handling as needed:

```typescript
class MonitoredHotPageCache<T> extends HotPageCache<T> {
  async getPage(...args) {
    try {
      return await super.getPage(...args);
    } catch (error) {
      await this.notifyErrorTracking(error);
      return null;
    }
  }
}
```

## Testing

Run the example:

```bash
# Install dependencies
npm install

# Start Redis (using Docker)
docker run -d -p 6379:6379 redis:latest

# Run example
npm run example
```

## Requirements

- Node.js 14+
- Redis 5.0+
- TypeScript 4.5+

## License

MIT

## Contributing

Contributions welcome! Please ensure:
- Type safety is maintained
- Error handling follows existing patterns
- Examples are updated for new features
- Tests are included (when test suite is added)
