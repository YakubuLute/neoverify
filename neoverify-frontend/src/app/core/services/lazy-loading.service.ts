import { Injectable, inject } from '@angular/core';
import { Observable, of, BehaviorSubject, combineLatest } from 'rxjs';
import { map, switchMap, catchError, distinctUntilChanged, debounceTime, tap } from 'rxjs/operators';
import { CacheService } from './cache.service';
import { DocumentService } from './document.service';

export interface LazyLoadConfig {
    rootMargin?: string;
    threshold?: number;
    debounceTime?: number;
    maxConcurrentLoads?: number;
    retryAttempts?: number;
    retryDelay?: number;
}

export interface LazyLoadItem {
    id: string;
    type: 'thumbnail' | 'metadata' | 'content';
    priority?: number;
    retryCount?: number;
}

export interface LazyLoadStats {
    totalRequests: number;
    successfulLoads: number;
    failedLoads: number;
    cacheHits: number;
    averageLoadTime: number;
    queueSize: number;
}

@Injectable({
    providedIn: 'root'
})
export class LazyLoadingService {
    private readonly cacheService = inject(CacheService);
    private readonly documentService = inject(DocumentService);

    private intersectionObserver?: IntersectionObserver;
    private loadQueue = new BehaviorSubject<LazyLoadItem[]>([]);
    private loadingItems = new Set<string>();
    private concurrentLoads = 0;
    private loadStats = new BehaviorSubject<LazyLoadStats>({
        totalRequests: 0,
        successfulLoads: 0,
        failedLoads: 0,
        cacheHits: 0,
        averageLoadTime: 0,
        queueSize: 0
    });

    private readonly defaultConfig: LazyLoadConfig = {
        rootMargin: '100px', // Increased for better preloading
        threshold: 0.1,
        debounceTime: 50, // Reduced for better responsiveness
        maxConcurrentLoads: 6, // Limit concurrent requests
        retryAttempts: 3,
        retryDelay: 1000
    };

    // Performance tracking
    private loadTimes: number[] = [];
    private readonly maxLoadTimeHistory = 100;

    constructor() {
        this.initializeIntersectionObserver();
        this.processLoadQueue();
    }

    /**
     * Observe element for lazy loading
     */
    observe(element: Element, item: LazyLoadItem): void {
        if (!this.intersectionObserver) return;

        // Store item data on element for retrieval in callback
        (element as any).__lazyLoadItem = item;
        this.intersectionObserver.observe(element);
    }

    /**
     * Stop observing element
     */
    unobserve(element: Element): void {
        if (!this.intersectionObserver) return;
        this.intersectionObserver.unobserve(element);
    }

    /**
     * Load thumbnail for document with performance tracking
     */
    loadThumbnail(documentId: string): Observable<string> {
        const startTime = performance.now();
        const cacheKey = `thumbnail:${documentId}`;

        // Check if already cached
        if (this.cacheService.has(cacheKey)) {
            this.updateStats('cacheHit');
            return this.cacheService.get(
                cacheKey,
                () => this.documentService.generateThumbnail(documentId),
                { ttl: 60 * 60 * 1000 } // 1 hour for thumbnails
            );
        }

        this.updateStats('request');

        return this.cacheService.get(
            cacheKey,
            () => this.documentService.generateThumbnail(documentId),
            { ttl: 60 * 60 * 1000 }
        ).pipe(
            tap(() => {
                const loadTime = performance.now() - startTime;
                this.trackLoadTime(loadTime);
                this.updateStats('success');
            }),
            catchError(error => {
                this.updateStats('failure');
                console.warn(`Failed to load thumbnail for document ${documentId}:`, error);
                return of('/assets/images/document-placeholder.svg');
            })
        );
    }

    /**
     * Load document metadata with performance tracking
     */
    loadMetadata(documentId: string): Observable<any> {
        const startTime = performance.now();
        const cacheKey = `metadata:${documentId}`;

        // Check if already cached
        if (this.cacheService.has(cacheKey)) {
            this.updateStats('cacheHit');
            return this.cacheService.get(
                cacheKey,
                () => this.documentService.getDocument(documentId).pipe(
                    map(doc => ({
                        title: doc.originalName,
                        description: doc.description,
                        fileSize: doc.size,
                        uploadedAt: doc.createdAt,
                        tags: doc.tags,
                        status: null,
                        verificationStatus: doc.verificationStatus
                    }))
                ),
                { ttl: 15 * 60 * 1000 } // 15 minutes for metadata
            );
        }

        this.updateStats('request');

        return this.cacheService.get(
            cacheKey,
            () => this.documentService.getDocument(documentId).pipe(
                map(doc => ({
                    title: doc.filename,
                    description: doc.description,
                    fileSize: doc.size,
                    uploadedAt: doc.createdAt,
                    tags: doc.tags,
                    status: null,
                    verificationStatus: doc.verificationStatus
                }))
            ),
            { ttl: 15 * 60 * 1000 }
        ).pipe(
            tap(() => {
                const loadTime = performance.now() - startTime;
                this.trackLoadTime(loadTime);
                this.updateStats('success');
            }),
            catchError(error => {
                this.updateStats('failure');
                console.warn(`Failed to load metadata for document ${documentId}:`, error);
                return of(null);
            })
        );
    }

