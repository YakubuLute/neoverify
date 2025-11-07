import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams, HttpHeaders, HttpEvent, HttpEventType, HttpRequest } from '@angular/common/http';
import { Observable, throwError, timer, EMPTY, forkJoin, of } from 'rxjs';
import { catchError, retry, retryWhen, mergeMap, delay, take, timeout, map, filter, finalize } from 'rxjs/operators';
import { z } from 'zod';
import { environment } from '../../../environments/environment';
import {
  ApiError,
  RequestOptions,
  BatchRequest,
  BatchResponse,
  UploadProgress,
  ApiServiceConfig,
  RequestPriority,
  ErrorType
} from '../types/api.types';
import { ApiUtils } from '../utils/api.utils';
import { EnhancedRequestManagerService } from './enhanced-request-manager.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly requestManager = inject(EnhancedRequestManagerService);

  private readonly config: ApiServiceConfig = {
    baseUrl: environment.apiUrl,
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    maxConcurrentRequests: 10,
    enableRequestDeduplication: true,
    enableOfflineQueue: true
  };

  constructor() {
    this.requestManager.setMaxConcurrentRequests(this.config.maxConcurrentRequests);
  }

  /**
   * Generic GET request with enhanced error handling and retry logic
   */
  get<T>(endpoint: string, options: RequestOptions = {}): Observable<T> {
    const requestId = this.generateRequestId('GET', endpoint, undefined, options.params);

    return this.requestManager.createRequest(
      requestId,
      (signal) => this.executeRequest<T>('GET', endpoint, undefined, { ...options, signal }),
      options
    );
  }

  /**
   * Generic POST request with enhanced error handling
   */
  
  post<T>(endpoint: string, data?: any, options: RequestOptions = {}): Observable<T> {
    const requestId = this.generateRequestId('POST', endpoint, data);

    return this.requestManager.createRequest(
      requestId,
      (signal) => this.executeRequest<T>('POST', endpoint, data, { ...options, signal }),
      options
    );
  }

  /**
   * Generic PUT request with enhanced error handling
   */
  put<T>(endpoint: string, data?: any, options: RequestOptions = {}): Observable<T> {
    const requestId = this.generateRequestId('PUT', endpoint, data);

    return this.requestManager.createRequest(
      requestId,
      (signal) => this.executeRequest<T>('PUT', endpoint, data, { ...options, signal }),
      options
    );
  }

  /**
   * Generic PATCH request with enhanced error handling
   */
  patch<T>(endpoint: string, data?: any, options: RequestOptions = {}): Observable<T> {
    const requestId = this.generateRequestId('PATCH', endpoint, data);

    return this.requestManager.createRequest(
      requestId,
      (signal) => this.executeRequest<T>('PATCH', endpoint, data, { ...options, signal }),
      options
    );
  }

  /**
   * Generic DELETE request with enhanced error handling
   */
  delete<T>(endpoint: string, options: RequestOptions = {}): Observable<T> {
    const requestId = this.generateRequestId('DELETE', endpoint);

    return this.requestManager.createRequest(
      requestId,
      (signal) => this.executeRequest<T>('DELETE', endpoint, undefined, { ...options, signal }),
      options
    );
  }

  /**
   * File upload with progress tracking
   */
  uploadFile<T>(endpoint: string, file: File, metadata?: any, options: RequestOptions = {}): Observable<UploadProgress<T>> {
    const formData = new FormData();
    formData.append('file', file);

    if (metadata) {
      Object.keys(metadata).forEach(key => {
        formData.append(key, metadata[key]);
      });
    }

    const requestId = this.generateRequestId('POST', endpoint, formData);

    return this.requestManager.createRequest(
      requestId,
      (signal) => this.executeUpload<T>(endpoint, formData, { ...options, signal }),
      { ...options, priority: RequestPriority.HIGH }
    );
  }

  /**
   * Batch requests execution
   */
  batch<T>(requests: BatchRequest[], options: RequestOptions = {}): Observable<BatchResponse<T>> {
    const batchId = ApiUtils.generateRequestId();
    const timestamp = new Date().toISOString();

    const observables = requests.map(request => {
      const requestOptions = { ...options, ...request.options };
      let observable: Observable<any>;

      switch (request.method) {
        case 'GET':
          observable = this.get(request.endpoint, requestOptions);
          break;
        case 'POST':
          observable = this.post(request.endpoint, request.data, requestOptions);
          break;
        case 'PUT':
          observable = this.put(request.endpoint, request.data, requestOptions);
          break;
        case 'DELETE':
          observable = this.delete(request.endpoint, requestOptions);
          break;
        case 'PATCH':
          observable = this.patch(request.endpoint, request.data, requestOptions);
          break;
        default:
          observable = throwError(() => ({
            type: ErrorType.VALIDATION_ERROR,
            code: 'INVALID_METHOD',
            message: `Invalid HTTP method: ${request.method}`,
            timestamp
          } as ApiError));
      }

      return observable.pipe(
        map(data => ({ id: request.id, success: true, data })),
        catchError(error => of({ id: request.id, success: false, error }))
      );
    });

    return forkJoin(observables).pipe(
      map(results => ({
        results,
        timestamp,
        requestId: batchId
      }))
    );
  }

  /**
   * Cancel a specific request
   */
  cancelRequest(requestId: string): void {
    this.requestManager.cancelRequest(requestId);
  }

  /**
   * Cancel all requests for an endpoint
   */
  cancelRequestsByEndpoint(endpoint: string): void {
    this.requestManager.cancelRequestsByEndpoint(endpoint);
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    this.requestManager.cancelAllRequests();
  }

  /**
   * Get base URL for direct HTTP calls
   */
  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  /**
   * Get request statistics
   */
  getRequestStats(): { pending: number; queued: number; offline: number; cached: number } {
    return this.requestManager.getRequestStats();
  }

  /**
   * Get online status
   */
  getOnlineStatus(): Observable<boolean> {
    return this.requestManager.getOnlineStatus();
  }

  /**
   * Update service configuration
   */
  updateConfig(newConfig: Partial<ApiServiceConfig>): void {
    Object.assign(this.config, newConfig);
    this.requestManager.setMaxConcurrentRequests(this.config.maxConcurrentRequests);
  }

  /**
   * Execute HTTP request with comprehensive error handling
   */
  private executeRequest<T>(
    method: string,
    endpoint: string,
    data?: any,
    options: RequestOptions & { signal?: AbortSignal } = {}
  ): Observable<T> {
    const {
      timeout: requestTimeout = this.config.timeout,
      retryAttempts = this.config.retryAttempts,
      retryDelay = this.config.retryDelay,
      headers = {},
      params = {},
      signal,
      skipErrorHandling = false
    } = options;

    const requestId = ApiUtils.generateRequestId();
    const url = `${this.config.baseUrl}/${endpoint.replace(/^\//, '')}`;

    // Build headers
    const httpHeaders = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      ...headers
    });

    // Build params
    const httpParams = new HttpParams({ fromObject: ApiUtils.sanitizeParams(params) });

    // Build request options
    const requestOptions: any = {
      headers: httpHeaders,
      params: httpParams,
      signal
    };

    if (data && method !== 'GET') {
      requestOptions.body = data;
    }

    // Execute request
    let request$: Observable<any>;

    switch (method.toUpperCase()) {
      case 'GET':
        request$ = this.http.get(url, requestOptions);
        break;
      case 'POST':
        request$ = this.http.post(url, data, requestOptions);
        break;
      case 'PUT':
        request$ = this.http.put(url, data, requestOptions);
        break;
      case 'PATCH':
        request$ = this.http.patch(url, data, requestOptions);
        break;
      case 'DELETE':
        request$ = this.http.delete(url, requestOptions);
        break;
      default:
        return throwError(() => ({
          type: ErrorType.VALIDATION_ERROR,
          code: 'INVALID_METHOD',
          message: `Invalid HTTP method: ${method}`,
          timestamp: new Date().toISOString(),
          requestId
        } as ApiError));
    }

    return request$.pipe(
      timeout(requestTimeout),
      retryWhen(errors =>
        errors.pipe(
          mergeMap((error, index) => {
            const apiError = ApiUtils.transformError(error, requestId);

            if (index >= retryAttempts || !ApiUtils.isRetryableError(apiError)) {
              return throwError(() => apiError);
            }

            const delayTime = retryDelay * Math.pow(2, index);
            return timer(delayTime);
          }),
          take(retryAttempts)
        )
      ),
      map((response: any) => {
        // Extract data from response based on API format
        if (response && typeof response === 'object') {
          return response.data !== undefined ? response.data : response;
        }
        return response;
      }),
      catchError((error: HttpErrorResponse) => {
        if (skipErrorHandling) {
          return throwError(() => error);
        }

        const apiError = ApiUtils.transformError(error, requestId);
        return throwError(() => apiError);
      })
    );
  }

  /**
   * Execute file upload with progress tracking
   */
  private executeUpload<T>(
    endpoint: string,
    formData: FormData,
    options: RequestOptions & { signal?: AbortSignal } = {}
  ): Observable<UploadProgress<T>> {
    const {
      timeout: requestTimeout = 300000, // 5 minutes for uploads
      headers = {},
      signal
    } = options;

    const requestId = ApiUtils.generateRequestId();
    const url = `${this.config.baseUrl}/${endpoint.replace(/^\//, '')}`;

    const httpHeaders = new HttpHeaders({
      'X-Request-ID': requestId,
      ...headers
    });

    const req = new HttpRequest('POST', url, formData, {
      headers: httpHeaders,
      reportProgress: true
    });

    return this.http.request(req).pipe(
      timeout(requestTimeout),
      map((event: HttpEvent<any>) => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            const loaded = event.loaded || 0;
            const total = event.total || 0;
            const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0;

            return {
              loaded,
              total,
              percentage,
              completed: false
            } as UploadProgress<T>;

          case HttpEventType.Response:
            const responseData = event.body?.data !== undefined ? event.body.data : event.body;
            return {
              loaded: event.body?.size || 0,
              total: event.body?.size || 0,
              percentage: 100,
              data: responseData,
              completed: true
            } as UploadProgress<T>;

          default:
            return {
              loaded: 0,
              total: 0,
              percentage: 0,
              completed: false
            } as UploadProgress<T>;
        }
      }),
      filter(progress => progress.percentage > 0 || progress.completed),
      catchError((error: HttpErrorResponse) => {
        const apiError = ApiUtils.transformError(error, requestId);
        return throwError(() => apiError);
      })
    );
  }

  /**
   * Generate request ID for deduplication
   */
  private generateRequestId(method: string, endpoint: string, data?: any, params?: any): string {
    if (this.config.enableRequestDeduplication) {
      return this.requestManager.generateCacheKey(method, endpoint, data, params);
    }
    return ApiUtils.generateRequestId();
  }
}