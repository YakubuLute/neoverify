import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest, of } from 'rxjs';
import {
    debounceTime,
    distinctUntilChanged,
    switchMap,
    map,
    catchError,
    tap,
    startWith,
    shareReplay
} from 'rxjs/operators';
import { CacheService } from './cache.service';
import { DocumentService } from './document.service';
import { Document, DocumentFilters } from '../../shared/models/document.models';

export interface SearchResult {
    documents: Document[];
    totalCount: number;
    searchTime: number;
    suggestions?: string[];
    facets?: SearchFacets;
}

export interface SearchFacets {
    documentTypes: { [key: string]: number };
    statuses: { [key: string]: number };
    tags: { [key: string]: number };
    issuers: { [key: string]: number };
}

export interface SearchConfig {
    debounceTime: number;
    minQueryLength: number;
    maxSuggestions: number;
    enableFacets: boolean;
    cacheResults: boolean;
    cacheTtl: number;
    maxCacheSize: number;
    enablePredictiveSearch: boolean;
    searchTimeout: number;
}

export interface SearchPerformanceMetrics {
    averageSearchTime: number;
    cacheHitRate: number;
    totalSearches: number;
    failedSearches: number;
    popularQueries: Array<{ query: string; count: number }>;
    searchTimePercentiles: { p50: number; p90: number; p95: number };
}

@Injectable({
    providedIn: 'root'
})
export class SearchService {
    private readonly cacheService = inject(CacheService);
    private readonly documentService = inject(DocumentService);

    private readonly searchQuery$ = new BehaviorSubject<string>('');
    private readonly searchFilters$ = new BehaviorSubject<DocumentFilters>({});
    private readonly searchConfig$ = new BehaviorSubject<SearchConfig>({
        debounceTime: 250, // Slightly reduced for better responsiveness
        minQueryLength: 2,
        maxSuggestions: 8, // Increased for better UX
        enableFacets: true,
        cacheResults: true,
        cacheTtl: 10 * 60 * 1000, // 10 minutes
        maxCacheSize: 100,
        enablePredictiveSearch: true,
        searchTimeout: 5000 // 5 seconds
    });

    private searchHistory: string[] = [];
    private readonly maxHistorySize = 50; // Increased for better suggestions
    private searchTimes: number[] = [];
    private readonly maxSearchTimeHistory = 100;
    private queryFrequency = new Map<string, number>();
    private searchPerformanceMetrics = new BehaviorSubject<SearchPerformanceMetrics>({
        averageSearchTime: 0,
        cacheHitRate: 0,
        totalSearches: 0,
        failedSearches: 0,
        popularQueries: [],
        searchTimePercentiles: { p50: 0, p90: 0, p95: 0 }
    });

    // Search results observable with enhanced performance
    readonly searchResults$: Observable<SearchResult> = combineLatest([
        this.searchQuery$.pipe(
            debounceTime(250),
            distinctUntilChanged(),
            map(query => query.trim())
        ),
        this.searchFilters$.pipe(distinctUntilChanged()),
        this.searchConfig$
    ]).pipe(
        switchMap(([query, filters, config]) => {
            if (!query || query.length < config.minQueryLength) {
                return of({
                    documents: [],
                    totalCount: 0,
                    searchTime: 0,
                    suggestions: this.getSearchSuggestions(query),
                    facets: undefined
                });
            }

            // Check cache first for better performance
            const cacheKey = this.generateCacheKey(query, filters);
            const cached = this.cacheService.getSync<SearchResult>(cacheKey);
            if (cached && config.cacheResults) {
                this.updatePerformanceMetrics('cacheHit', 0);
                return of(cached);
            }

            return this.performSearch(query, filters, config);
        }),
        shareReplay(1)
    );

    // Loading state
    private readonly isSearching$ = new BehaviorSubject<boolean>(false);
    readonly isSearching = this.isSearching$.asObservable();

    // Error state
    private readonly searchError$ = new BehaviorSubject<string | null>(null);
    readonly searchError = this.searchError$.asObservable();

