import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

/**
 * Interceptor to handle HTTP errors globally
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected error occurred';

      switch (error.status) {
        case 401:
          errorMessage = 'Unauthorized. Please login again.';
          localStorage.clear();
          router.navigate(['/auth/login']);
          break;
        case 403:
          errorMessage = 'Access forbidden. You don\'t have permission.';
          break;
        case 404:
          errorMessage = 'Resource not found.';
          break;
        case 500:
          errorMessage = 'Internal server error. Please try again later.';
          break;
        default:
          if (error.error?.message) {
            errorMessage = error.error.message;
          }
      }

      // Show error notification for non-401 errors (to avoid duplicate notifications)
      if (error.status !== 401) {
        notificationService.error(errorMessage);
      }

      return throwError(() => error);
    })
  );
};