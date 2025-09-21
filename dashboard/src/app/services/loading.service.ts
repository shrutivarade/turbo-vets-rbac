import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor() {}

  /**
   * Show loading indicator
   */
  show(): void {
    this.loadingSubject.next(true);
  }

  /**
   * Hide loading indicator
   */
  hide(): void {
    this.loadingSubject.next(false);
  }

  /**
   * Get current loading state
   */
  isLoading(): boolean {
    return this.loadingSubject.value;
  }

  /**
   * Toggle loading state
   */
  toggle(): void {
    this.loadingSubject.next(!this.loadingSubject.value);
  }
}
