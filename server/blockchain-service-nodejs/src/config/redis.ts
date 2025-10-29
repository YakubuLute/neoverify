import Redis, { RedisOptions } from 'ioredis';
import config from './env';
import logger from '../utils/logger';

class RedisClient {
    private client: Redis;
    private isConnected: boolean = false;

    constructor() {
        const redisConfig: RedisOptions = {
            host: config.redis.host,
            port: config.redis.port,
            password: config.redis.password,
            db: config.redis.db,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            keepAlive: 30000,
            connectTimeout: 10000,
            commandTimeout: 5000,
        };

        this.client = new Redis(redisConfig);
        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        this.client.on('connect', () => {
            logger.info('Redis client connected');
            this.isConnected = true;
        });

        this.client.on('ready', () => {
            logger.info('Redis client ready');
        });

        this.client.on('error', (error) => {
            logger.error('Redis client error:', error);
            this.isConnected = false;
        });

        this.client.on('close', () => {
            logger.warn('Redis client connection closed');
            this.isConnected = false;
        });

        this.client.on('reconnecting', () => {
            logger.info('Redis client reconnecting...');
        });
    }

    async connect(): Promise<void> {
        try {
            await this.client.connect();
            logger.info('Redis connection established successfully');
        } catch (error) {
            logger.error('Failed to connect to Redis:', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        try {
            await this.client.quit();
            logger.info('Redis connection closed');
        } catch (error) {
            logger.error('Error closing Redis connection:', error);
            throw error;
        }
    }

    getClient(): Redis {
        return this.client;
    }

    isClientConnected(): boolean {
        return this.isConnected;
    }

    // Cache utility methods
    async get(key: string): Promise<string | null> {
        try {
            return await this.client.get(key);
        } catch (error) {
            logger.error(`Redis GET error for key ${key}:`, error);
            return null;
        }
    }

    async set(key: string, value: string, ttl?: number): Promise<boolean> {
        try {
            if (ttl) {
                await this.client.setex(key, ttl, value);
            } else {
                await this.client.set(key, value);
            }
            return true;
        } catch (error) {
            logger.error(`Redis SET error for key ${key}:`, error);
            return false;
        }
    }

    async del(key: string): Promise<boolean> {
        try {
            const result = await this.client.del(key);
            return result > 0;
        } catch (error) {
            logger.error(`Redis DEL error for key ${key}:`, error);
            return false;
        }
    }

    async exists(key: string): Promise<boolean> {
        try {
            const result = await this.client.exists(key);
            return result === 1;
        } catch (error) {
            logger.error(`Redis EXISTS error for key ${key}:`, error);
            return false;
        }
    }

    async expire(key: string, ttl: number): Promise<boolean> {
        try {
            const result = await this.client.expire(key, ttl);
            return result === 1;
        } catch (error) {
            logger.error(`Redis EXPIRE error for key ${key}:`, error);
            return false;
        }
    }

    async hget(key: string, field: string): Promise<string | null> {
        try {
            return await this.client.hget(key, field);
        } catch (error) {
            logger.error(`Redis HGET error for key ${key}, field ${field}:`, error);
            return null;
        }
    }

    async hset(key: string, field: string, value: string): Promise<boolean> {
        try {
            await this.client.hset(key, field, value);
            return true;
        } catch (error) {
            logger.error(`Redis HSET error for key ${key}, field ${field}:`, error);
            return false;
        }
    }

    async hdel(key: string, field: string): Promise<boolean> {
        try {
            const result = await this.client.hdel(key, field);
            return result > 0;
        } catch (error) {
            logger.error(`Redis HDEL error for key ${key}, field ${field}:`, error);
            return false;
        }
    }

    async hgetall(key: string): Promise<Record<string, string> | null> {
        try {
            return await this.client.hgetall(key);
        } catch (error) {
            logger.error(`Redis HGETALL error for key ${key}:`, error);
            return null;
        }
    }

    // Session management methods
    async setSession(sessionId: string, sessionData: any, ttl: number = 3600): Promise<boolean> {
        try {
            const sessionKey = `session:${sessionId}`;
            await this.client.setex(sessionKey, ttl, JSON.stringify(sessionData));
            return true;
        } catch (error) {
            logger.error(`Redis session SET error for session ${sessionId}:`, error);
            return false;
        }
    }

    async getSession(sessionId: string): Promise<any | null> {
        try {
            const sessionKey = `session:${sessionId}`;
            const sessionData = await this.client.get(sessionKey);
            return sessionData ? JSON.parse(sessionData) : null;
        } catch (error) {
            logger.error(`Redis session GET error for session ${sessionId}:`, error);
            return null;
        }
    }

    async deleteSession(sessionId: string): Promise<boolean> {
        try {
            const sessionKey = `session:${sessionId}`;
            const result = await this.client.del(sessionKey);
            return result > 0;
        } catch (error) {
            logger.error(`Redis session DELETE error for session ${sessionId}:`, error);
            return false;
        }
    }

    // Cache with JSON serialization
    async setJSON(key: string, value: any, ttl?: number): Promise<boolean> {
        try {
            const serializedValue = JSON.stringify(value);
            return await this.set(key, serializedValue, ttl);
        } catch (error) {
            logger.error(`Redis JSON SET error for key ${key}:`, error);
            return false;
        }
    }

    async getJSON(key: string): Promise<any | null> {
        try {
            const value = await this.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            logger.error(`Redis JSON GET error for key ${key}:`, error);
            return null;
        }
    }
}

// Create singleton instance
const redisClient = new RedisClient();

export default redisClient;
export { RedisClient };