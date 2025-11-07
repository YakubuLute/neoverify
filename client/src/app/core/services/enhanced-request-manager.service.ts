import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject, throwError, timer, of } from 'rxjs';
import { share, takeUntil, finalize, retry, catchError, switchMap, delay } from 'rxjs/operators';
import { RequestOptions, RequestPriority, ApiError, ErrorType } from '../types/api.types';

interface PendingRequest {
    id: string;
    observable: Observable<any>;
    abortController: AbortController;
    priority: RequestPriority;
    timestamp: number;
    endpoint: string;
    method: string;
}

interface QueuedRequest {
    id: string;
    method: string;
    endpoint: string;
    data?: any;
    options?: RequestOptions;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    priority: RequestPriority;
    timestamp: number;
    requestFactory: (signal: AbortSignal) => Observable<any>;
    retryCount: number;
    maxRetries: number;
}

interface RequestDeduplicationEntry {
    observable: Observable<any>;
    timestamp: number;
    subscribers: number;
}

interface OfflineQueueEntry {
    id: string;
    method: string;
    endpoint: string;
    data?: any;
    options?: RequestOptions;
    timestamp: number;
    priority: RequestPriority;
    retryCount: number;
}

@Injectable({
    providedIn: 'root'
})
export class EnhancedRequestManagerService {
    private pendingRequests = new Map<string, PendingRequest>();
    private requestQueue: QueuedRequest[] = [];
    private offlineQueue: OfflineQueueEntry[] = [];
    private deduplicationCache = new Map<string, RequestDeduplicationEntry>();

    private maxConcurrentRequests = 10;
    private maxQueueSize = 100;
    private maxOfflineQueueSize = 50;
    private deduplicationTtl = 5000; // 5 seconds
    private queueProcessInterval = 1000; // 1 second

    private isOnline$ = new BehaviorSubject<boolean>(navigator.onLine);
    private destroy$ = new Subject<void>();
    private queueProcessor$ = new Subject<void>();

    constructor() {
        this.setupOnlineStatusListener();
        this.startQueueProcessor();
        this.startDeduplicationCleanup();
    }

    /**
     * Create a managed request with advanced features
     */
    createRequest<T>(
        requestId: string,
        requestFactory: (signal: AbortSignal) => Observable<T>,
        options: RequestOptions = {}
    ): Observable<T> {
        const {
            priority = RequestPriority.NORMAL,
            retryAttempts = 3
        } = options;

        // Check for duplicate requests if deduplication is enabled
        if (this.shouldDeduplicate(requestId, options)) {
            const cached = this.deduplicationCache.get(requestId);
            if (cached) {
                cached.subscribers++;
                return cached.observable as Observable<T>;
            }
        }

        // If offline and not critical, queue the request
        if (!this.isOnline$.value && priority !== RequestPriority.CRITICAL) {
            return this.queueOfflineRequest(requestId, requestFactory, options);
        }

        // Check concurrent request limit
        if (this.pendingRequests.size >= this.maxConcurrentRequests && priority < RequestPriority.HIGH) {
            return this.queueRequest(requestId, requestFactory, options);
        }

        // Create the request
        return this.executeRequest(requestId, requestFactory, options);
    }

    /**
     * Execute a request immediately
     */
    private executeRequest<T>(
        requestId: string,
        requestFactory: (signal: AbortSignal) => Observable<T>,
        options: RequestOptions = {}
    ): Observable<T> {
        const abortController = new AbortController();
        const { priority = RequestPriority.NORMAL } = options;

        const request$ = requestFactory(abortController.signal).pipe(
            takeUntil(this.destroy$),
            share(),
            finalize(() => {
                this.pendingRequests.delete(requestId);
                this.removeFromDeduplicationCache(requestId);
            })
        );

        // Store pending request
        const pendingRequest: PendingRequest = {
            id: requestId,
            observable: request$,
            abortController,
            priority,
            timestamp: Date.now(),
            endpoint: this.extractEndpointFromRequestId(requestId),
            method: this.extractMethodFromRequestId(requestId)
        };

        this.pendingRequests.set(requestId, pendingRequest);

        // Add to deduplication cache if enabled
        if (this.shouldDeduplicate(requestId, options)) {
            this.deduplicationCache.set(requestId, {
                observable: request$,
                timestamp: Date.now(),
                subscribers: 1
            });
        }

        return request$;
    }

