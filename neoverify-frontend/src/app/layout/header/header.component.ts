import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core';
import { SharedModule } from '../../shared';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [SharedModule],
  template: `
    <p-toolbar class="border-b border-surface-200 dark:border-surface-700">
      <div class="flex items-center justify-between w-full">
        <!-- Logo and Navigation -->
        <div class="flex items-center space-x-4">
          <h1 class="text-2xl font-bold text-primary-600 dark:text-primary-400 cursor-pointer"
              (click)="navigateHome()">
            NeoVerify
          </h1>
          
          <div class="hidden md:flex items-center space-x-2">
            <p-button 
              label="Dashboard" 
              icon="pi pi-home" 
              [text]="true"
              (onClick)="navigate('/dashboard')"
              class="mr-2">
            </p-button>
            
            <p-button 
              label="Analytics" 
              icon="pi pi-chart-line" 
              [text]="true"
              (onClick)="navigate('/analytics')"
              class="mr-2">
            </p-button>
          </div>
        </div>
        
        <!-- User Menu -->
        <div class="flex items-center space-x-4">
          <!-- Notifications -->
          <p-button 
            icon="pi pi-bell" 
            [text]="true"
            [badge]="notificationCount().toString()"
            badgeClass="p-badge-danger"
            (onClick)="toggleNotifications()"
            pTooltip="Notifications"
            tooltipPosition="bottom">
          </p-button>
          
          <!-- User Profile -->
          @if (currentUser(); as user) {
            <div class="flex items-center space-x-2">
              <p-avatar 
                [label]="getUserInitials(user.name)"
                [image]="user.avatar"
                shape="circle"
                size="normal"
                class="cursor-pointer"
                (click)="toggleUserMenu()"
                pTooltip="User Menu"
                tooltipPosition="bottom">
              </p-avatar>
              
              <div class="hidden md:block">
                <div class="text-sm font-medium text-surface-900 dark:text-surface-0">
                  {{ user.name }}
                </div>
                <div class="text-xs text-surface-600 dark:text-surface-400">
                  {{ user.role }}
                </div>
              </div>
            </div>
          } @else {
            <p-button 
              label="Login" 
              icon="pi pi-sign-in"
              (onClick)="navigate('/auth/login')">
            </p-button>
          }
          
          <!-- Mobile Menu Toggle -->
          <p-button 
            icon="pi pi-bars"
            [text]="true"
            class="md:hidden"
            (onClick)="toggleMobileMenu()"
            pTooltip="Menu"
            tooltipPosition="bottom">
          </p-button>
        </div>
      </div>
    </p-toolbar>

    <!-- Mobile Menu -->
    @if (showMobileMenu()) {
      <div class="md:hidden bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 p-4">
        <div class="space-y-2">
          <p-button 
            label="Dashboard" 
            icon="pi pi-home" 
            [text]="true"
            class="w-full justify-start"
            (onClick)="navigate('/dashboard')">
          </p-button>
          
          <p-button 
            label="Analytics" 
            icon="pi pi-chart-line" 
            [text]="true"
            class="w-full justify-start"
            (onClick)="navigate('/analytics')">
          </p-button>
          
          @if (currentUser()) {
            <p-divider></p-divider>
            <p-button 
              label="Profile" 
              icon="pi pi-user" 
              [text]="true"
              class="w-full justify-start"
              (onClick)="navigate('/profile')">
            </p-button>
            
            <p-button 
              label="Settings" 
              icon="pi pi-cog" 
              [text]="true"
              class="w-full justify-start"
              (onClick)="navigate('/settings')">
            </p-button>
            
            <p-button 
              label="Logout" 
              icon="pi pi-sign-out" 
              [text]="true"
              class="w-full justify-start text-red-600"
              (onClick)="logout()">
            </p-button>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }
    
    ::ng-deep .p-toolbar {
      @apply bg-white dark:bg-surface-800 shadow-sm;
    }
  `]
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUser = this.authService.currentUser;
  readonly notificationCount = signal(3); // Mock notification count
  readonly showMobileMenu = signal(false);

  /**
   * Navigate to route
   */
  navigate(route: string): void {
    this.router.navigate([route]);
    this.showMobileMenu.set(false);
  }

  /**
   * Navigate to home
   */
  navigateHome(): void {
    this.navigate('/dashboard');
  }

  /**
   * Toggle mobile menu
   */
  toggleMobileMenu(): void {
    this.showMobileMenu.update(show => !show);
  }

  /**
   * Toggle notifications panel
   */
  toggleNotifications(): void {
    // Implement notifications panel
    console.log('Toggle notifications');
  }

  /**
   * Toggle user menu
   */
  toggleUserMenu(): void {
    // Implement user menu dropdown
    console.log('Toggle user menu');
  }

  /**
   * Logout user
   */
  logout(): void {
    this.authService.logout();
    this.showMobileMenu.set(false);
  }

  /**
   * Get user initials for avatar
   */
  getUserInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }
}