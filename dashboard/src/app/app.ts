import { Component, signal, OnInit, NgZone } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';
import { AuthService } from './services/auth.service';
import { LoadingService } from './services/loading.service';
import { User, LoginRequest } from './models/auth.models';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('TurboVets');
  currentUser: User | null = null;
  isAuthenticated = false;
  isLoading = false;
  errorMessage: string | null = null;
  showCredentialsModal = false;
  
  // Login form credentials
  loginCredentials: LoginRequest = {
    email: '',
    password: ''
  };

  constructor(
    private authService: AuthService,
    private loadingService: LoadingService,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    // Subscribe to current user changes
    this.authService.getCurrentUserObservable().subscribe((user: User | null) => {
      console.log('Auth state changed:', { user, wasAuthenticated: this.isAuthenticated });
      this.currentUser = user;
      const wasAuthenticated = this.isAuthenticated;
      this.isAuthenticated = !!user;
      
      // If user just became authenticated and we're not on a protected route, navigate to dashboard
      if (user && !wasAuthenticated && this.router.url === '/') {
        this.ngZone.run(() => {
          console.log('User authenticated, navigating to dashboard...');
          this.router.navigate(['/dashboard']);
        });
      }
    });

    // Subscribe to loading state
    this.loadingService.loading$.subscribe(loading => {
      this.isLoading = loading;
    });
  }

  onLoginSubmit(): void {
    if (!this.loginCredentials.email || !this.loginCredentials.password) {
      this.errorMessage = 'Please enter both email and password.';
      return;
    }

    this.errorMessage = null;
    this.loadingService.show();

    this.authService.login(this.loginCredentials).subscribe({
      next: (response: any) => {
        this.loadingService.hide();
        // Clear form after successful login
        this.loginCredentials = { email: '', password: '' };
        
        // Force navigation to dashboard after successful login
        // Using NgZone to ensure Angular change detection runs properly
        this.ngZone.run(() => {
          console.log('Login successful, navigating to dashboard...');
          this.router.navigate(['/dashboard']).then(success => {
            console.log('Navigation result:', success);
            if (!success) {
              console.warn('Navigation to dashboard failed, trying alternative route');
              // Fallback navigation
              window.location.href = '/dashboard';
            }
          }).catch(error => {
            console.error('Navigation error:', error);
            // Fallback to manual page reload to avoid stuck state
            window.location.reload();
          });
        });
      },
      error: (error: any) => {
        console.error('Login failed:', error);
        this.errorMessage = error.message || 'Login failed. Please check your credentials and try again.';
        this.loadingService.hide();
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.errorMessage = null;
  }

  clearError(): void {
    this.errorMessage = null;
  }

  showCredentialsPopup(): void {
    this.showCredentialsModal = true;
  }

  closeCredentialsPopup(): void {
    this.showCredentialsModal = false;
  }
}
