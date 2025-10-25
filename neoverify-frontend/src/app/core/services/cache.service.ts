import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
    accessCount: number;
    lastAccessed: number;
    size?: number; // Memory size estimation
}

interface CacheConfig {
    ttl: number; // Time to live in milliseconds
    maxSize?: number; // Maximum number of entries
    maxMemorySize?: number; // Maximum memory size in bytes
    evictionPolicy?: 'lru' | 'lfu' | 'fifo'; // Eviction policy
}

interface CacheStats {
    hits: number;
    misses: number;
    size: number;
    memoryUsage: number;
    hitRate: number;
    evictions: number;
}

@Injectable({
    providedIn: 'root'
})
export class CacheService {
    private cache = new Map<string, CacheEntry<any>>();
    private observableCache = new Map<string, Observable<any>>();
    private accessOrder: string[] = []; // For LRU tracking
    private cacheStats = new BehaviorSubject<CacheStats>({
        hits: 0,
        misses: 0,
        size: 0,
        memoryUsage: 0,
        hitRate: 0,
        evictions: 0
    });

    private readonly defaultConfig: CacheConfig = {
        ttl: 5 * 60 * 1000, // 5 minutes
        maxSize: 500, // Increased default size
        maxMemorySize: 50 * 1024 * 1024, // 50MB
        evictionPolicy: 'lru'
    };

    // Performance monitoring
    private performanceMetrics = {
        averageAccessTime: 0,
        totalAccesses: 0,
        slowQueries: new Map<string, number>()
    };

    /**
     * Get cached data or execute the provided function
     */
    get<T>(key: string, factory: () => Observable<T>, config?: Partial<CacheConfig>): Observable<T> {
        const startTime = performance.now();
        const finalConfig = { ...this.defaultConfig, ...config };

        // Check if we have a valid cached entry
        const cached = this.getCachedEntry<T>(key);
        if (cached) {
            this.updateAccessMetrics(key, performance.now() - startTime);
            this.updateStats('hit');
            this.updateAccessOrder(key);
            return of(cached);
        }

        // Check if we have an ongoing observable for this key
        const ongoingObservable = this.observableCache.get(key);
        if (ongoingObservable) {
            return ongoingObservable;
        }

        // Create new observable and cache it
        const observable = factory().pipe(
            tap(data => {
                this.setCachedEntry(key, data, finalConfig);
                this.observableCache.delete(key);
                this.updateAccessMetrics(key, performance.now() - startTime);
            }),
            shareReplay(1)
        );

        this.observableCache.set(key, observable);
        this.updateStats('miss');

        return observable;
    }

    /**
     * Set data in cache
     */
    set<T>(key: string, data: T, config?: Partial<CacheConfig>): void {
        const finalConfig = { ...this.defaultConfig, ...config };
        this.setCachedEntry(key, data, finalConfig);
    }

    /**
     * Get data from cache without factory function
     */
    getSync<T>(key: string): T | null {
        return this.getCachedEntry<T>(key);
    }

    /**
     * Remove specific entry from cache
     */
    delete(key: string): boolean {
        const deleted = this.cache.delete(key);
        this.observableCache.delete(key);
        this.updateCacheSize();
        return deleted;
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
        this.observableCache.clear();
        this.updateCacheSize();
    }

    /**
     * Clear expired entries
     */
    clearExpired(): void {
        const now = Date.now();
        const expiredKeys: string[] = [];

        this.cache.forEach((entry, key) => {
            if (now > entry.timestamp + entry.ttl) {
                expiredKeys.push(key);
            }
        });

        expiredKeys.forEach(key => this.delete(key));
    }

    /**
     * Get cache statistics
     */
    getStats(): Observable<CacheStats> {
        return this.cacheStats.asObservable();
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics(): any {
        return {
            ...this.performanceMetrics,
            cacheEfficiency: this.calculateCacheEfficiency(),
            memoryEfficiency: this.calculateMemoryEfficiency(),
            topSlowQueries: Array.from(this.performanceMetrics.slowQueries.entries())
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
        };
    }

    /**
     * Warm up cache with frequently accessed items
     */
    warmUp(items: Array<{ key: string; factory: () => Observable<any>; config?: Partial<CacheConfig> }>): void {
        items.forEach(item => {
            if (!this.has(item.key)) {
                this.get(item.key, item.factory, item.config).subscribe();
            }
        });
    }

    /**
     * Prefetch items based on usage patterns
     */
    prefetch(keys: string[], factory: (key: string) => Observable<any>): void {
        const prefetchBatch = keys.filter(key => !this.has(key)).slice(0, 5); // Limit batch size

        prefetchBatch.forEach(key => {
            this.get(key, () => factory(key), { ttl: this.defaultConfig.ttl }).subscribe();
        });
    }

    /**
     * Invalidate cache entries by pattern
     */
    invalidatePattern(pattern: string): void {
        const regex = new RegExp(pattern);
        const keysToDelete: string[] = [];

        this.cache.forEach((_, key) => {
            if (regex.test(key)) {
                keysToDelete.push(key);
            }
        });

        keysToDelete.forEach(key => this.delete(key));
    }

    /**
     * Get cache size
     */
    getSize(): number {
        return this.cache.size;
    }

    /**
     * Check if cache has key
     */
    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;

        const now = Date.now();
        if (now > entry.timestamp + entry.ttl) {
            this.delete(key);
            return false;
        }

        return true;
    }

