import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingCount = 0;
  readonly isLoading = signal<boolean>(false);

  /**
   * Show loading indicator
   */
  show(): void {
    this.loadingCount++;
    this.isLoading.set(true);
  }

  /**
   * Hide loading indicator
   */
  hide(): void {
    this.loadingCount = Math.max(0, this.loadingCount - 1);
    
    if (this.loadingCount === 0) {
      this.isLoading.set(false);
    }
  }

  /**
   * Force hide loading indicator
   */
  forceHide(): void {
    this.loadingCount = 0;
    this.isLoading.set(false);
  }
}