    /**
     * Queue a request for later execution
     */
    private queueRequest<T>(
        requestId: string,
        requestFactory: (signal: AbortSignal) => Observable<T>,
        options: RequestOptions = {}
    ): Observable<T> {
        return new Observable<T>(observer => {
            if (this.requestQueue.length >= this.maxQueueSize) {
                observer.error({
                    type: ErrorType.RATE_LIMIT_ERROR,
                    code: 'QUEUE_FULL',
                    message: 'Request queue is full. Please try again later.',
                    timestamp: new Date().toISOString()
                } as ApiError);
                return;
            }

            const queuedRequest: QueuedRequest = {
                id: requestId,
                method: this.extractMethodFromRequestId(requestId),
                endpoint: this.extractEndpointFromRequestId(requestId),
                options,
                resolve: (value: T) => {
                    observer.next(value);
                    observer.complete();
                },
                reject: (error: any) => {
                    observer.error(error);
                },
                priority: options.priority || RequestPriority.NORMAL,
                timestamp: Date.now(),
                requestFactory,
                retryCount: 0,
                maxRetries: options.retryAttempts || 3
            };

            this.insertIntoQueue(queuedRequest);

            // Return cleanup function
            return () => {
                this.requestQueue = this.requestQueue.filter(req => req.id !== requestId);
            };
        });
    }

    /**
     * Queue a request for offline execution
     */
    private queueOfflineRequest<T>(
        requestId: string,
        requestFactory: (signal: AbortSignal) => Observable<T>,
        options: RequestOptions = {}
    ): Observable<T> {
        return new Observable<T>(observer => {
            if (this.offlineQueue.length >= this.maxOfflineQueueSize) {
                observer.error({
                    type: ErrorType.NETWORK_ERROR,
                    code: 'OFFLINE_QUEUE_FULL',
                    message: 'Offline queue is full. Please try again when online.',
                    timestamp: new Date().toISOString()
                } as ApiError);
                return;
            }

            const offlineEntry: OfflineQueueEntry = {
                id: requestId,
                method: this.extractMethodFromRequestId(requestId),
                endpoint: this.extractEndpointFromRequestId(requestId),
                options,
                timestamp: Date.now(),
                priority: options.priority || RequestPriority.NORMAL,
                retryCount: 0
            };

            this.insertIntoOfflineQueue(offlineEntry);

            // Store resolver for when we come back online
            const queuedRequest: QueuedRequest = {
                ...offlineEntry,
                resolve: (value: T) => {
                    observer.next(value);
                    observer.complete();
                },
                reject: (error: any) => {
                    observer.error(error);
                },
                requestFactory,
                maxRetries: options.retryAttempts || 3
            };

            // Add to regular queue for processing when online
            this.insertIntoQueue(queuedRequest);

            return () => {
                this.offlineQueue = this.offlineQueue.filter(req => req.id !== requestId);
                this.requestQueue = this.requestQueue.filter(req => req.id !== requestId);
            };
        });
    }

    /**
     * Cancel a specific request
     */
    cancelRequest(requestId: string): void {
        // Cancel pending request
        const pendingRequest = this.pendingRequests.get(requestId);
        if (pendingRequest) {
            pendingRequest.abortController.abort();
            this.pendingRequests.delete(requestId);
        }

        // Remove from queues
        this.requestQueue = this.requestQueue.filter(req => req.id !== requestId);
        this.offlineQueue = this.offlineQueue.filter(req => req.id !== requestId);

        // Remove from deduplication cache
        this.removeFromDeduplicationCache(requestId);
    }