    private getCachedEntry<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        const now = Date.now();
        if (now > entry.timestamp + entry.ttl) {
            this.delete(key);
            return null;
        }

        // Update access tracking
        entry.accessCount++;
        entry.lastAccessed = now;

        return entry.data;
    }

    private setCachedEntry<T>(key: string, data: T, config: CacheConfig): void {
        const now = Date.now();
        const estimatedSize = this.estimateSize(data);

        // Check memory constraints
        if (config.maxMemorySize && this.getCurrentMemoryUsage() + estimatedSize > config.maxMemorySize) {
            this.evictByMemory(estimatedSize);
        }

        // Check size constraints
        if (config.maxSize && this.cache.size >= config.maxSize) {
            this.evictByPolicy(config.evictionPolicy || 'lru');
        }

        const entry: CacheEntry<T> = {
            data,
            timestamp: now,
            ttl: config.ttl,
            accessCount: 1,
            lastAccessed: now,
            size: estimatedSize
        };

        this.cache.set(key, entry);
        this.updateAccessOrder(key);
        this.updateCacheSize();
    }

    private evictByPolicy(policy: string): void {
        let keyToEvict: string | null = null;

        switch (policy) {
            case 'lru':
                keyToEvict = this.accessOrder[0] || null;
                break;
            case 'lfu':
                keyToEvict = this.findLeastFrequentlyUsed();
                break;
            case 'fifo':
            default:
                keyToEvict = this.findOldest();
                break;
        }

        if (keyToEvict) {
            this.delete(keyToEvict);
            this.updateStats('eviction');
        }
    }

    private evictByMemory(requiredSize: number): void {
        let freedMemory = 0;
        const keysToEvict: string[] = [];

        // Sort by access order (LRU first)
        const sortedKeys = [...this.accessOrder];

        for (const key of sortedKeys) {
            const entry = this.cache.get(key);
            if (entry && entry.size) {
                keysToEvict.push(key);
                freedMemory += entry.size;

                if (freedMemory >= requiredSize) {
                    break;
                }
            }
        }

        keysToEvict.forEach(key => {
            this.delete(key);
            this.updateStats('eviction');
        });
    }

    private findLeastFrequentlyUsed(): string | null {
        let leastUsedKey: string | null = null;
        let minAccessCount = Infinity;

        this.cache.forEach((entry, key) => {
            if (entry.accessCount < minAccessCount) {
                minAccessCount = entry.accessCount;
                leastUsedKey = key;
            }
        });

        return leastUsedKey;
    }

    private findOldest(): string | null {
        let oldestKey: string | null = null;
        let oldestTimestamp = Date.now();

        this.cache.forEach((entry, key) => {
            if (entry.timestamp < oldestTimestamp) {
                oldestTimestamp = entry.timestamp;
                oldestKey = key;
            }
        });

        return oldestKey;
    }

    private updateStats(type: 'hit' | 'miss' | 'eviction'): void {
        const current = this.cacheStats.value;
        const updates: Partial<CacheStats> = {};

        if (type === 'hit') {
            updates.hits = current.hits + 1;
        } else if (type === 'miss') {
            updates.misses = current.misses + 1;
        } else if (type === 'eviction') {
            updates.evictions = current.evictions + 1;
        }

        // Calculate hit rate
        const totalRequests = (current.hits + updates.hits || current.hits) + (current.misses + updates.misses || current.misses);
        updates.hitRate = totalRequests > 0 ? ((current.hits + updates.hits || current.hits) / totalRequests) * 100 : 0;

        this.cacheStats.next({
            ...current,
            ...updates
        });
    }

    private updateCacheSize(): void {
        const current = this.cacheStats.value;
        this.cacheStats.next({
            ...current,
            size: this.cache.size,
            memoryUsage: this.getCurrentMemoryUsage()
        });
    }

    private updateAccessOrder(key: string): void {
        // Remove key if it exists
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }

        // Add to end (most recently used)
        this.accessOrder.push(key);
    }

    private updateAccessMetrics(key: string, accessTime: number): void {
        this.performanceMetrics.totalAccesses++;

        // Update average access time
        const currentAvg = this.performanceMetrics.averageAccessTime;
        const totalAccesses = this.performanceMetrics.totalAccesses;
        this.performanceMetrics.averageAccessTime =
            (currentAvg * (totalAccesses - 1) + accessTime) / totalAccesses;

        // Track slow queries (> 100ms)
        if (accessTime > 100) {
            const currentCount = this.performanceMetrics.slowQueries.get(key) || 0;
            this.performanceMetrics.slowQueries.set(key, currentCount + 1);
        }
    }

    private estimateSize(data: any): number {
        try {
            return new Blob([JSON.stringify(data)]).size;
        } catch {
            // Fallback estimation
            return JSON.stringify(data).length * 2; // Rough estimate for UTF-16
        }
    }

    private getCurrentMemoryUsage(): number {
        let totalSize = 0;
        this.cache.forEach(entry => {
            totalSize += entry.size || 0;
        });
        return totalSize;
    }

    private calculateCacheEfficiency(): number {
        const stats = this.cacheStats.value;
        const totalRequests = stats.hits + stats.misses;
        return totalRequests > 0 ? (stats.hits / totalRequests) * 100 : 0;
    }

    private calculateMemoryEfficiency(): number {
        const maxMemory = this.defaultConfig.maxMemorySize || 50 * 1024 * 1024;
        const currentUsage = this.getCurrentMemoryUsage();
        return (currentUsage / maxMemory) * 100;
    }
}