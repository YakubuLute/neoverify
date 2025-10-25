import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

interface CacheConfig {
    ttl: number; // Time to live in milliseconds
    maxSize?: number; // Maximum number of entries
}

@Injectable({
    providedIn: 'root'
})
export class CacheService {
    private cache = new Map<string, CacheEntry<any>>();
    private observableCache = new Map<string, Observable<any>>();
    private cacheStats = new BehaviorSubject({
        hits: 0,
        misses: 0,
        size: 0
    });

    private readonly defaultConfig: CacheConfig = {
        ttl: 5 * 60 * 1000, // 5 minutes
        maxSize: 100
    };

    /**
     * Get cached data or execute the provided function
     */
    get<T>(key: string, factory: () => Observable<T>, config?: Partial<CacheConfig>): Observable<T> {
        const finalConfig = { ...this.defaultConfig, ...config };

        // Check if we have a valid cached entry
        const cached = this.getCachedEntry<T>(key);
        if (cached) {
            this.updateStats('hit');
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
    getStats(): Observable<{ hits: number; misses: number; size: number }> {
        return this.cacheStats.asObservable();
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

        return entry.data;
    }

    private setCachedEntry<T>(key: string, data: T, config: CacheConfig): void {
        // Enforce max size if specified
        if (config.maxSize && this.cache.size >= config.maxSize) {
            this.evictOldest();
        }

        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl: config.ttl
        };

        this.cache.set(key, entry);
        this.updateCacheSize();
    }

    private evictOldest(): void {
        let oldestKey: string | null = null;
        let oldestTimestamp = Date.now();

        this.cache.forEach((entry, key) => {
            if (entry.timestamp < oldestTimestamp) {
                oldestTimestamp = entry.timestamp;
                oldestKey = key;
            }
        });

        if (oldestKey) {
            this.delete(oldestKey);
        }
    }

    private updateStats(type: 'hit' | 'miss'): void {
        const current = this.cacheStats.value;
        this.cacheStats.next({
            ...current,
            [type === 'hit' ? 'hits' : 'misses']: current[type === 'hit' ? 'hits' : 'misses'] + 1
        });
    }

    private updateCacheSize(): void {
        const current = this.cacheStats.value;
        this.cacheStats.next({
            ...current,
            size: this.cache.size
        });
    }
}