    /**
     * Preload items based on priority with intelligent batching
     */
    preload(items: LazyLoadItem[]): void {
        const sortedItems = items.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        const currentQueue = this.loadQueue.value;

        // Filter out items that are already cached or loading
        const newItems = sortedItems.filter(item => {
            const key = `${item.type}:${item.id}`;
            return !this.cacheService.has(key) &&
                !this.loadingItems.has(key) &&
                !currentQueue.some(existing => existing.id === item.id && existing.type === item.type);
        });

        if (newItems.length > 0) {
            // Limit queue size to prevent memory issues
            const maxQueueSize = 50;
            const updatedQueue = [...currentQueue, ...newItems].slice(0, maxQueueSize);
            this.loadQueue.next(updatedQueue);
            this.updateQueueSize(updatedQueue.length);
        }
    }

    /**
     * Preload items in viewport with predictive loading
     */
    preloadViewport(visibleItems: any[], allItems: any[], viewportIndex: number): void {
        const preloadRange = 10; // Items to preload ahead
        const startIndex = Math.max(0, viewportIndex - 5);
        const endIndex = Math.min(allItems.length, viewportIndex + preloadRange);

        const itemsToPreload: LazyLoadItem[] = [];

        for (let i = startIndex; i < endIndex; i++) {
            const item = allItems[i];
            if (item) {
                // Higher priority for items closer to viewport
                const distance = Math.abs(i - viewportIndex);
                const priority = Math.max(1, 10 - distance);

                itemsToPreload.push(
                    { id: item.id, type: 'thumbnail', priority },
                    { id: item.id, type: 'metadata', priority: priority - 1 }
                );
            }
        }

        this.preload(itemsToPreload);
    }

    /**
     * Clear loading queue
     */
    clearQueue(): void {
        this.loadQueue.next([]);
    }

    /**
     * Get loading status for item
     */
    isLoading(id: string, type: string): boolean {
        return this.loadingItems.has(`${type}:${id}`);
    }

    /**
     * Check if item is cached
     */
    isCached(id: string, type: string): boolean {
        return this.cacheService.has(`${type}:${id}`);
    }

    /**
     * Invalidate cache for document
     */
    invalidateDocument(documentId: string): void {
        this.cacheService.invalidatePattern(`^(thumbnail|metadata|content):${documentId}$`);
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): Observable<{ hits: number; misses: number; size: number }> {
        return this.cacheService.getStats();
    }

