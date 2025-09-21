import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    const requiredRoles = route.data['roles'] as string[];
    const requireAll = route.data['requireAll'] as boolean || false;

    return this.authService.getCurrentUserObservable().pipe(
      take(1),
      map(user => {
        if (!user || !this.authService.isAuthenticated()) {
          this.router.navigate(['/login'], { 
            queryParams: { returnUrl: state.url } 
          });
          return false;
        }

        const hasRequiredRole = this.checkUserRoles(user.role, requiredRoles, requireAll);
        
        if (!hasRequiredRole) {
          this.router.navigate(['/unauthorized']);
          return false;
        }

        return true;
      })
    );
  }

  /**
   * Check if user has required roles
   */
  private checkUserRoles(userRole: string, requiredRoles: string[], requireAll: boolean): boolean {
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    if (requireAll) {
      return requiredRoles.every(role => userRole === role);
    } else {
      return requiredRoles.includes(userRole);
    }
  }
}