    /**
     * Cancel requests by endpoint pattern
     */
    cancelRequestsByEndpoint(endpointPattern: string): void {
        // Cancel pending requests
        const requestsToCancel = Array.from(this.pendingRequests.values())
            .filter(req => req.endpoint.includes(endpointPattern));

        requestsToCancel.forEach(req => {
            this.cancelRequest(req.id);
        });

        // Remove from queues
        this.requestQueue = this.requestQueue.filter(req => !req.endpoint.includes(endpointPattern));
        this.offlineQueue = this.offlineQueue.filter(req => !req.endpoint.includes(endpointPattern));
    }

    /**
     * Cancel all requests
     */
    cancelAllRequests(): void {
        // Cancel all pending requests
        this.pendingRequests.forEach(req => {
            req.abortController.abort();
        });

        this.pendingRequests.clear();
        this.deduplicationCache.clear();

        // Reject all queued requests
        this.requestQueue.forEach(req => {
            req.reject({
                type: ErrorType.UNKNOWN_ERROR,
                code: 'REQUEST_CANCELLED',
                message: 'Request was cancelled',
                timestamp: new Date().toISOString()
            } as ApiError);
        });

        this.requestQueue = [];
        this.offlineQueue = [];
    }

    /**
     * Get request statistics
     */
    getRequestStats(): {
        pending: number;
        queued: number;
        offline: number;
        cached: number;
    } {
        return {
            pending: this.pendingRequests.size,
            queued: this.requestQueue.length,
            offline: this.offlineQueue.length,
            cached: this.deduplicationCache.size
        };
    }

    /**
     * Check if a request is pending
     */
    isRequestPending(requestId: string): boolean {
        return this.pendingRequests.has(requestId);
    }

    /**
     * Get online status observable
     */
    getOnlineStatus(): Observable<boolean> {
        return this.isOnline$.asObservable();
    }

    /**
     * Set maximum concurrent requests
     */
    setMaxConcurrentRequests(max: number): void {
        this.maxConcurrentRequests = Math.max(1, max);
    }

    /**
     * Set maximum queue size
     */
    setMaxQueueSize(max: number): void {
        this.maxQueueSize = Math.max(1, max);
    }

    /**
     * Generate cache key for request deduplication
     */
    generateCacheKey(method: string, endpoint: string, data?: any, params?: any): string {
        const dataHash = data ? this.hashObject(data) : '';
        const paramsHash = params ? this.hashObject(params) : '';
        return `${method}_${endpoint}_${dataHash}_${paramsHash}`;
    }

    /**
     * Insert request into queue based on priority
     */
    private insertIntoQueue(request: QueuedRequest): void {
        let insertIndex = this.requestQueue.length;

        // Find insertion point based on priority and timestamp
        for (let i = 0; i < this.requestQueue.length; i++) {
            const existing = this.requestQueue[i];

            if (existing.priority < request.priority) {
                insertIndex = i;
                break;
            } else if (existing.priority === request.priority && existing.timestamp > request.timestamp) {
                insertIndex = i;
                break;
            }
        }

        this.requestQueue.splice(insertIndex, 0, request);
    }

    /**
     * Insert request into offline queue based on priority
     */
    private insertIntoOfflineQueue(request: OfflineQueueEntry): void {
        let insertIndex = this.offlineQueue.length;

        for (let i = 0; i < this.offlineQueue.length; i++) {
            const existing = this.offlineQueue[i];

            if (existing.priority < request.priority) {
                insertIndex = i;
                break;
            } else if (existing.priority === request.priority && existing.timestamp > request.timestamp) {
                insertIndex = i;
                break;
            }
        }

        this.offlineQueue.splice(insertIndex, 0, request);
    }

    /**
     * Start queue processor
     */
    private startQueueProcessor(): void {
        timer(0, this.queueProcessInterval).pipe(
            takeUntil(this.destroy$)
        ).subscribe(() => {
            this.processQueue();
        });
    }

