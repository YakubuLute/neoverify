import redisClient from '../config/redis';
import logger from '../utils/logger';

export interface CacheOptions {
    ttl?: number; // Time to live in seconds
    prefix?: string; // Key prefix
}

class CacheService {
    private defaultTTL: number = 3600; // 1 hour
    private defaultPrefix: string = 'neoverify';

    /**
     * Generate cache key with optional prefix
     */
    private generateKey(key: string, prefix?: string): string {
        const keyPrefix = prefix || this.defaultPrefix;
        return `${keyPrefix}:${key}`;
    }

    /**
     * Cache a value with optional TTL
     */
    async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
        try {
            const cacheKey = this.generateKey(key, options.prefix);
            const ttl = options.ttl || this.defaultTTL;

            if (typeof value === 'object') {
                return await redisClient.setJSON(cacheKey, value, ttl);
            } else {
                return await redisClient.set(cacheKey, String(value), ttl);
            }
        } catch (error) {
            logger.error(`Cache SET error for key ${key}:`, error);
            return false;
        }
    }

    /**
     * Get cached value
     */
    async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
        try {
            const cacheKey = this.generateKey(key, options.prefix);

            // Try to get as JSON first, fallback to string
            const jsonValue = await redisClient.getJSON(cacheKey);
            if (jsonValue !== null) {
                return jsonValue as T;
            }

            const stringValue = await redisClient.get(cacheKey);
            return stringValue as T;
        } catch (error) {
            logger.error(`Cache GET error for key ${key}:`, error);
            return null;
        }
    }

    /**
     * Delete cached value
     */
    async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
        try {
            const cacheKey = this.generateKey(key, options.prefix);
            return await redisClient.del(cacheKey);
        } catch (error) {
            logger.error(`Cache DELETE error for key ${key}:`, error);
            return false;
        }
    }

    /**
     * Check if key exists in cache
     */
    async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
        try {
            const cacheKey = this.generateKey(key, options.prefix);
            return await redisClient.exists(cacheKey);
        } catch (error) {
            logger.error(`Cache EXISTS error for key ${key}:`, error);
            return false;
        }
    }

    /**
     * Set expiration for existing key
     */
    async expire(key: string, ttl: number, options: CacheOptions = {}): Promise<boolean> {
        try {
            const cacheKey = this.generateKey(key, options.prefix);
            return await redisClient.expire(cacheKey, ttl);
        } catch (error) {
            logger.error(`Cache EXPIRE error for key ${key}:`, error);
            return false;
        }
    }

    /**
     * Cache with automatic refresh using a function
     */
    async getOrSet<T>(
        key: string,
        fetchFunction: () => Promise<T>,
        options: CacheOptions = {}
    ): Promise<T | null> {
        try {
            // Try to get from cache first
            const cachedValue = await this.get<T>(key, options);
            if (cachedValue !== null) {
                return cachedValue;
            }

            // If not in cache, fetch and cache the value
            const freshValue = await fetchFunction();
            await this.set(key, freshValue, options);
            return freshValue;
        } catch (error) {
            logger.error(`Cache getOrSet error for key ${key}:`, error);
            return null;
        }
    }

    /**
     * User-specific caching
     */
    async setUserCache(userId: string, key: string, value: any, ttl?: number): Promise<boolean> {
        const userKey = `user:${userId}:${key}`;
        return await this.set(userKey, value, { ttl });
    }

    async getUserCache<T>(userId: string, key: string): Promise<T | null> {
        const userKey = `user:${userId}:${key}`;
        return await this.get<T>(userKey);
    }

    async deleteUserCache(userId: string, key: string): Promise<boolean> {
        const userKey = `user:${userId}:${key}`;
        return await this.delete(userKey);
    }

    /**
     * Organization-specific caching
     */
    async setOrgCache(orgId: string, key: string, value: any, ttl?: number): Promise<boolean> {
        const orgKey = `org:${orgId}:${key}`;
        return await this.set(orgKey, value, { ttl });
    }

    async getOrgCache<T>(orgId: string, key: string): Promise<T | null> {
        const orgKey = `org:${orgId}:${key}`;
        return await this.get<T>(orgKey);
    }

    async deleteOrgCache(orgId: string, key: string): Promise<boolean> {
        const orgKey = `org:${orgId}:${key}`;
        return await this.delete(orgKey);
    }

    /**
     * Session management
     */
    async setSession(sessionId: string, sessionData: any, ttl: number = 3600): Promise<boolean> {
        return await redisClient.setSession(sessionId, sessionData, ttl);
    }

    async getSession(sessionId: string): Promise<any | null> {
        return await redisClient.getSession(sessionId);
    }

    async deleteSession(sessionId: string): Promise<boolean> {
        return await redisClient.deleteSession(sessionId);
    }

    /**
     * Rate limiting support
     */
    async incrementCounter(key: string, ttl: number = 3600): Promise<number> {
        try {
            const cacheKey = this.generateKey(key, 'rate_limit');
            const client = redisClient.getClient();

            const multi = client.multi();
            multi.incr(cacheKey);
            multi.expire(cacheKey, ttl);

            const results = await multi.exec();
            return results?.[0]?.[1] as number || 0;
        } catch (error) {
            logger.error(`Rate limit counter error for key ${key}:`, error);
            return 0;
        }
    }

    /**
     * Bulk operations
     */
    async mget(keys: string[], options: CacheOptions = {}): Promise<(any | null)[]> {
        try {
            const cacheKeys = keys.map(key => this.generateKey(key, options.prefix));
            const client = redisClient.getClient();
            const values = await client.mget(...cacheKeys);

            return values.map(value => {
                if (value === null) return null;
                try {
                    return JSON.parse(value);
                } catch {
                    return value;
                }
            });
        } catch (error) {
            logger.error('Cache MGET error:', error);
            return keys.map(() => null);
        }
    }

    async mset(keyValuePairs: Array<{ key: string; value: any }>, options: CacheOptions = {}): Promise<boolean> {
        try {
            const client = redisClient.getClient();
            const multi = client.multi();

            keyValuePairs.forEach(({ key, value }) => {
                const cacheKey = this.generateKey(key, options.prefix);
                const serializedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

                if (options.ttl) {
                    multi.setex(cacheKey, options.ttl, serializedValue);
                } else {
                    multi.set(cacheKey, serializedValue);
                }
            });

            await multi.exec();
            return true;
        } catch (error) {
            logger.error('Cache MSET error:', error);
            return false;
        }
    }
}

// Create singleton instance
const cacheService = new CacheService();

export default cacheService;
export { CacheService };