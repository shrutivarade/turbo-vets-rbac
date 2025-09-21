import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    console.log('AuthGuard: Checking access to:', state.url);
    return this.authService.getCurrentUserObservable().pipe(
      take(1),
      map(user => {
        const isAuthenticated = this.authService.isAuthenticated();
        console.log('AuthGuard:', {
          user: user,
          isAuthenticated: isAuthenticated,
          canActivate: !!(user && isAuthenticated)
        });
        
        if (user && isAuthenticated) {
          return true;
        } else {
          // Don't redirect - let the app.html handle the authentication state
          // The user will see the login screen instead of the protected content
          return false;
        }
      })
    );
  }
}
