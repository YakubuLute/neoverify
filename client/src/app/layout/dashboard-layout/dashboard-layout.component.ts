import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { User, UserRole } from '../../shared/models/auth.models';
import { SHARED_IMPORTS } from '../../shared';
import { filter, map } from 'rxjs/operators';

interface MenuItem {
    label: string;
    icon: string;
    route: string;
    roles?: UserRole[];
    badge?: string;
    children?: MenuItem[];
}

interface BreadcrumbItem {
    label: string;
    route?: string;
    icon?: string;
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
    private readonly activatedRoute = inject(ActivatedRoute);
    readonly router = inject(Router); // Make router available in template

    readonly sidebarCollapsed = signal<boolean>(false);
    readonly currentUser = signal<User | null>(null);
    readonly userRole = signal<UserRole | null>(null);
    readonly breadcrumbs = signal<BreadcrumbItem[]>([]);
    readonly pageTitle = signal<string>('Dashboard');
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
                        { label: 'Templates', icon: 'pi pi-bookmark', route: '/documents/templates' },
                        { label: 'Audit Trail', icon: 'pi pi-history', route: '/documents/audit' }
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
                    label: 'Documents',
                    icon: 'pi pi-file',
                    route: '/documents',
                    children: [
                        { label: 'My Documents', icon: 'pi pi-list', route: '/documents' },
                        { label: 'Upload Document', icon: 'pi pi-upload', route: '/documents/upload' },
                        { label: 'Templates', icon: 'pi pi-bookmark', route: '/documents/templates' }
                    ]
                }
            );
        }

        // Individual/Verifier items
        if (role === UserRole.VERIFIER || !role) {
            baseItems.push(
                {
                    label: 'Documents',
                    icon: 'pi pi-file',
                    route: '/documents',
                    children: [
                        { label: 'My Documents', icon: 'pi pi-list', route: '/documents' },
                        { label: 'Verify Document', icon: 'pi pi-search', route: '/documents/verify' }
                    ]
                }
            );
        }

        // Auditor specific items
        if (role === UserRole.AUDITOR) {
            baseItems.push(
                {
                    label: 'Documents',
                    icon: 'pi pi-file',
                    route: '/documents',
                    children: [
                        { label: 'All Documents', icon: 'pi pi-list', route: '/documents' },
                        { label: 'Audit Trail', icon: 'pi pi-history', route: '/documents/audit' },
                        { label: 'Compliance Reports', icon: 'pi pi-chart-bar', route: '/documents/audit/compliance' }
                    ]
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

        // Set up breadcrumb navigation
        this.setupBreadcrumbs();
    }

    private setupBreadcrumbs(): void {
        this.router.events
            .pipe(
                filter(event => event instanceof NavigationEnd),
                map(() => this.buildBreadcrumbs())
            )
            .subscribe(breadcrumbs => {
                this.breadcrumbs.set(breadcrumbs);
                this.updatePageTitle(breadcrumbs);
            });

        // Initial breadcrumb setup
        const initialBreadcrumbs = this.buildBreadcrumbs();
        this.breadcrumbs.set(initialBreadcrumbs);
        this.updatePageTitle(initialBreadcrumbs);
    }

    private buildBreadcrumbs(): BreadcrumbItem[] {
        const url = this.router.url;
        const segments = url.split('/').filter(segment => segment);
        const breadcrumbs: BreadcrumbItem[] = [];

        // Always start with Dashboard
        breadcrumbs.push({ label: 'Dashboard', route: '/dashboard', icon: 'pi pi-home' });

        if (segments.length === 0 || segments[0] === 'dashboard') {
            return breadcrumbs;
        }

        // Handle different route patterns
        if (segments[0] === 'documents') {
            breadcrumbs.push({ label: 'Documents', route: '/documents', icon: 'pi pi-file' });

            if (segments.length > 1) {
                switch (segments[1]) {
                    case 'upload':
                        breadcrumbs.push({ label: 'Upload Document', icon: 'pi pi-upload' });
                        break;
                    case 'templates':
                        breadcrumbs.push({ label: 'Templates', route: '/documents/templates', icon: 'pi pi-bookmark' });
                        if (segments[2] === 'create') {
                            breadcrumbs.push({ label: 'Create Template', icon: 'pi pi-plus' });
                        } else if (segments[2] && segments[3] === 'edit') {
                            breadcrumbs.push({ label: 'Edit Template', icon: 'pi pi-pencil' });
                        } else if (segments[2] && segments[3] === 'versions') {
                            breadcrumbs.push({ label: 'Template Versions', icon: 'pi pi-history' });
                        }
                        break;
                    case 'audit':
                        breadcrumbs.push({ label: 'Audit Trail', route: '/documents/audit', icon: 'pi pi-history' });
                        if (segments[2] === 'compliance') {
                            breadcrumbs.push({ label: 'Compliance Dashboard', icon: 'pi pi-chart-bar' });
                        } else if (segments[2] === 'scheduled-reports') {
                            breadcrumbs.push({ label: 'Scheduled Reports', icon: 'pi pi-calendar' });
                        } else if (segments[2] === 'report-templates') {
                            breadcrumbs.push({ label: 'Report Templates', icon: 'pi pi-file-edit' });
                        } else if (segments[2] === 'entry') {
                            breadcrumbs.push({ label: 'Audit Entry Details', icon: 'pi pi-info-circle' });
                        }
                        break;
                    case 'verify':
                        breadcrumbs.push({ label: 'Verify Document', icon: 'pi pi-search' });
                        break;
                    case 'shared':
                        breadcrumbs.push({ label: 'Shared Document', icon: 'pi pi-share-alt' });
                        break;
                    default:
                        if (segments[1] && segments[1] !== 'verify') {
                            breadcrumbs.push({ label: 'Document Details', icon: 'pi pi-info-circle' });
                        }
                        break;
                }
            }
        } else if (segments[0] === 'organization') {
            breadcrumbs.push({ label: 'Organization', route: '/organization', icon: 'pi pi-building' });
            if (segments[1] === 'settings') {
                breadcrumbs.push({ label: 'Settings', icon: 'pi pi-cog' });
            } else if (segments[1] === 'users') {
                breadcrumbs.push({ label: 'Team Members', icon: 'pi pi-users' });
            } else if (segments[1] === 'api-keys') {
                breadcrumbs.push({ label: 'API Keys', icon: 'pi pi-key' });
            }
        } else if (segments[0] === 'admin') {
            breadcrumbs.push({ label: 'Administration', route: '/admin', icon: 'pi pi-shield' });
            if (segments[1] === 'organizations') {
                breadcrumbs.push({ label: 'Organizations', icon: 'pi pi-building' });
            } else if (segments[1] === 'users') {
                breadcrumbs.push({ label: 'Users', icon: 'pi pi-users' });
            } else if (segments[1] === 'analytics') {
                breadcrumbs.push({ label: 'Analytics', icon: 'pi pi-chart-bar' });
            } else if (segments[1] === 'security') {
                breadcrumbs.push({ label: 'Security', icon: 'pi pi-shield' });
            }
        } else if (segments[0] === 'profile') {
            breadcrumbs.push({ label: 'Profile', icon: 'pi pi-user' });
        } else if (segments[0] === 'analytics') {
            breadcrumbs.push({ label: 'Analytics', icon: 'pi pi-chart-line' });
        }

        return breadcrumbs;
    }

    private updatePageTitle(breadcrumbs: BreadcrumbItem[]): void {
        if (breadcrumbs.length > 0) {
            const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
            this.pageTitle.set(lastBreadcrumb.label);
        }
    }

    toggleSidebar(): void {
        this.sidebarCollapsed.update(collapsed => !collapsed);
    }

    navigateTo(route: string): void {
        this.router.navigate([route]);
    }

    logout(): void {
        // Clear auth data and navigate to home
        // Note: Implement proper logout in AuthService if needed
        this.router.navigate(['/']);
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
