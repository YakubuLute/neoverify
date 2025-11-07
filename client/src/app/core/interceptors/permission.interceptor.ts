import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap, take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PermissionsService } from '../services/permissions.service';
import { NotificationService } from '../services/notification.service';
import { AuditAction } from '../../shared/models/document.models';

@Injectable()
export class PermissionInterceptor implements HttpInterceptor {
    private readonly authService = inject(AuthService);
    private readonly permissionsService = inject(PermissionsService);
    private readonly router = inject(Router);
    private readonly notificationService = inject(NotificationService);

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // Skip permission checks for auth endpoints
        if (this.isAuthEndpoint(req.url)) {
            return next.handle(req);
        }

        // Check permissions before making the request
        return this.authService.currentUser$.pipe(
            take(1),
            switchMap(user => {
                if (!user) {
                    // User not authenticated, let auth interceptor handle it
                    return next.handle(req);
                }

                const permissionCheck = this.checkRequestPermissions(req, user.id, user.role, user.organizationId);

                if (!permissionCheck.allowed) {
                    this.notificationService.error(
                        permissionCheck.reason || 'You do not have permission to perform this action'
                    );
                    return throwError(() => new HttpErrorResponse({
                        status: 403,
                        statusText: 'Forbidden',
                        error: { message: permissionCheck.reason }
                    }));
                }

                return next.handle(req);
            }),
            catchError((error: HttpErrorResponse) => {
                if (error.status === 403) {
                    this.handlePermissionDenied(error);
                }
                return throwError(() => error);
            })
        );
    }

    private isAuthEndpoint(url: string): boolean {
        const authEndpoints = ['/auth/', '/verify/', '/public/'];
        return authEndpoints.some(endpoint => url.includes(endpoint));
    }

    private checkRequestPermissions(req: HttpRequest<any>, userId: string, userRole: string, orgId: string): { allowed: boolean; reason?: string } {
        const method = req.method.toLowerCase();
        const url = req.url;

        // Extract operation and resource from URL and method
        const operation = this.getOperationFromRequest(method, url);
        const resource = this.getResourceFromUrl(url);

        if (!operation || !resource) {
            // If we can't determine the operation/resource, allow the request
            // The backend will handle the actual permission check
            return { allowed: true };
        }

        // Check permissions based on the operation
        const permissionCheck = this.permissionsService.canPerformDocumentOperation(
            { action: operation, resource: resource as any }
        );

        return permissionCheck;
    }

    private getOperationFromRequest(method: string, url: string): AuditAction | null {
        // Map HTTP methods and URL patterns to audit actions
        if (method === 'get') {
            if (url.includes('/download')) return AuditAction.DOWNLOADED;
            return AuditAction.VIEWED;
        }

        if (method === 'post') {
            if (url.includes('/upload')) return AuditAction.CREATED;
            if (url.includes('/share')) return AuditAction.SHARED;
            if (url.includes('/verify')) return AuditAction.VERIFICATION_STARTED;
            return AuditAction.CREATED;
        }

        if (method === 'put' || method === 'patch') {
            return AuditAction.UPDATED;
        }

        if (method === 'delete') {
            return AuditAction.DELETED;
        }

        return null;
    }

    private getResourceFromUrl(url: string): string | null {
        if (url.includes('/documents')) return 'document';
        if (url.includes('/templates')) return 'template';
        if (url.includes('/audit')) return 'audit';
        if (url.includes('/users')) return 'user';

        return null;
    }

    private handlePermissionDenied(error: HttpErrorResponse): void {
        const message = error.error?.message || 'Access denied. You do not have permission to perform this action.';

        // Show user-friendly error message
        this.notificationService.error(message);

        // Redirect based on error context
        if (error.url?.includes('/documents')) {
            this.router.navigate(['/documents']);
        } else if (error.url?.includes('/organization')) {
            this.router.navigate(['/dashboard']);
        } else {
            // Stay on current page for other errors
        }
    }
}