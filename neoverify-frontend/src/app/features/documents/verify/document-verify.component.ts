import { Component } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared';

@Component({
  selector: 'app-document-verify',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0 mb-2">
            Verify Document
          </h1>
          <p class="text-surface-600 dark:text-surface-400">
            Upload a document, enter a hash, or use a verification ID to check authenticity
          </p>
        </div>

        <div class="text-center py-16">
          <i class="pi pi-shield text-6xl text-surface-400 mb-4 block"></i>
          <h2 class="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-4">
            Document Verification
          </h2>
          <p class="text-surface-600 dark:text-surface-400 mb-8">
            This feature is being implemented. Document verification will be available soon.
          </p>
          <p-button
            label="Back to Home"
            icon="pi pi-home"
            routerLink="/"
          ></p-button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .field {
      margin-bottom: 1rem;
    }
  `]
})
export class DocumentVerifyComponent {}