import { Component } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="max-w-6xl mx-auto">
        <div class="text-center py-16">
          <i class="pi pi-users text-6xl text-surface-400 mb-4 block"></i>
          <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0 mb-2">
            User Management
          </h1>
          <p class="text-surface-600 dark:text-surface-400 mb-8">
            This feature is coming soon. Manage organization users, roles, and permissions.
          </p>
          <p-button
            label="Back to Dashboard"
            icon="pi pi-arrow-left"
            routerLink="/dashboard"
          ></p-button>
        </div>
      </div>
    </div>
  `
})
export class UserManagementComponent {}