import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';

/** Attaches the JWT to API requests and logs the user out on 401 from protected endpoints. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const apiUrl = inject(ApiService).apiUrl;

  if (!req.url.startsWith(apiUrl)) {
    return next(req);
  }

  const token = authService.getToken();
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((err: unknown) => {
      // Login/register 401s mean "bad credentials", not "expired session".
      const isAuthEndpoint = req.url.startsWith(`${apiUrl}/auth/`);
      if (err instanceof HttpErrorResponse && err.status === 401 && !isAuthEndpoint && authService.isAuthenticated()) {
        authService.logout();
      }
      return throwError(() => err);
    })
  );
};
