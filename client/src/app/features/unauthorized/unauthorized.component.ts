import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PermissionDeniedComponent } from '../../shared/components/permission-denied/permission-denied.component';

@Component({
    selector: 'app-unauthorized',
    standalone: true,
    imports: [CommonModule, PermissionDeniedComponent],
    template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <app-permission-denied
        title="Unauthorized Access"
        message="You are not authorized to access this page. Please contact your administrator if you need access to this resource.">
      </app-permission-denied>
    </div>
  `
})
export class UnauthorizedComponent { }