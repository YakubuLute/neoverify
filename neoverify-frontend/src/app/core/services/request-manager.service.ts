import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject, EMPTY, throwError } from 'rxjs';
import { share, takeUntil, finalize } from 'rxjs/operators';
import { RequestOptions, RequestPriority, ApiError, ErrorType } from '../types/api.types';

interface PendingRequest {
    id: string;
    observable: Observable<any>;
    abortController: AbortController;
    priority: RequestPriority;
    timestamp: number;
    endpoint: string;
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
}

@Injectable({
    providedIn: 'root'
})
export class RequestManagerService {
    private pendingRequests = new Map<string, PendingRequest>();
    private requestCache = new Map<string, Observable<any>>();
    private requestQueue: QueuedRequest[] = [];
    private maxConcurrentRequests = 10;
    private isOnline$ = new BehaviorSubject<boolean>(navigator.onLine);
    private destroy$ = new Subject<void>();

    constructor() {
        this.setupOnlineStatusListener();
        this.processQueue();
    }

    /**
     * Create a managed request with cancellation and deduplication
     */
    createRequest<T>(
        requestId: string,
        requestFactory: (signal: AbortSignal) => Observable<T>,
        options: RequestOptions = {}
    ): Observable<T> {
        const {
            priority = RequestPriority.NORMAL,
            skipAuth = false
        } = options;

        // Check for duplicate requests
        if (this.requestCache.has(requestId)) {
            return this.requestCache.get(requestId)!;
        }

        // Create abort controller
        const abortController = new AbortController();

        // If offline and not critical, queue the request
        if (!this.isOnline$.value && priority !== RequestPriority.CRITICAL) {
            return this.queueRequest(requestId, requestFactory, options);
        }

        // Check concurrent request limit
        if (this.pendingRequests.size >= this.maxConcurrentRequests && priority < RequestPriority.HIGH) {
            return this.queueRequest(requestId, requestFactory, options);
        }

        // Create the observable
        const request$ = requestFactory(abortController.signal).pipe(
            takeUntil(this.destroy$),
            share(),
            finalize(() => {
                this.pendingRequests.delete(requestId);
                this.requestCache.delete(requestId);
            })
        );

        // Store pending request
        const pendingRequest: PendingRequest = {
            id: requestId,
            observable: request$,
            abortController,
            priority,
            timestamp: Date.now(),
            endpoint: requestId.split('_')[0] || 'unknown'
        };

        this.pendingRequests.set(requestId, pendingRequest);
        this.requestCache.set(requestId, request$);

        return request$;
    }

    /**
     * Cancel a specific request
     */
    cancelRequest(requestId: string): void {
        const pendingRequest = this.pendingRequests.get(requestId);
        if (pendingRequest) {
            pendingRequest.abortController.abort();
            this.pendingRequests.delete(requestId);
            this.requestCache.delete(requestId);
        }

        // Remove from queue if present
        this.requestQueue = this.requestQueue.filter(req => req.id !== requestId);
    }

    /**
     * Cancel all requests for a specific endpoint
     */
    cancelRequestsByEndpoint(endpoint: string): void {
        const requestsToCancel = Array.from(this.pendingRequests.values())
            .filter(req => req.endpoint === endpoint);

        requestsToCancel.forEach(req => {
            this.cancelRequest(req.id);
        });

        // Remove from queue
        this.requestQueue = this.requestQueue.filter(req => !req.endpoint.includes(endpoint));
    }

    /**
     * Cancel all pending requests
     */
    cancelAllRequests(): void {
        this.pendingRequests.forEach(req => {
            req.abortController.abort();
        });

        this.pendingRequests.clear();
        this.requestCache.clear();

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
    }

    /**
     * Get pending requests count
     */
    getPendingRequestsCount(): number {
        return this.pendingRequests.size;
    }

    /**
     * Get queued requests count
     */
    getQueuedRequestsCount(): number {
        return this.requestQueue.length;
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
        this.maxConcurrentRequests = max;
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
            const queuedRequest: QueuedRequest = {
                id: requestId,
                method: 'GET', // This would be passed from the actual request
                endpoint: requestId.split('_')[0] || 'unknown',
                options,
                resolve: (value: T) => {
                    observer.next(value);
                    observer.complete();
                },
                reject: (error: any) => {
                    observer.error(error);
                },
                priority: options.priority || RequestPriority.NORMAL,
                timestamp: Date.now()
            };

            // Insert request in queue based on priority
            this.insertIntoQueue(queuedRequest);

            // Return cleanup function
            return () => {
                this.requestQueue = this.requestQueue.filter(req => req.id !== requestId);
            };
        });
    }

    /**
     * Insert request into queue based on priority
     */
    private insertIntoQueue(request: QueuedRequest): void {
        let insertIndex = this.requestQueue.length;

        // Find insertion point based on priority
        for (let i = 0; i < this.requestQueue.length; i++) {
            if (this.requestQueue[i].priority < request.priority) {
                insertIndex = i;
                break;
            }
        }

        this.requestQueue.splice(insertIndex, 0, request);
    }

    /**
     * Process queued requests
     */
    private processQueue(): void {
        setInterval(() => {
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
                // Create and execute the request
                // Note: This is a simplified version - in practice, you'd need to store
                // the request factory function in the queued request
                queuedRequest.resolve(null); // Placeholder
            });
        }, 1000);
    }

    /**
     * Setup online status listener
     */
    private setupOnlineStatusListener(): void {
        window.addEventListener('online', () => {
            this.isOnline$.next(true);
        });

        window.addEventListener('offline', () => {
            this.isOnline$.next(false);
        });
    }

    /**
     * Generate cache key for request deduplication
     */
    generateCacheKey(method: string, endpoint: string, data?: any, params?: any): string {
        const dataHash = data ? JSON.stringify(data) : '';
        const paramsHash = params ? JSON.stringify(params) : '';
        return `${method}_${endpoint}_${btoa(dataHash + paramsHash)}`;
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