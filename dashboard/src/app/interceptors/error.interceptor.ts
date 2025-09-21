import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'An unexpected error occurred';
        
        if (error.error instanceof ErrorEvent) {
          // Client-side error
          errorMessage = `Client Error: ${error.error.message}`;
        } else {
          // Server-side error
          switch (error.status) {
            case 401:
              errorMessage = 'Unauthorized: Please log in again';
              this.handleUnauthorized();
              break;
            case 403:
              errorMessage = 'Forbidden: You do not have permission to access this resource';
              break;
            case 404:
              errorMessage = 'Not Found: The requested resource was not found';
              break;
            case 500:
              errorMessage = 'Internal Server Error: Please try again later';
              break;
            case 0:
              errorMessage = 'Network Error: Unable to connect to server';
              break;
            default:
              errorMessage = error.error?.message || `Server Error: ${error.status} ${error.statusText}`;
          }
        }

        // Log error for debugging
        console.error('HTTP Error:', {
          status: error.status,
          message: errorMessage,
          url: req.url,
          method: req.method
        });

        // Return a user-friendly error
        return throwError(() => ({
          message: errorMessage,
          status: error.status,
          originalError: error
        }));
      })
    );
  }

  /**
   * Handle unauthorized access (401 errors)
   */
  private handleUnauthorized(): void {
    // Clear any stored authentication data
    this.authService.logout();
    
    // You could also redirect to login page here
    // this.router.navigate(['/login']);
    
    // For now, we'll just log the user out
    console.warn('User session expired. Please log in again.');
  }
}
