import Redis from 'ioredis';
import { z } from 'zod';
import { HotPageCache } from '../src';

// Define a schema for your data using Zod
const ArticleSchema = z.object({
  id: z.number(),
  title: z.string(),
  author: z.string(),
  publishedAt: z.number(), // Unix timestamp
  content: z.string(),
});

type Article = z.infer<typeof ArticleSchema>;

// Simulated backend data source (e.g., Elasticsearch or Cassandra)
async function fetchArticlesFromBackend(
  page: number,
  pageSize: number
): Promise<{ items: Article[]; total: number }> {
  // Simulate database query
  console.log(
    `[Backend] Fetching articles from backend for page ${page}, pageSize ${pageSize}`
  );

  const allArticles: Article[] = [
    {
      id: 1,
      title: 'Introduction to Redis',
      author: 'Alice',
      publishedAt: Date.now() - 86400000,
      content: 'Redis is an in-memory data structure store...',
    },
    {
      id: 2,
      title: 'TypeScript Best Practices',
      author: 'Bob',
      publishedAt: Date.now() - 172800000,
      content: 'TypeScript provides strong typing for JavaScript...',
    },
    {
      id: 3,
      title: 'Understanding Pagination',
      author: 'Charlie',
      publishedAt: Date.now() - 259200000,
      content: 'Pagination helps manage large datasets...',
    },
    {
      id: 4,
      title: 'Cache Strategies',
      author: 'Diana',
      publishedAt: Date.now() - 345600000,
      content: 'Effective caching can significantly improve performance...',
    },
    {
      id: 5,
      title: 'Node.js Performance',
      author: 'Eve',
      publishedAt: Date.now() - 432000000,
      content: 'Node.js offers excellent performance for I/O operations...',
    },
  ];

  const start = (page - 1) * pageSize;
  const items = allArticles.slice(start, start + pageSize);

  return {
    items,
    total: allArticles.length,
  };
}

async function main() {
  // Initialize Redis client
  const redisClient = new Redis({
    host: 'localhost',
    port: 6379,
    // Add more configuration as needed
  });

  // Initialize HotPageCache
  const cache = new HotPageCache<Article>({
    redisClient,
    ttlSeconds: 3600, // 1 hour
    cacheKeyPrefix: 'myapp',
  });

  const queryKey = 'articles:latest';
  const page = 1;
  const pageSize = 3;

  console.log('\n=== First Request (Cache Miss) ===');
  // Try to get from cache
  let result = await cache.getPage(queryKey, page, pageSize, ArticleSchema);

  if (!result) {
    console.log('Cache miss! Fetching from backend...');

    // Fetch from backend
    const { items, total } = await fetchArticlesFromBackend(page, pageSize);

    // Populate the cache
    await cache.setPage(
      queryKey,
      items,
      total,
      (article) => article.publishedAt // Use timestamp as score for ordering
    );

    console.log(`Fetched ${items.length} articles from backend and cached them`);
    console.log('Articles:', items.map((a) => ({ id: a.id, title: a.title })));
  } else {
    console.log('Cache hit!');
    console.log('Result:', result);
  }

  console.log('\n=== Second Request (Cache Hit) ===');
  // Try again - should be a cache hit
  result = await cache.getPage(queryKey, page, pageSize, ArticleSchema);

  if (result) {
    console.log('Cache hit! Retrieved from cache:');
    console.log(`Page ${result.page} of ${result.totalPages}`);
    console.log(`Total items: ${result.total}`);
    console.log(
      'Articles:',
      result.items.map((a) => ({ id: a.id, title: a.title }))
    );
  }

  console.log('\n=== Testing Page 2 (Cache Miss) ===');
  // Request page 2
  const page2Result = await cache.getPage(
    queryKey,
    2,
    pageSize,
    ArticleSchema
  );

  if (!page2Result) {
    console.log('Cache miss for page 2! Fetching from backend...');
    const { items, total } = await fetchArticlesFromBackend(2, pageSize);

    await cache.setPage(queryKey, items, total, (article) => article.publishedAt);

    console.log(`Fetched ${items.length} articles from backend for page 2`);
    console.log('Articles:', items.map((a) => ({ id: a.id, title: a.title })));
  }

  console.log('\n=== Cache Invalidation ===');
  // Invalidate the cache
  await cache.invalidateQuery(queryKey);
  console.log('Cache invalidated for query:', queryKey);

  // Try to get from cache after invalidation
  result = await cache.getPage(queryKey, page, pageSize, ArticleSchema);
  console.log('After invalidation, cache result:', result);

  // Clean up
  await redisClient.quit();
  console.log('\n=== Example Complete ===');
}

// Run the example
main().catch((error) => {
  console.error('Error running example:', error);
  process.exit(1);
});