    /**
     * Update search query
     */
    setSearchQuery(query: string): void {
        this.searchQuery$.next(query);
        this.searchError$.next(null);
    }

    /**
     * Update search filters
     */
    setSearchFilters(filters: DocumentFilters): void {
        this.searchFilters$.next(filters);
    }

    /**
     * Update search configuration
     */
    setSearchConfig(config: Partial<SearchConfig>): void {
        const currentConfig = this.searchConfig$.value;
        this.searchConfig$.next({ ...currentConfig, ...config });
    }

    /**
     * Get current search query
     */
    getCurrentQuery(): string {
        return this.searchQuery$.value;
    }

    /**
     * Get current search filters
     */
    getCurrentFilters(): DocumentFilters {
        return this.searchFilters$.value;
    }

    /**
     * Clear search
     */
    clearSearch(): void {
        this.searchQuery$.next('');
        this.searchFilters$.next({});
        this.searchError$.next(null);
    }

    /**
     * Add query to search history
     */
    addToHistory(query: string): void {
        if (!query || query.length < 2) return;

        // Remove existing entry if present
        this.searchHistory = this.searchHistory.filter(item => item !== query);

        // Add to beginning
        this.searchHistory.unshift(query);

        // Limit size
        if (this.searchHistory.length > this.maxHistorySize) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
        }

        // Persist to localStorage
        try {
            localStorage.setItem('search-history', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.warn('Failed to save search history:', error);
        }
    }

    /**
     * Get search history
     */
    getSearchHistory(): string[] {
        if (this.searchHistory.length === 0) {
            try {
                const stored = localStorage.getItem('search-history');
                if (stored) {
                    this.searchHistory = JSON.parse(stored);
                }
            } catch (error) {
                console.warn('Failed to load search history:', error);
            }
        }
        return [...this.searchHistory];
    }

    /**
     * Clear search history
     */
    clearHistory(): void {
        this.searchHistory = [];
        try {
            localStorage.removeItem('search-history');
        } catch (error) {
            console.warn('Failed to clear search history:', error);
        }
    }

    /**
     * Get search suggestions based on current query
     */
    getSearchSuggestions(query: string): string[] {
        if (!query || query.length < 1) {
            return this.getSearchHistory().slice(0, 5);
        }

        const history = this.getSearchHistory();
        const suggestions = history.filter(item =>
            item.toLowerCase().includes(query.toLowerCase()) && item !== query
        );

        // Add common search patterns
        const commonSuggestions = this.getCommonSuggestions(query);

        return [...new Set([...suggestions, ...commonSuggestions])].slice(0, 5);
    }

    /**
     * Perform instant search (without debouncing)
     */
    instantSearch(query: string, filters?: DocumentFilters): Observable<SearchResult> {
        const config = this.searchConfig$.value;
        return this.performSearch(query, filters || {}, config);
    }

    /**
     * Export search results
     */
    exportSearchResults(format: 'csv' | 'json' | 'pdf' = 'csv'): Observable<Blob> {
        const query = this.getCurrentQuery();
        const filters = this.getCurrentFilters();

        return this.documentService.exportDocuments([], format, {
            searchQuery: query,
            filters: filters,
            includeMetadata: true
        });
    }

