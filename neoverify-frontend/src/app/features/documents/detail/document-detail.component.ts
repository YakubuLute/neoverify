import { Component } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared';

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="max-w-6xl mx-auto">
        <div class="text-center py-16">
          <i class="pi pi-file-text text-6xl text-surface-400 mb-4 block"></i>
          <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0 mb-2">
            Document Details
          </h1>
          <p class="text-surface-600 dark:text-surface-400 mb-8">
            This feature is being implemented. Document details view will be available soon.
          </p>
          <p-button
            label="Back to Documents"
            icon="pi pi-arrow-left"
            routerLink="/documents"
          ></p-button>
        </div>
      </div>
    </div>
  `
})
export class DocumentDetailComponent {}