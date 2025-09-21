import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
  
  // Login form credentials
  loginCredentials: LoginRequest = {
    email: '',
    password: ''
  };

  constructor(
    private authService: AuthService,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    // Subscribe to current user changes
    this.authService.getCurrentUserObservable().subscribe((user: User | null) => {
      this.currentUser = user;
      this.isAuthenticated = !!user;
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
}
