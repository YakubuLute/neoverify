import { Component, input } from '@angular/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [ProgressSpinnerModule],
  template: `
    <div class="flex items-center justify-center p-8" [class]="containerClass()">
      <p-progressSpinner 
        [style]="{ width: size() + 'px', height: size() + 'px' }"
        strokeWidth="4"
        animationDuration="1s">
      </p-progressSpinner>
      @if (message()) {
        <p class="ml-3 text-surface-600 dark:text-surface-400">{{ message() }}</p>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class LoadingSpinnerComponent {
  readonly size = input<number>(50);
  readonly message = input<string>('');
  readonly containerClass = input<string>('');
}