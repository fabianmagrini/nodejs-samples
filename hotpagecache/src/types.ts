import { Redis } from 'ioredis';
import { ZodSchema } from 'zod';

/**
 * Configuration options for HotPageCache
 */
export interface HotPageCacheConfig {
  /** An initialized ioredis client instance */
  redisClient: Redis;
  /** The time-to-live for all cache entries in seconds */
  ttlSeconds: number;
  /** A prefix for all Redis keys to ensure namespacing */
  cacheKeyPrefix: string;
}

/**
 * Base type constraint for cached items - must have an id property
 */
export type CacheableItem = {
  id: string | number;
  [key: string]: any;
};

/**
 * Result of a paginated query
 */
export interface PaginatedResult<T> {
  /** The items on the current page */
  items: T[];
  /** The current page number (1-based) */
  page: number;
  /** The number of items per page */
  pageSize: number;
  /** The total number of items available for this query */
  total: number;
  /** The total number of pages */
  totalPages: number;
}

/**
 * Type for the score selector function
 */
export type ScoreSelector<T> = (item: T) => number;