    /**
     * Process queued requests
     */
    private processQueue(): void {
        if (!this.isOnline$.value || this.requestQueue.length === 0) {
            return;
        }

        const availableSlots = this.maxConcurrentRequests - this.pendingRequests.size;
        if (availableSlots <= 0) {
            return;
        }

        // Process requests up to available slots
        const requestsToProcess = this.requestQueue.splice(0, availableSlots);

        requestsToProcess.forEach(queuedRequest => {
            if (queuedRequest.requestFactory) {
                this.executeRequest(
                    queuedRequest.id,
                    queuedRequest.requestFactory,
                    queuedRequest.options
                ).subscribe({
                    next: (result) => queuedRequest.resolve(result),
                    error: (error) => {
                        if (queuedRequest.retryCount < queuedRequest.maxRetries) {
                            queuedRequest.retryCount++;
                            this.insertIntoQueue(queuedRequest);
                        } else {
                            queuedRequest.reject(error);
                        }
                    }
                });
            }
        });
    }

    /**
     * Setup online status listener
     */
    private setupOnlineStatusListener(): void {
        window.addEventListener('online', () => {
            this.isOnline$.next(true);
            this.processOfflineQueue();
        });

        window.addEventListener('offline', () => {
            this.isOnline$.next(false);
        });
    }

    /**
     * Process offline queue when coming back online
     */
    private processOfflineQueue(): void {
        if (this.offlineQueue.length === 0) return;

        // Move offline requests to regular queue
        const offlineRequests = [...this.offlineQueue];
        this.offlineQueue = [];

        offlineRequests.forEach(offlineRequest => {
            // Find corresponding queued request
            const queuedRequest = this.requestQueue.find(req => req.id === offlineRequest.id);
            if (queuedRequest) {
                // Reset retry count for offline requests
                queuedRequest.retryCount = 0;
            }
        });
    }

    /**
     * Start deduplication cache cleanup
     */
    private startDeduplicationCleanup(): void {
        timer(0, this.deduplicationTtl).pipe(
            takeUntil(this.destroy$)
        ).subscribe(() => {
            this.cleanupDeduplicationCache();
        });
    }

    /**
     * Cleanup expired deduplication cache entries
     */
    private cleanupDeduplicationCache(): void {
        const now = Date.now();
        const expiredKeys: string[] = [];

        this.deduplicationCache.forEach((entry, key) => {
            if (now - entry.timestamp > this.deduplicationTtl || entry.subscribers === 0) {
                expiredKeys.push(key);
            }
        });

        expiredKeys.forEach(key => {
            this.deduplicationCache.delete(key);
        });
    }

    /**
     * Check if request should be deduplicated
     */
    private shouldDeduplicate(requestId: string, options: RequestOptions): boolean {
        return !options.skipAuth && !requestId.includes('POST') && !requestId.includes('PUT') && !requestId.includes('DELETE');
    }

    /**
     * Remove from deduplication cache
     */
    private removeFromDeduplicationCache(requestId: string): void {
        const entry = this.deduplicationCache.get(requestId);
        if (entry) {
            entry.subscribers = Math.max(0, entry.subscribers - 1);
            if (entry.subscribers === 0) {
                this.deduplicationCache.delete(requestId);
            }
        }
    }

    /**
     * Extract method from request ID
     */
    private extractMethodFromRequestId(requestId: string): string {
        const parts = requestId.split('_');
        return parts[0] || 'GET';
    }

    /**
     * Extract endpoint from request ID
     */
    private extractEndpointFromRequestId(requestId: string): string {
        const parts = requestId.split('_');
        return parts[1] || 'unknown';
    }

    /**
     * Simple hash function for objects
     */
    private hashObject(obj: any): string {
        const str = JSON.stringify(obj);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    /**
     * Cleanup resources
     */
    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.cancelAllRequests();
    }
}