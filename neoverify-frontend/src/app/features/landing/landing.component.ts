import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SHARED_IMPORTS } from '../../shared';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <!-- Header -->
      <div class="bg-white shadow-sm border-b border-gray-200 p-4">
        <div class="container mx-auto flex items-center justify-between">
          <h1 class="text-2xl font-bold text-blue-600">
            NeoVerify
          </h1>
          <p-button 
            label="Get Started" 
            icon="pi pi-arrow-right"
            (onClick)="navigate('/dashboard')">
          </p-button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="container mx-auto px-4 py-16">
        <div class="max-w-4xl mx-auto text-center">
          <h2 class="text-4xl font-bold text-gray-900 mb-6">
            Welcome to NeoVerify
          </h2>
          <p class="text-xl text-gray-600 mb-12">
            Secure Document Verification Platform
          </p>

          <!-- Feature Cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <i class="pi pi-shield text-4xl text-blue-500 mb-4"></i>
              <h3 class="text-xl font-semibold mb-3 text-gray-900">Secure & Trusted</h3>
              <p class="text-gray-600">
                Blockchain-based document verification with advanced security features
              </p>
            </div>

            <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <i class="pi pi-verified text-4xl text-green-500 mb-4"></i>
              <h3 class="text-xl font-semibold mb-3 text-gray-900">Instant Verification</h3>
              <p class="text-gray-600">
                Verify document authenticity in seconds with our advanced AI technology
              </p>
            </div>

            <div class="bg-white dark:bg-surface-800 p-6 rounded-lg shadow-sm border border-surface-200 dark:border-surface-700">
              <i class="pi pi-shield text-4xl text-primary-500 mb-4"></i>
              <h3 class="text-xl font-semibold mb-3">Type Safe</h3>
              <p class="text-surface-600 dark:text-surface-400">
                Full TypeScript support with strict mode and best practices
              </p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-wrap gap-4 justify-center">
            <p-button 
              label="View Dashboard" 
              icon="pi pi-home"
              (onClick)="navigate('/dashboard')">
            </p-button>
            
            <p-button 
              label="Documentation" 
              icon="pi pi-book" 
              [outlined]="true"
              (onClick)="openDocs()">
            </p-button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class LandingComponent {
  constructor(private router: Router) {}

  navigate(route: string): void {
    this.router.navigate([route]);
  }

  openDocs(): void {
    window.open('https://angular.dev', '_blank');
  }
}