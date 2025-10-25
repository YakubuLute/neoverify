import { Injectable, inject } from '@angular/core';
import { Observable, of, BehaviorSubject, combineLatest } from 'rxjs';
import { map, switchMap, catchError, distinctUntilChanged, debounceTime } from 'rxjs/operators';
import { CacheService } from './cache.service';
import { DocumentService } from './document.service';

export interface LazyLoadConfig {
    rootMargin?: string;
    threshold?: number;
    debounceTime?: number;
}

export interface LazyLoadItem {
    id: string;
    type: 'thumbnail' | 'metadata' | 'content';
    priority?: number;
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

    private readonly defaultConfig: LazyLoadConfig = {
        rootMargin: '50px',
        threshold: 0.1,
        debounceTime: 100
    };

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
     * Load thumbnail for document
     */
    loadThumbnail(documentId: string): Observable<string> {
        const cacheKey = `thumbnail:${documentId}`;

        return this.cacheService.get(
            cacheKey,
            () => this.documentService.generateThumbnail(documentId),
            { ttl: 30 * 60 * 1000 } // 30 minutes
        ).pipe(
            catchError(error => {
                console.warn(`Failed to load thumbnail for document ${documentId}:`, error);
                return of('/assets/images/document-placeholder.svg');
            })
        );
    }

    /**
     * Load document metadata
     */
    loadMetadata(documentId: string): Observable<any> {
        const cacheKey = `metadata:${documentId}`;

        return this.cacheService.get(
            cacheKey,
            () => this.documentService.getDocument(documentId).pipe(
                map(doc => ({
                    title: doc.title,
                    description: doc.description,
                    fileSize: doc.fileSize,
                    uploadedAt: doc.uploadedAt,
                    tags: doc.tags
                }))
            ),
            { ttl: 10 * 60 * 1000 } // 10 minutes
        ).pipe(
            catchError(error => {
                console.warn(`Failed to load metadata for document ${documentId}:`, error);
                return of(null);
            })
        );
    }

    /**
     * Preload items based on priority
     */
    preload(items: LazyLoadItem[]): void {
        const sortedItems = items.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        const currentQueue = this.loadQueue.value;

        // Add new items to queue, avoiding duplicates
        const newItems = sortedItems.filter(item =>
            !currentQueue.some(existing => existing.id === item.id && existing.type === item.type)
        );

        if (newItems.length > 0) {
            this.loadQueue.next([...currentQueue, ...newItems]);
        }
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

        this.loadingItems.add(key);

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
                return;
        }

        loadObservable.subscribe({
            next: () => {
                this.loadingItems.delete(key);
            },
            error: (error) => {
                console.error(`Failed to load ${item.type} for ${item.id}:`, error);
                this.loadingItems.delete(key);
            }
        });
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