    /**
     * Get lazy loading statistics
     */
    getLoadStats(): Observable<LazyLoadStats> {
        return this.loadStats.asObservable();
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics(): any {
        return {
            averageLoadTime: this.calculateAverageLoadTime(),
            loadTimePercentiles: this.calculateLoadTimePercentiles(),
            cacheEfficiency: this.calculateCacheEfficiency(),
            queueEfficiency: this.calculateQueueEfficiency(),
            concurrentLoads: this.concurrentLoads,
            maxConcurrentLoads: this.defaultConfig.maxConcurrentLoads
        };
    }

    /**
     * Optimize cache based on usage patterns
     */
    optimizeCache(): void {
        // Warm up frequently accessed items
        const frequentItems = this.getFrequentlyAccessedItems();
        this.cacheService.warmUp(frequentItems);

        // Clear expired entries
        this.cacheService.clearExpired();

        // Prefetch related items
        this.prefetchRelatedItems();
    }

    private initializeIntersectionObserver(config?: LazyLoadConfig): void {
        if (typeof IntersectionObserver === 'undefined') {
            console.warn('IntersectionObserver not supported, lazy loading disabled');
            return;
        }

        const finalConfig = { ...this.defaultConfig, ...config };

        this.intersectionObserver = new IntersectionObserver(
            (entries) => {
                const itemsToLoad: LazyLoadItem[] = [];

                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const item = (entry.target as any).__lazyLoadItem as LazyLoadItem;
                        if (item && !this.isLoading(item.id, item.type)) {
                            itemsToLoad.push(item);
                            this.intersectionObserver?.unobserve(entry.target);
                        }
                    }
                });

                if (itemsToLoad.length > 0) {
                    this.preload(itemsToLoad);
                }
            },
            {
                rootMargin: finalConfig.rootMargin,
                threshold: finalConfig.threshold
            }
        );
    }

    private processLoadQueue(): void {
        this.loadQueue.pipe(
            debounceTime(this.defaultConfig.debounceTime || 100),
            distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
        ).subscribe(queue => {
            if (queue.length === 0) return;

            // Process items in batches to avoid overwhelming the system
            const batchSize = 3;
            const batch = queue.slice(0, batchSize);
            const remaining = queue.slice(batchSize);

            // Update queue with remaining items
            if (remaining.length !== queue.length) {
                setTimeout(() => this.loadQueue.next(remaining), 50);
            }

            // Process current batch
            batch.forEach(item => this.processItem(item));
        });
    }

    private processItem(item: LazyLoadItem): void {
        const key = `${item.type}:${item.id}`;

        if (this.loadingItems.has(key) || this.cacheService.has(key)) {
            return;
        }

        // Check concurrent load limit
        if (this.concurrentLoads >= (this.defaultConfig.maxConcurrentLoads || 6)) {
            // Re-queue the item for later processing
            setTimeout(() => {
                const currentQueue = this.loadQueue.value;
                if (!currentQueue.some(existing => existing.id === item.id && existing.type === item.type)) {
                    this.loadQueue.next([...currentQueue, item]);
                }
            }, 100);
            return;
        }

        this.loadingItems.add(key);
        this.concurrentLoads++;

        let loadObservable: Observable<any>;

        switch (item.type) {
            case 'thumbnail':
                loadObservable = this.loadThumbnail(item.id);
                break;
            case 'metadata':
                loadObservable = this.loadMetadata(item.id);
                break;
            default:
                console.warn(`Unknown lazy load type: ${item.type}`);
                this.loadingItems.delete(key);
                this.concurrentLoads--;
                return;
        }

        loadObservable.subscribe({
            next: () => {
                this.loadingItems.delete(key);
                this.concurrentLoads--;
            },
            error: (error) => {
                console.error(`Failed to load ${item.type} for ${item.id}:`, error);
                this.loadingItems.delete(key);
                this.concurrentLoads--;

                // Retry logic
                const retryCount = (item.retryCount || 0) + 1;
                if (retryCount <= (this.defaultConfig.retryAttempts || 3)) {
                    setTimeout(() => {
                        const retryItem = { ...item, retryCount };
                        const currentQueue = this.loadQueue.value;
                        this.loadQueue.next([...currentQueue, retryItem]);
                    }, (this.defaultConfig.retryDelay || 1000) * retryCount);
                }
            }
        });
    }

    // Helper methods for performance tracking
    private updateStats(type: 'request' | 'success' | 'failure' | 'cacheHit'): void {
        const current = this.loadStats.value;
        const updates: Partial<LazyLoadStats> = {};

        switch (type) {
            case 'request':
                updates.totalRequests = current.totalRequests + 1;
                break;
            case 'success':
                updates.successfulLoads = current.successfulLoads + 1;
                break;
            case 'failure':
                updates.failedLoads = current.failedLoads + 1;
                break;
            case 'cacheHit':
                updates.cacheHits = current.cacheHits + 1;
                break;
        }

        // Update average load time
        if (this.loadTimes.length > 0) {
            updates.averageLoadTime = this.calculateAverageLoadTime();
        }

        this.loadStats.next({ ...current, ...updates });
    }

    private updateQueueSize(size: number): void {
        const current = this.loadStats.value;
        this.loadStats.next({ ...current, queueSize: size });
    }

    private trackLoadTime(time: number): void {
        this.loadTimes.push(time);
        if (this.loadTimes.length > this.maxLoadTimeHistory) {
            this.loadTimes.shift();
        }
    }

    private calculateAverageLoadTime(): number {
        if (this.loadTimes.length === 0) return 0;
        return this.loadTimes.reduce((sum, time) => sum + time, 0) / this.loadTimes.length;
    }

    private calculateLoadTimePercentiles(): { p50: number; p90: number; p95: number } {
        if (this.loadTimes.length === 0) return { p50: 0, p90: 0, p95: 0 };

        const sorted = [...this.loadTimes].sort((a, b) => a - b);
        const len = sorted.length;

        return {
            p50: sorted[Math.floor(len * 0.5)],
            p90: sorted[Math.floor(len * 0.9)],
            p95: sorted[Math.floor(len * 0.95)]
        };
    }

    private calculateCacheEfficiency(): number {
        const stats = this.loadStats.value;
        const totalRequests = stats.totalRequests + stats.cacheHits;
        return totalRequests > 0 ? (stats.cacheHits / totalRequests) * 100 : 0;
    }

    private calculateQueueEfficiency(): number {
        const stats = this.loadStats.value;
        return stats.totalRequests > 0 ? (stats.successfulLoads / stats.totalRequests) * 100 : 0;
    }

    private getFrequentlyAccessedItems(): Array<{ key: string; factory: () => Observable<any>; config?: any }> {
        // This would typically be based on actual usage analytics
        // For now, return empty array as placeholder
        return [];
    }

    private prefetchRelatedItems(): void {
        // Implement predictive prefetching based on user behavior patterns
        // This is a placeholder for future enhancement
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        this.loadQueue.complete();
    }
}