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
        debounceTime: 300,
        minQueryLength: 2,
        maxSuggestions: 5,
        enableFacets: true,
        cacheResults: true,
        cacheTtl: 5 * 60 * 1000 // 5 minutes
    });

    private searchHistory: string[] = [];
    private readonly maxHistorySize = 20;

    // Search results observable
    readonly searchResults$: Observable<SearchResult> = combineLatest([
        this.searchQuery$.pipe(
            debounceTime(300),
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
        return this.cacheService.getStats().pipe(
            map(cacheStats => ({
                cacheStats,
                historySize: this.searchHistory.length,
                currentQuery: this.getCurrentQuery(),
                hasActiveFilters: Object.keys(this.getCurrentFilters()).length > 0
            }))
        );
    }

    private performSearch(query: string, filters: DocumentFilters, config: SearchConfig): Observable<SearchResult> {
        const startTime = Date.now();
        this.isSearching$.next(true);

        // Generate cache key
        const cacheKey = this.generateCacheKey(query, filters);

        // Check cache if enabled
        if (config.cacheResults) {
            const cached = this.cacheService.getSync<SearchResult>(cacheKey);
            if (cached) {
                this.isSearching$.next(false);
                return of(cached);
            }
        }

        // Perform actual search
        return this.documentService.searchDocuments(query, filters).pipe(
            map(response => {
                const searchTime = Date.now() - startTime;
                const result: SearchResult = {
                    documents: response.documents || [],
                    totalCount: response.totalCount || 0,
                    searchTime,
                    suggestions: this.getSearchSuggestions(query),
                    facets: config.enableFacets ? this.extractFacets(response.documents || []) : undefined
                };

                // Cache result if enabled
                if (config.cacheResults) {
                    this.cacheService.set(cacheKey, result, { ttl: config.cacheTtl });
                }

                // Add to history
                this.addToHistory(query);

                return result;
            }),
            tap(() => this.isSearching$.next(false)),
            catchError(error => {
                this.isSearching$.next(false);
                this.searchError$.next('Search failed. Please try again.');
                console.error('Search error:', error);

                return of({
                    documents: [],
                    totalCount: 0,
                    searchTime: Date.now() - startTime,
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
    }
}