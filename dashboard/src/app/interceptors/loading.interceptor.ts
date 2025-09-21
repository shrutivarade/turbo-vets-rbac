import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  private activeRequests = 0;
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip loading indicator for certain requests
    if (this.shouldSkipLoading(req.url)) {
      return next.handle(req);
    }

    // Increment active requests
    this.activeRequests++;
    this.loadingSubject.next(true);

    return next.handle(req).pipe(
      finalize(() => {
        // Decrement active requests
        this.activeRequests--;
        
        // Only hide loading if no active requests
        if (this.activeRequests === 0) {
          this.loadingSubject.next(false);
        }
      })
    );
  }

  /**
   * Check if loading indicator should be skipped for this request
   */
  private shouldSkipLoading(url: string): boolean {
    const skipLoadingEndpoints = [
      '/api/auth/test',  // Health check
      '/api/auth/login', // Login requests (they have their own loading state)
    ];

    return skipLoadingEndpoints.some(endpoint => url.includes(endpoint));
  }

  /**
   * Get current loading state
   */
  isLoading(): boolean {
    return this.loadingSubject.value;
  }

  /**
   * Get number of active requests
   */
  getActiveRequestCount(): number {
    return this.activeRequests;
  }
}
