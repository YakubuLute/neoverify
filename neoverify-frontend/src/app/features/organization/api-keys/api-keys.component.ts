import { Component } from '@angular/core';
import { SharedModule } from '../../../shared';

@Component({
  selector: 'app-api-keys',
  standalone: true,
  imports: [SharedModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="max-w-6xl mx-auto">
        <div class="text-center py-16">
          <i class="pi pi-key text-6xl text-surface-400 mb-4 block"></i>
          <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0 mb-2">
            API Keys Management
          </h1>
          <p class="text-surface-600 dark:text-surface-400 mb-8">
            This feature is coming soon. Generate and manage API keys for programmatic access.
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
export class ApiKeysComponent {}