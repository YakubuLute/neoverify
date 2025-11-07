import { inject } from '@angular/core';
import { Router, type CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../../shared/models/auth.models';

/**
 * Guard to protect routes based on user roles
 * Usage in routes: canActivate: [roleGuard], data: { roles: [UserRole.ADMIN, UserRole.ISSUER] }
 */
export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = route.data['roles'] as UserRole[];
  
  if (!requiredRoles || requiredRoles.length === 0) {
    // No roles specified, just check authentication
    return authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (!isAuthenticated) {
          router.navigate(['/auth/login']);
          return false;
        }
        return true;
      })
    );
  }

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      if (!user) {
        router.navigate(['/auth/login']);
        return false;
      }

      if (!requiredRoles.includes(user.role)) {
        router.navigate(['/unauthorized']);
        return false;
      }

      return true;
    })
  );
};

/**
 * Guard specifically for platform admin routes
 */
export const platformAdminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      if (!user) {
        router.navigate(['/auth/login']);
        return false;
      }

      if (user.role !== UserRole.PLATFORM_ADMIN) {
        router.navigate(['/unauthorized']);
        return false;
      }

      return true;
    })
  );
};

/**
 * Guard for organization admin routes
 */
export const orgAdminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      if (!user) {
        router.navigate(['/auth/login']);
        return false;
      }

      const allowedRoles = [UserRole.PLATFORM_ADMIN, UserRole.ORG_ADMIN];
      if (!allowedRoles.includes(user.role)) {
        router.navigate(['/unauthorized']);
        return false;
      }

      return true;
    })
  );
};