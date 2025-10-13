import { Redis } from 'ioredis';
import { ZodSchema } from 'zod';
import {
  HotPageCacheConfig,
  CacheableItem,
  PaginatedResult,
  ScoreSelector,
} from './types';

/**
 * HotPageCache: A high-performance cache for paginated data using Redis
 *
 * Uses Redis Sorted Sets (ZSETs) for ordering and Hashes for data storage.
 * Implements the cache-aside pattern for optimal performance.
 */
export class HotPageCache<T extends CacheableItem> {
  private redisClient: Redis;
  private ttlSeconds: number;
  private cacheKeyPrefix: string;

  constructor(config: HotPageCacheConfig) {
    this.redisClient = config.redisClient;
    this.ttlSeconds = config.ttlSeconds;
    this.cacheKeyPrefix = config.cacheKeyPrefix;
  }

  /**
   * Generates the Redis key for a ZSET
   */
  private getZSetKey(queryKey: string): string {
    return `${this.cacheKeyPrefix}:zset:${queryKey}`;
  }

  /**
   * Generates the Redis key for a Hash
   */
  private getHashKey(itemId: string | number): string {
    return `${this.cacheKeyPrefix}:hash:${itemId}`;
  }

  /**
   * Retrieves a page of data from the cache
   *
   * @param queryKey - A unique string identifying the cached query
   * @param page - The 1-based page number to retrieve
   * @param pageSize - The number of items per page
   * @param schema - A Zod schema used to validate the retrieved items
   * @returns A PaginatedResult object on cache hit, or null on cache miss/error
   */
  async getPage(
    queryKey: string,
    page: number,
    pageSize: number,
    schema: ZodSchema<T>
  ): Promise<PaginatedResult<T> | null> {
    try {
      const zsetKey = this.getZSetKey(queryKey);

      // Check if the ZSET exists
      const exists = await this.redisClient.exists(zsetKey);
      if (!exists) {
        return null;
      }

      // Calculate the range for the requested page
      // Pages are 1-based, but Redis ranges are 0-based
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;

      // Get the total count of items in the ZSET
      const total = await this.redisClient.zcard(zsetKey);

      // Retrieve the item IDs for this page (ordered by score, descending)
      const itemIds = await this.redisClient.zrevrange(zsetKey, start, end);

      if (itemIds.length === 0) {
        return null;
      }

      // Fetch all items in a pipeline for efficiency
      const pipeline = this.redisClient.pipeline();
      for (const itemId of itemIds) {
        pipeline.hgetall(this.getHashKey(itemId));
      }

      const results = await pipeline.exec();
      if (!results) {
        return null;
      }

      // Parse and validate the items
      const items: T[] = [];
      for (const [error, data] of results) {
        if (error || !data || Object.keys(data).length === 0) {
          continue;
        }

        try {
          // Deserialize the hash data
          const deserializedData: any = {};
          for (const [field, value] of Object.entries(data)) {
            try {
              deserializedData[field] = JSON.parse(value as string);
            } catch {
              // If JSON.parse fails, use the raw value
              deserializedData[field] = value;
            }
          }

          // Validate with Zod schema
          const validatedItem = schema.parse(deserializedData);
          items.push(validatedItem);
        } catch (validationError) {
          // Skip invalid items
          console.warn(`Cache validation failed for item:`, validationError);
          continue;
        }
      }

      const totalPages = Math.ceil(total / pageSize);

      return {
        items,
        page,
        pageSize,
        total,
        totalPages,
      };
    } catch (error) {
      console.error('Error retrieving page from cache:', error);
      return null;
    }
  }

  /**
   * Populates the cache with a set of items for a given query
   *
   * @param queryKey - The unique string identifying the query
   * @param items - An array of data items to cache
   * @param total - The total number of items available for this query
   * @param scoreSelector - A function that returns a numeric score for ordering
   */
  async setPage(
    queryKey: string,
    items: T[],
    total: number,
    scoreSelector: ScoreSelector<T>
  ): Promise<void> {
    try {
      const zsetKey = this.getZSetKey(queryKey);
      const pipeline = this.redisClient.pipeline();

      // Store each item in its own hash
      for (const item of items) {
        const hashKey = this.getHashKey(item.id);
        const serializedItem: Record<string, string> = {};

        // Serialize each property
        for (const [key, value] of Object.entries(item)) {
          serializedItem[key] = JSON.stringify(value);
        }

        pipeline.hset(hashKey, serializedItem);
        pipeline.expire(hashKey, this.ttlSeconds);

        // Add the item ID to the ZSET with its score
        const score = scoreSelector(item);
        pipeline.zadd(zsetKey, score, String(item.id));
      }

      // Set TTL on the ZSET
      pipeline.expire(zsetKey, this.ttlSeconds);

      await pipeline.exec();
    } catch (error) {
      console.error('Error setting page in cache:', error);
    }
  }

  /**
   * Deletes the ZSET associated with a query, invalidating the cache
   *
   * Note: This does not delete individual item Hashes, as they may be
   * part of other cached queries. They will expire based on their TTL.
   *
   * @param queryKey - The key of the query to invalidate
   */
  async invalidateQuery(queryKey: string): Promise<void> {
    try {
      const zsetKey = this.getZSetKey(queryKey);
      await this.redisClient.del(zsetKey);
    } catch (error) {
      console.error('Error invalidating query cache:', error);
    }
  }
}
