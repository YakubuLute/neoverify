import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SHARED_IMPORTS } from '../../index';

@Component({
  selector: 'app-error',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <div class="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-900">
      <div class="max-w-md w-full text-center">
        <div class="mb-8">
          <i [class]="getErrorIcon()" class="text-8xl text-surface-400 mb-4 block"></i>
          <h1 class="text-4xl font-bold text-surface-900 dark:text-surface-0 mb-2">
            {{ getErrorTitle() }}
          </h1>
          <p class="text-surface-600 dark:text-surface-400 text-lg">
            {{ getErrorMessage() }}
          </p>
        </div>

        <div class="space-y-4">
          <p-button
            [label]="getPrimaryActionLabel()"
            icon="pi pi-home"
            (onClick)="primaryAction()"
            styleClass="w-full"
          ></p-button>
          
          <p-button
            label="Go Back"
            icon="pi pi-arrow-left"
            [outlined]="true"
            (onClick)="goBack()"
            styleClass="w-full"
          ></p-button>
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
export class ErrorComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly errorType = this.route.snapshot.data['errorType'] || 'notFound';

  getErrorIcon(): string {
    switch (this.errorType) {
      case 'forbidden':
        return 'pi pi-ban';
      case 'notFound':
        return 'pi pi-search';
      case 'serverError':
        return 'pi pi-exclamation-triangle';
      default:
        return 'pi pi-question-circle';
    }
  }

  getErrorTitle(): string {
    switch (this.errorType) {
      case 'forbidden':
        return '403';
      case 'notFound':
        return '404';
      case 'serverError':
        return '500';
      default:
        return 'Error';
    }
  }

  getErrorMessage(): string {
    switch (this.errorType) {
      case 'forbidden':
        return 'You don\'t have permission to access this resource.';
      case 'notFound':
        return 'The page you\'re looking for doesn\'t exist.';
      case 'serverError':
        return 'Something went wrong on our end. Please try again later.';
      default:
        return 'An unexpected error occurred.';
    }
  }

  getPrimaryActionLabel(): string {
    switch (this.errorType) {
      case 'forbidden':
        return 'Go to Dashboard';
      default:
        return 'Go Home';
    }
  }

  primaryAction(): void {
    switch (this.errorType) {
      case 'forbidden':
        this.router.navigate(['/dashboard']);
        break;
      default:
        this.router.navigate(['/']);
        break;
    }
  }

  goBack(): void {
    window.history.back();
  }
}