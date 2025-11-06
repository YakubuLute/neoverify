import { Injectable, inject, computed, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { UserRole } from '../../shared/models/auth.models';
import { Document, AuditAction, DocumentPermissions } from '../../shared/models/document.models';

export interface DocumentOperation {
    action: AuditAction;
    resource: 'document' | 'template' | 'audit' | 'user';
    context?: any;
}

export interface PermissionCheck {
    allowed: boolean;
    reason?: string;
}

@Injectable({
    providedIn: 'root'
})
export class PermissionsService {
    private readonly authService = inject(AuthService);

    // Role-based permissions matrix
    private readonly rolePermissions: Record<UserRole, Set<string>> = {
        [UserRole.PLATFORM_ADMIN]: new Set([
            'documents:view:all',
            'documents:create:all',
            'documents:edit:all',
            'documents:delete:all',
            'documents:share:all',
            'documents:download:all',
            'templates:view:all',
            'templates:create:all',
            'templates:edit:all',
            'templates:delete:all',
            'audit:view:all',
            'audit:export:all',
            'users:manage:all',
            'organization:manage:all'
        ]),
        [UserRole.ORG_ADMIN]: new Set([
            'documents:view:org',
            'documents:create:org',
            'documents:edit:org',
            'documents:delete:org',
            'documents:share:org',
            'documents:download:org',
            'templates:view:org',
            'templates:create:org',
            'templates:edit:org',
            'templates:delete:org',
            'audit:view:org',
            'audit:export:org',
            'users:manage:org'
        ]),
        [UserRole.ISSUER]: new Set([
            'documents:view:own',
            'documents:create:own',
            'documents:edit:own',
            'documents:delete:own',
            'documents:share:own',
            'documents:download:own',
            'templates:view:org',
            'templates:create:own',
            'templates:edit:own',
            'audit:view:own'
        ]),
        [UserRole.VERIFIER]: new Set([
            'documents:view:shared',
            'documents:download:shared',
            'audit:view:own'
        ]),
        [UserRole.AUDITOR]: new Set([
            'documents:view:org',
            'documents:download:org',
            'audit:view:org',
            'audit:export:org'
        ])
    };

    // Computed signals for current user permissions
    readonly currentUserRole = computed(() => this.authService.currentUser()?.role);
    readonly currentUserId = computed(() => this.authService.currentUser()?.id);
    readonly currentOrgId = computed(() => this.authService.currentUser()?.organizationId);

    /**
     * Check if current user has a specific permission
     */
    hasPermission(permission: string): boolean {
        const role = this.currentUserRole();
        if (!role) return false;

        const rolePerms = this.rolePermissions[role];
        return rolePerms.has(permission);
    }

    /**
     * Check if current user can perform an operation on a document
     */
    canPerformDocumentOperation(operation: DocumentOperation, document?: Document): PermissionCheck {
        const user = this.authService.currentUser();
        if (!user) {
            return { allowed: false, reason: 'User not authenticated' };
        }

        const { action, resource } = operation;

        // Platform admins can do everything
        if (user.role === UserRole.PLATFORM_ADMIN) {
            return { allowed: true };
        }

        // Check document-specific permissions
        if (resource === 'document' && document) {
            return this.checkDocumentPermissions(action, document, user.id, user.role, user.organizationId);
        }

        // Check general permissions based on role and action
        return this.checkGeneralPermissions(action, resource, user.role);
    }

    /**
     * Check document-specific permissions
     */
    private checkDocumentPermissions(
        action: AuditAction,
        document: Document,
        userId: string,
        userRole: UserRole,
        userOrgId: string
    ): PermissionCheck {
        // Check if document belongs to user's organization
        const sameOrg = document.organizationId === userOrgId;
        const isOwner = document.uploadedBy === userId;
        const isSharedWithUser = document.permissions?.sharedWith?.some(share => share.userId === userId);

        switch (action) {
            case AuditAction.VIEWED:
                if (userRole === UserRole.ORG_ADMIN && sameOrg) return { allowed: true };
                if (userRole === UserRole.AUDITOR && sameOrg) return { allowed: true };
                if (isOwner) return { allowed: true };
                if (isSharedWithUser && document.permissions?.canView) return { allowed: true };
                if (userRole === UserRole.VERIFIER && isSharedWithUser) return { allowed: true };
                return { allowed: false, reason: 'No view permission for this document' };

            case AuditAction.UPDATED:
                if (userRole === UserRole.ORG_ADMIN && sameOrg) return { allowed: true };
                if (isOwner && (userRole === UserRole.ISSUER || userRole === UserRole.ORG_ADMIN)) return { allowed: true };
                if (isSharedWithUser && document.permissions?.canEdit) return { allowed: true };
                return { allowed: false, reason: 'No edit permission for this document' };

            case AuditAction.DELETED:
                if (userRole === UserRole.ORG_ADMIN && sameOrg) return { allowed: true };
                if (isOwner && (userRole === UserRole.ISSUER || userRole === UserRole.ORG_ADMIN)) return { allowed: true };
                return { allowed: false, reason: 'No delete permission for this document' };

            case AuditAction.SHARED:
                if (userRole === UserRole.ORG_ADMIN && sameOrg) return { allowed: true };
                if (isOwner && document.permissions?.canShare) return { allowed: true };
                return { allowed: false, reason: 'No share permission for this document' };

            case AuditAction.DOWNLOADED:
                if (userRole === UserRole.ORG_ADMIN && sameOrg) return { allowed: true };
                if (userRole === UserRole.AUDITOR && sameOrg) return { allowed: true };
                if (isOwner) return { allowed: true };
                if (isSharedWithUser && document.permissions?.canDownload) return { allowed: true };
                if (userRole === UserRole.VERIFIER && isSharedWithUser) return { allowed: true };
                return { allowed: false, reason: 'No download permission for this document' };

            default:
                return { allowed: false, reason: 'Unknown action' };
        }
    }

    /**
     * Check general permissions based on role and action
     */
    private checkGeneralPermissions(action: AuditAction, resource: string, userRole: UserRole): PermissionCheck {
        const permissionKey = `${resource}:${action.toLowerCase()}`;

        switch (userRole) {
            case UserRole.PLATFORM_ADMIN:
                return { allowed: true };

            case UserRole.ORG_ADMIN:
                if (resource === 'document' || resource === 'template' || resource === 'audit') {
                    return { allowed: true };
                }
                break;

            case UserRole.ISSUER:
                if (resource === 'document' && [AuditAction.CREATED, AuditAction.UPDATED].includes(action)) {
                    return { allowed: true };
                }
                if (resource === 'template' && action === AuditAction.VIEWED) {
                    return { allowed: true };
                }
                break;

            case UserRole.VERIFIER:
                if (resource === 'document' && [AuditAction.VIEWED, AuditAction.DOWNLOADED].includes(action)) {
                    return { allowed: true };
                }
                break;

            case UserRole.AUDITOR:
                if (resource === 'document' && [AuditAction.VIEWED, AuditAction.DOWNLOADED].includes(action)) {
                    return { allowed: true };
                }
                if (resource === 'audit' && action === AuditAction.VIEWED) {
                    return { allowed: true };
                }
                break;
        }

        return { allowed: false, reason: `Role ${userRole} does not have permission for ${permissionKey}` };
    }

    /**
     * Check if user can access a specific route
     */
    canAccessRoute(route: string): boolean {
        const user = this.authService.currentUser();
        if (!user) return false;

        const routePermissions: Record<string, UserRole[]> = {
            '/documents': [UserRole.PLATFORM_ADMIN, UserRole.ORG_ADMIN, UserRole.ISSUER, UserRole.VERIFIER, UserRole.AUDITOR],
            '/documents/upload': [UserRole.PLATFORM_ADMIN, UserRole.ORG_ADMIN, UserRole.ISSUER],
            '/documents/templates': [UserRole.PLATFORM_ADMIN, UserRole.ORG_ADMIN, UserRole.ISSUER],
            '/documents/audit': [UserRole.PLATFORM_ADMIN, UserRole.ORG_ADMIN, UserRole.AUDITOR],
            '/organization/users': [UserRole.PLATFORM_ADMIN, UserRole.ORG_ADMIN],
            '/organization/settings': [UserRole.PLATFORM_ADMIN, UserRole.ORG_ADMIN],
            '/organization/api-keys': [UserRole.PLATFORM_ADMIN, UserRole.ORG_ADMIN]
        };

        const allowedRoles = routePermissions[route];
        return allowedRoles ? allowedRoles.includes(user.role) : true;
    }

    /**
     * Get filtered document permissions based on user role and document ownership
     */
    getDocumentPermissions(document: Document): DocumentPermissions {
        const user = this.authService.currentUser();
        if (!user) {
            return {
                canView: false,
                canEdit: false,
                canDelete: false,
                canShare: false,
                canDownload: false
            };
        }

        const viewCheck = this.canPerformDocumentOperation(
            { action: AuditAction.VIEWED, resource: 'document' },
            document
        );
        const editCheck = this.canPerformDocumentOperation(
            { action: AuditAction.UPDATED, resource: 'document' },
            document
        );
        const deleteCheck = this.canPerformDocumentOperation(
            { action: AuditAction.DELETED, resource: 'document' },
            document
        );
        const shareCheck = this.canPerformDocumentOperation(
            { action: AuditAction.SHARED, resource: 'document' },
            document
        );
        const downloadCheck = this.canPerformDocumentOperation(
            { action: AuditAction.DOWNLOADED, resource: 'document' },
            document
        );

        return {
            canView: viewCheck.allowed,
            canEdit: editCheck.allowed,
            canDelete: deleteCheck.allowed,
            canShare: shareCheck.allowed,
            canDownload: downloadCheck.allowed,
            sharedWith: document.permissions?.sharedWith || []
        };
    }

    /**
     * Check if user can perform bulk operations
     */
    canPerformBulkOperation(operation: string, documents: Document[]): PermissionCheck {
        const user = this.authService.currentUser();
        if (!user) {
            return { allowed: false, reason: 'User not authenticated' };
        }

        // Platform admins can perform any bulk operation
        if (user.role === UserRole.PLATFORM_ADMIN) {
            return { allowed: true };
        }

        // Org admins can perform bulk operations on documents in their organization
        if (user.role === UserRole.ORG_ADMIN) {
            const allInOrg = documents.every(doc => doc.organizationId === user.organizationId);
            if (!allInOrg) {
                return { allowed: false, reason: 'Cannot perform bulk operations on documents outside your organization' };
            }
            return { allowed: true };
        }

        // Other roles can only perform bulk operations on their own documents
        const allOwned = documents.every(doc => doc.uploadedBy === user.id);
        if (!allOwned) {
            return { allowed: false, reason: 'Cannot perform bulk operations on documents you do not own' };
        }

        // Check specific operation permissions
        switch (operation) {
            case 'delete':
                return user.role === UserRole.ISSUER ? { allowed: true } : { allowed: false, reason: 'No delete permission' };
            case 'update_status':
                return user.role === UserRole.ISSUER ? { allowed: true } : { allowed: false, reason: 'No status update permission' };
            case 'add_tags':
            case 'remove_tags':
                return user.role === UserRole.ISSUER ? { allowed: true } : { allowed: false, reason: 'No tag modification permission' };
            case 'export':
                return { allowed: true }; // Users can export their own documents
            default:
                return { allowed: false, reason: 'Unknown bulk operation' };
        }
    }

    /**
     * Get user-friendly permission error message
     */
    getPermissionErrorMessage(operation: string, resource: string = 'document'): string {
        const user = this.authService.currentUser();
        if (!user) {
            return 'You must be logged in to perform this action.';
        }

        const messages: Record<string, string> = {
            'view': 'You do not have permission to view this document.',
            'edit': 'You do not have permission to edit this document.',
            'delete': 'You do not have permission to delete this document.',
            'share': 'You do not have permission to share this document.',
            'download': 'You do not have permission to download this document.',
            'create': 'You do not have permission to create documents.',
            'upload': 'You do not have permission to upload documents.',
            'manage_templates': 'You do not have permission to manage templates.',
            'view_audit': 'You do not have permission to view audit logs.',
            'manage_users': 'You do not have permission to manage users.'
        };

        return messages[operation] || `You do not have permission to perform this action on ${resource}.`;
    }
}