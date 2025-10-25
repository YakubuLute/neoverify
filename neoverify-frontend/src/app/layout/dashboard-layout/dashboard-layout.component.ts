import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../shared/models/auth.models';
import { SHARED_IMPORTS } from '../../shared';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  roles?: UserRole[];
  badge?: string;
  children?: MenuItem[];
}

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SHARED_IMPORTS],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss'
})
export class DashboardLayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly sidebarCollapsed = signal<boolean>(false);
  readonly currentUser = signal<any>(null);
  readonly userRole = signal<UserRole | null>(null);
  readonly UserRole = UserRole; // Make enum available in template

  // Menu items based on user role
  readonly menuItems = computed(() => {
    const role = this.userRole();
    const baseItems: MenuItem[] = [
      {
        label: 'Dashboard',
        icon: 'pi pi-home',
        route: '/dashboard',
        roles: [UserRole.PLATFORM_ADMIN, UserRole.ORG_ADMIN, UserRole.ISSUER, UserRole.VERIFIER]
      }
    ];

    // Platform Admin specific items
    if (role === UserRole.PLATFORM_ADMIN) {
      baseItems.push(
        {
          label: 'Organizations',
          icon: 'pi pi-building',
          route: '/admin/organizations'
        },
        {
          label: 'Users',
          icon: 'pi pi-users',
          route: '/admin/users'
        },
        {
          label: 'System Analytics',
          icon: 'pi pi-chart-bar',
          route: '/admin/analytics'
        },
        {
          label: 'Security',
          icon: 'pi pi-shield',
          route: '/admin/security'
        }
      );
    }

    // Organization Admin specific items
    if (role === UserRole.ORG_ADMIN) {
      baseItems.push(
        {
          label: 'Documents',
          icon: 'pi pi-file',
          route: '/documents',
