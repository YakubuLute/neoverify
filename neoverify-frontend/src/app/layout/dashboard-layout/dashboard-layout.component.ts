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
                    children: [
                        { label: 'All Documents', icon: 'pi pi-list', route: '/documents' },
                        { label: 'Upload Document', icon: 'pi pi-upload', route: '/documents/upload' },
                        { label: 'Templates', icon: 'pi pi-bookmark', route: '/documents/templates' }
                    ]
                },
                {
                    label: 'Organization',
                    icon: 'pi pi-building',
                    route: '/organization',
                    children: [
                        { label: 'Settings', icon: 'pi pi-cog', route: '/organization/settings' },
                        { label: 'Team Members', icon: 'pi pi-users', route: '/organization/users' },
                        { label: 'API Keys', icon: 'pi pi-key', route: '/organization/api-keys' }
                    ]
                },
                {
                    label: 'Analytics',
                    icon: 'pi pi-chart-line',
                    route: '/analytics'
                }
            );
        }

        // Issuer specific items
        if (role === UserRole.ISSUER) {
            baseItems.push(
                {
                    label: 'My Documents',
                    icon: 'pi pi-file',
                    route: '/documents'
                },
                {
                    label: 'Upload Document',
                    icon: 'pi pi-upload',
                    route: '/documents/upload'
                },
                {
                    label: 'Templates',
                    icon: 'pi pi-bookmark',
                    route: '/documents/templates'
                }
            );
        }

        // Individual/Verifier items
        if (role === UserRole.VERIFIER || !role) {
            baseItems.push(
                {
                    label: 'My Documents',
                    icon: 'pi pi-file',
                    route: '/documents'
                },
                {
                    label: 'Verify Document',
                    icon: 'pi pi-search',
                    route: '/documents/verify'
                }
            );
        }

        // Common items for all authenticated users
        baseItems.push(
            {
                label: 'Profile',
                icon: 'pi pi-user',
                route: '/profile'
            }
        );

        return baseItems;
    });

    ngOnInit(): void {
        const user = this.authService.getCurrentUser();
        this.currentUser.set(user);
        this.userRole.set(user?.role || UserRole.VERIFIER);
    }

    toggleSidebar(): void {
        this.sidebarCollapsed.update(collapsed => !collapsed);
    }

    navigateTo(route: string): void {
        this.router.navigate([route]);
    }

    logout(): void {
        this.authService.logout().subscribe({
            next: () => {
                this.router.navigate(['/']);
            },
            error: (error) => {
                console.error('Logout error:', error);
                // Force navigation even if logout fails
                this.router.navigate(['/']);
            }
        });
    }

    getUserInitials(): string {
        const user = this.currentUser();
        if (!user?.name) return 'U';

        const names = user.name.split(' ');
        if (names.length >= 2) {
            return `${names[0][0]}${names[1][0]}`.toUpperCase();
        }
        return user.name[0].toUpperCase();
    }

    getRoleDisplayName(): string {
        switch (this.userRole()) {
            case UserRole.PLATFORM_ADMIN:
                return 'Platform Admin';
            case UserRole.ORG_ADMIN:
                return 'Organization Admin';
            case UserRole.ISSUER:
                return 'Document Issuer';
            case UserRole.VERIFIER:
                return 'Verifier';
            case UserRole.AUDITOR:
                return 'Auditor';
            default:
                return 'User';
        }
    }
}