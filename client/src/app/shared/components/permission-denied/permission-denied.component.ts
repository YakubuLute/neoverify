import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../models/auth.models';

@Component({
    selector: 'app-permission-denied',
    standalone: true,
    imports: [CommonModule, ButtonModule, CardModule],
    template: `
    <div class="flex items-center justify-center min-h-[400px] p-6">
      <p-card class="max-w-md w-full">
        <ng-template pTemplate="header">
          <div class="text-center p-6">
            <i class="pi pi-lock text-6xl text-red-500 mb-4"></i>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ title || 'Access Denied' }}
            </h2>
          </div>
        </ng-template>
        
        <div class="text-center space-y-4">
          <p class="text-gray-600 dark:text-gray-300">
            {{ message || getDefaultMessage() }}
          </p>
          
          <div class="space-y-2">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Current role: <span class="font-medium">{{ getCurrentRoleDisplay() }}</span>
            </p>
            
            <div *ngIf="requiredRoles && requiredRoles.length > 0" class="text-sm text-gray-500 dark:text-gray-400">
              Required role(s): 
              <span class="font-medium">{{ getRequiredRolesDisplay() }}</span>
            </div>
          </div>
        </div>
        
        <ng-template pTemplate="footer">
          <div class="flex justify-center space-x-3">
            <p-button 
              label="Go Back" 
              icon="pi pi-arrow-left" 
              severity="secondary"
              (onClick)="goBack()">
            </p-button>
            
            <p-button 
              label="Dashboard" 
              icon="pi pi-home"
              (onClick)="goToDashboard()">
            </p-button>
          </div>
        </ng-template>
      </p-card>
    </div>
  `
})
export class PermissionDeniedComponent {
    private readonly router = inject(Router);
    private readonly authService = inject(AuthService);

    @Input() title?: string;
    @Input() message?: string;
    @Input() requiredRoles?: UserRole[];
    @Input() showRoleInfo = true;

    getDefaultMessage(): string {
        return 'You do not have the necessary permissions to access this resource. Please contact your administrator if you believe this is an error.';
    }

    getCurrentRoleDisplay(): string {
        const user = this.authService.getCurrentUser();
        if (!user) return 'Not authenticated';

        return this.formatRole(user.role);
    }

    getRequiredRolesDisplay(): string {
        if (!this.requiredRoles || this.requiredRoles.length === 0) {
            return 'Not specified';
        }

        return this.requiredRoles.map(role => this.formatRole(role)).join(', ');
    }

    private formatRole(role: UserRole): string {
        const roleNames: Record<UserRole, string> = {
            [UserRole.PLATFORM_ADMIN]: 'Platform Administrator',
            [UserRole.ORG_ADMIN]: 'Organization Administrator',
            [UserRole.ISSUER]: 'Document Issuer',
            [UserRole.VERIFIER]: 'Document Verifier',
            [UserRole.AUDITOR]: 'Auditor'
        };

        return roleNames[role] || role;
    }

    goBack(): void {
        window.history.back();
    }

    goToDashboard(): void {
        this.router.navigate(['/dashboard']);
    }
}