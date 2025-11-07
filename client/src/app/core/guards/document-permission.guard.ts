import { inject } from '@angular/core';
import { Router, type CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { map, take, switchMap, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { PermissionsService } from '../services/permissions.service';
import { DocumentService } from '../services/document.service';
import { NotificationService } from '../services/notification.service';
import { AuditAction } from '../../shared/models/document.models';

/**
 * Guard to check document-specific permissions
 * Usage: canActivate: [documentPermissionGuard], data: { action: 'view', requireDocument: true }
 */
export const documentPermissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
    const authService = inject(AuthService);
    const permissionsService = inject(PermissionsService);
    const documentService = inject(DocumentService);
    const router = inject(Router);
    const notificationService = inject(NotificationService);

    const action = route.data['action'] as string;
    const requireDocument = route.data['requireDocument'] as boolean;
    const documentId = route.params['id'] || route.params['documentId'];

    return authService.currentUser$.pipe(
        take(1),
        switchMap(user => {
            if (!user) {
                router.navigate(['/auth/login']);
                return of(false);
            }

            // Check route-level permissions first
            const routePath = route.routeConfig?.path || '';
            const fullPath = getFullRoutePath(route);

            if (!permissionsService.canAccessRoute(fullPath)) {
                notificationService.error(permissionsService.getPermissionErrorMessage('access', 'page'));
                router.navigate(['/unauthorized']);
                return of(false);
            }

            // If no document-specific check is required, allow access
            if (!requireDocument || !documentId || !action) {
                return of(true);
            }

            // Load document and check permissions
            return documentService.getDocument(documentId).pipe(
                map(document => {
                    const auditAction = mapActionToAuditAction(action);
                    const permissionCheck = permissionsService.canPerformDocumentOperation(
                        { action: auditAction, resource: 'document' },
                        document
                    );

                    if (!permissionCheck.allowed) {
                        notificationService.error(
                            permissionCheck.reason || permissionsService.getPermissionErrorMessage(action)
                        );
                        router.navigate(['/documents']);
                        return false;
                    }

                    return true;
                }),
                take(1)
            );
        })
    );
};

/**
 * Guard for document upload routes
 */
export const documentUploadGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const permissionsService = inject(PermissionsService);
    const router = inject(Router);
    const notificationService = inject(NotificationService);

    return authService.currentUser$.pipe(
        take(1),
        map(user => {
            if (!user) {
                router.navigate(['/auth/login']);
                return false;
            }

            const permissionCheck = permissionsService.canPerformDocumentOperation(
                { action: AuditAction.CREATED, resource: 'document' }
            );

            if (!permissionCheck.allowed) {
                notificationService.error(permissionsService.getPermissionErrorMessage('upload'));
                router.navigate(['/documents']);
                return false;
            }

            return true;
        })
    );
};

/**
 * Guard for template management routes
 */
export const templateManagementGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const permissionsService = inject(PermissionsService);
    const router = inject(Router);
    const notificationService = inject(NotificationService);

    return authService.currentUser$.pipe(
        take(1),
        map(user => {
            if (!user) {
                router.navigate(['/auth/login']);
                return false;
            }

            // Check if user can view templates
            if (!permissionsService.hasPermission('templates:view:org') &&
                !permissionsService.hasPermission('templates:view:own')) {
                notificationService.error(permissionsService.getPermissionErrorMessage('manage_templates'));
                router.navigate(['/documents']);
                return false;
            }

            return true;
        })
    );
};

/**
 * Guard for audit trail routes
 */
export const auditTrailGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const permissionsService = inject(PermissionsService);
    const router = inject(Router);
    const notificationService = inject(NotificationService);

    return authService.currentUser$.pipe(
        take(1),
        map(user => {
            if (!user) {
                router.navigate(['/auth/login']);
                return false;
            }

            if (!permissionsService.hasPermission('audit:view:org') &&
                !permissionsService.hasPermission('audit:view:own')) {
                notificationService.error(permissionsService.getPermissionErrorMessage('view_audit'));
                router.navigate(['/documents']);
                return false;
            }

            return true;
        })
    );
};

/**
 * Helper function to get full route path
 */
function getFullRoutePath(route: ActivatedRouteSnapshot): string {
    const segments: string[] = [];
    let currentRoute: ActivatedRouteSnapshot | null = route;

    while (currentRoute) {
        if (currentRoute.routeConfig?.path) {
            segments.unshift(currentRoute.routeConfig.path);
        }
        currentRoute = currentRoute.parent;
    }

    return '/' + segments.join('/').replace(/\/+/g, '/');
}

/**
 * Map route action to audit action
 */
function mapActionToAuditAction(action: string): AuditAction {
    const actionMap: Record<string, AuditAction> = {
        'view': AuditAction.VIEWED,
        'edit': AuditAction.UPDATED,
        'delete': AuditAction.DELETED,
        'share': AuditAction.SHARED,
        'download': AuditAction.DOWNLOADED,
        'create': AuditAction.CREATED
    };

    return actionMap[action] || AuditAction.VIEWED;
}