    /**
     * Get search analytics
     */
    getSearchAnalytics(): Observable<any> {
        return combineLatest([
            this.cacheService.getStats(),
            this.searchPerformanceMetrics.asObservable()
        ]).pipe(
            map(([cacheStats, performanceMetrics]) => ({
                cacheStats,
                performanceMetrics,
                historySize: this.searchHistory.length,
                currentQuery: this.getCurrentQuery(),
                hasActiveFilters: Object.keys(this.getCurrentFilters()).length > 0,
                queryFrequency: Array.from(this.queryFrequency.entries())
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10)
            }))
        );
    }

    /**
     * Get search performance metrics
     */
    getPerformanceMetrics(): Observable<SearchPerformanceMetrics> {
        return this.searchPerformanceMetrics.asObservable();
    }

    /**
     * Optimize search performance
     */
    optimizeSearchPerformance(): void {
        // Warm up cache with popular queries
        const popularQueries = this.getPopularQueries();
        popularQueries.slice(0, 5).forEach(({ query }) => {
            if (query.length >= 2) {
                this.performSearch(query, {}, this.searchConfig$.value).subscribe();
            }
        });

        // Clean up old cache entries
        this.cacheService.clearExpired();

        // Update performance metrics
        this.updatePerformanceMetricsSnapshot();
    }

    /**
     * Predictive search based on user patterns
     */
    getPredictiveSearchSuggestions(partialQuery: string): string[] {
        if (!partialQuery || partialQuery.length < 1) return [];

        const suggestions = new Set<string>();

        // Add suggestions from search history
        this.searchHistory
            .filter(query => query.toLowerCase().startsWith(partialQuery.toLowerCase()))
            .slice(0, 3)
            .forEach(query => suggestions.add(query));

        // Add suggestions from popular queries
        this.getPopularQueries()
            .filter(({ query }) => query.toLowerCase().includes(partialQuery.toLowerCase()))
            .slice(0, 3)
            .forEach(({ query }) => suggestions.add(query));

        return Array.from(suggestions).slice(0, 5);
    }

    private performSearch(query: string, filters: DocumentFilters, config: SearchConfig): Observable<SearchResult> {
        const startTime = performance.now();
        this.isSearching$.next(true);

        // Generate cache key
        const cacheKey = this.generateCacheKey(query, filters);

        // Track query frequency
        this.trackQueryFrequency(query);

        // Perform actual search with timeout
        return this.documentService.searchDocuments(query, filters).pipe(
            map(response => {
                const searchTime = performance.now() - startTime;
                const result: SearchResult = {
                    documents: response.documents || [],
                    totalCount: response.totalCount || 0,
                    searchTime,
                    suggestions: config.enablePredictiveSearch ?
                        this.getPredictiveSearchSuggestions(query) :
                        this.getSearchSuggestions(query),
                    facets: config.enableFacets ? this.extractFacets(response.documents || []) : undefined
                };

                // Cache result if enabled and within size limits
                if (config.cacheResults && this.shouldCacheResult(result, config)) {
                    this.cacheService.set(cacheKey, result, {
                        ttl: config.cacheTtl,
                        maxSize: config.maxCacheSize
                    });
                }

                // Add to history and track performance
                this.addToHistory(query);
                this.trackSearchTime(searchTime);
                this.updatePerformanceMetrics('success', searchTime);

                return result;
            }),
            tap(() => this.isSearching$.next(false)),
            catchError(error => {
                const searchTime = performance.now() - startTime;
                this.isSearching$.next(false);
                this.searchError$.next('Search failed. Please try again.');
                this.updatePerformanceMetrics('failure', searchTime);
                console.error('Search error:', error);

                return of({
                    documents: [],
                    totalCount: 0,
                    searchTime,
                    suggestions: this.getSearchSuggestions(query)
                });
            })
        );
    }

    private generateCacheKey(query: string, filters: DocumentFilters): string {
        const filterString = JSON.stringify(filters);
        return `search:${query}:${btoa(filterString)}`;
    }

    private extractFacets(documents: Document[]): SearchFacets {
        const facets: SearchFacets = {
            documentTypes: {},
            statuses: {},
            tags: {},
            issuers: {}
        };

        documents.forEach(doc => {
            // Document types
            facets.documentTypes[doc.documentType] = (facets.documentTypes[doc.documentType] || 0) + 1;

            // Statuses
            facets.statuses[doc.status] = (facets.statuses[doc.status] || 0) + 1;

            // Tags
            doc.tags.forEach(tag => {
                facets.tags[tag] = (facets.tags[tag] || 0) + 1;
            });

            // Issuers
            if (doc.issuerId) {
                facets.issuers[doc.issuerId] = (facets.issuers[doc.issuerId] || 0) + 1;
            }
        });

        return facets;
    }

    private getCommonSuggestions(query: string): string[] {
        const commonTerms = [
            'degree', 'certificate', 'license', 'transcript', 'diploma',
            'verified', 'pending', 'active', 'expired',
            'university', 'college', 'school', 'institution'
        ];

        return commonTerms
            .filter(term => term.toLowerCase().includes(query.toLowerCase()))
            .map(term => query + ' ' + term)
            .slice(0, 3);
    }

    /**
     * Invalidate search cache
     */
    invalidateCache(pattern?: string): void {
        if (pattern) {
            this.cacheService.invalidatePattern(pattern);
        } else {
            this.cacheService.invalidatePattern('^search:');
        }
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        this.searchQuery$.complete();
        this.searchFilters$.complete();
        this.searchConfig$.complete();
        this.isSearching$.complete();
        this.searchError$.complete();
        this.searchPerformanceMetrics.complete();
    }

    // Private helper methods for performance tracking
    private trackQueryFrequency(query: string): void {
        const normalizedQuery = query.toLowerCase().trim();
        const currentCount = this.queryFrequency.get(normalizedQuery) || 0;
        this.queryFrequency.set(normalizedQuery, currentCount + 1);
    }

    private trackSearchTime(time: number): void {
        this.searchTimes.push(time);
        if (this.searchTimes.length > this.maxSearchTimeHistory) {
            this.searchTimes.shift();
        }
    }

    private updatePerformanceMetrics(type: 'success' | 'failure' | 'cacheHit', searchTime: number): void {
        const current = this.searchPerformanceMetrics.value;
        const updates: Partial<SearchPerformanceMetrics> = {};

        switch (type) {
            case 'success':
                updates.totalSearches = current.totalSearches + 1;
                break;
            case 'failure':
                updates.failedSearches = current.failedSearches + 1;
                updates.totalSearches = current.totalSearches + 1;
                break;
            case 'cacheHit':
                // Cache hits don't count as new searches but improve hit rate
                break;
        }

        // Update averages and percentiles
        if (this.searchTimes.length > 0) {
            updates.averageSearchTime = this.calculateAverageSearchTime();
            updates.searchTimePercentiles = this.calculateSearchTimePercentiles();
        }

        // Update cache hit rate
        const totalCacheRequests = current.totalSearches + (type === 'cacheHit' ? 1 : 0);
        if (totalCacheRequests > 0) {
            updates.cacheHitRate = (type === 'cacheHit' ? 1 : 0) / totalCacheRequests * 100;
        }

        // Update popular queries
        updates.popularQueries = this.getPopularQueries();

        this.searchPerformanceMetrics.next({ ...current, ...updates });
    }

    private updatePerformanceMetricsSnapshot(): void {
        const current = this.searchPerformanceMetrics.value;
        this.searchPerformanceMetrics.next({
            ...current,
            averageSearchTime: this.calculateAverageSearchTime(),
            searchTimePercentiles: this.calculateSearchTimePercentiles(),
            popularQueries: this.getPopularQueries()
        });
    }

    private calculateAverageSearchTime(): number {
        if (this.searchTimes.length === 0) return 0;
        return this.searchTimes.reduce((sum, time) => sum + time, 0) / this.searchTimes.length;
    }

    private calculateSearchTimePercentiles(): { p50: number; p90: number; p95: number } {
        if (this.searchTimes.length === 0) return { p50: 0, p90: 0, p95: 0 };

        const sorted = [...this.searchTimes].sort((a, b) => a - b);
        const len = sorted.length;

        return {
            p50: sorted[Math.floor(len * 0.5)],
            p90: sorted[Math.floor(len * 0.9)],
            p95: sorted[Math.floor(len * 0.95)]
        };
    }

    private getPopularQueries(): Array<{ query: string; count: number }> {
        return Array.from(this.queryFrequency.entries())
            .map(([query, count]) => ({ query, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }

    private shouldCacheResult(result: SearchResult, config: SearchConfig): boolean {
        // Don't cache empty results or very large result sets
        if (result.documents.length === 0 || result.documents.length > 1000) {
            return false;
        }

        // Don't cache if search took too long (likely a complex query)
        if (result.searchTime > 2000) {
            return false;
        }

        return true;
    }
}