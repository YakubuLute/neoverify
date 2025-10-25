import { Directive, Input, TemplateRef, ViewContainerRef, inject, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { PermissionsService, DocumentOperation } from '../../core/services/permissions.service';
import { AuthService } from '../../core/services/auth.service';
import { Document, AuditAction } from '../models/document.models';

@Directive({
    selector: '[hasPermission]',
    standalone: true
})
export class HasPermissionDirective implements OnInit, OnDestroy {
    private readonly permissionsService = inject(PermissionsService);
    private readonly authService = inject(AuthService);
    private readonly templateRef = inject(TemplateRef<any>);
    private readonly viewContainer = inject(ViewContainerRef);
    private readonly destroy$ = new Subject<void>();

    private hasView = false;

    @Input() set hasPermission(permission: string | DocumentOperation) {
        this.checkPermission(permission);
    }

    @Input() hasPermissionDocument?: Document;
    @Input() hasPermissionElse?: TemplateRef<any>;

    ngOnInit() {
        // Re-check permissions when user changes
        this.authService.currentUser$
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                this.checkPermission(this.currentPermission!);
            });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private currentPermission: string | DocumentOperation | undefined;

    private checkPermission(permission: string | DocumentOperation) {
        this.currentPermission = permission;

        if (!permission) {
            this.updateView(false);
            return;
        }

        let hasPermission = false;

        if (typeof permission === 'string') {
            // Simple permission string check
            hasPermission = this.permissionsService.hasPermission(permission);
        } else {
            // Document operation check
            const result = this.permissionsService.canPerformDocumentOperation(
                permission,
                this.hasPermissionDocument
            );
            hasPermission = result.allowed;
        }

        this.updateView(hasPermission);
    }

    private updateView(hasPermission: boolean) {
        if (hasPermission && !this.hasView) {
            this.viewContainer.createEmbeddedView(this.templateRef);
            this.hasView = true;
        } else if (!hasPermission && this.hasView) {
            this.viewContainer.clear();
            this.hasView = false;

            // Show else template if provided
            if (this.hasPermissionElse) {
                this.viewContainer.createEmbeddedView(this.hasPermissionElse);
            }
        }
    }
}