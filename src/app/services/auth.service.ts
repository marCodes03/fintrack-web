import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private baseUrl = window.location.origin.includes('localhost')
    ? 'http://localhost:3000/api/auth'
    : 'https://fintrack-api-env1.onrender.com/api/auth';

  // Manage logged-in user state reactively using signal
  readonly currentUser = signal<User | null>(null);

  // Global hide amounts signal (persists in localStorage)
  readonly hideAmounts = signal<boolean>(localStorage.getItem('fintrack_hide_amounts') === 'true');

  private lastActivityKey = 'fintrack_last_activity';
  private inactivityLimit = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

  constructor() {
    // Load persisted user state from localStorage if exists
    const savedUser = localStorage.getItem('fintrack_user');
    if (savedUser) {
      try {
        const lastActivity = localStorage.getItem(this.lastActivityKey);
        const now = Date.now();
        if (lastActivity && (now - parseInt(lastActivity, 10) > this.inactivityLimit)) {
          // Log out immediately if inactive for > 6 hours
          this.logout();
        } else {
          this.currentUser.set(JSON.parse(savedUser));
          this.updateActivity();
        }
      } catch {
        this.logout();
      }
    }

    // Set up window listeners to track activity throttled to 1 second
    if (typeof window !== 'undefined') {
      const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
      let throttleTimer: any = null;
      events.forEach(eventName => {
        window.addEventListener(eventName, () => {
          if (!throttleTimer) {
            throttleTimer = setTimeout(() => {
              this.updateActivity();
              throttleTimer = null;
            }, 1000);
          }
        }, { passive: true });
      });

      // Periodically check inactivity every 10 seconds
      setInterval(() => {
        if (this.isAuthenticated()) {
          const lastActivity = localStorage.getItem(this.lastActivityKey);
          const now = Date.now();
          if (lastActivity && (now - parseInt(lastActivity, 10) > this.inactivityLimit)) {
            this.logout();
          }
        }
      }, 10000);
    }
  }

  updateActivity(): void {
    if (this.isAuthenticated()) {
      localStorage.setItem(this.lastActivityKey, Date.now().toString());
    }
  }

  toggleHideAmounts(): void {
    const nextVal = !this.hideAmounts();
    this.hideAmounts.set(nextVal);
    localStorage.setItem('fintrack_hide_amounts', nextVal ? 'true' : 'false');
  }

  register(name: string, email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, { name, email, password });
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, { email, password }).pipe(
      tap((res) => {
        if (res.success && res.user) {
          this.currentUser.set(res.user);
          localStorage.setItem('fintrack_user', JSON.stringify(res.user));
          this.updateActivity();
        }
      })
    );
  }

  forgotPassword(email: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/forgot-password`, { email });
  }

  resetPassword(currentPassword: string, newPassword: string): Observable<AuthResponse> {
    const user = this.currentUser();
    const email = user ? user.email : '';
    return this.http.post<AuthResponse>(`${this.baseUrl}/reset-password`, {
      email,
      currentPassword,
      newPassword
    });
  }

  resetPasswordWithOtp(email: string, otp: string, newPassword: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/reset-password-otp`, {
      email,
      otp,
      newPassword
    });
  }

  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem('fintrack_user');
    localStorage.removeItem(this.lastActivityKey);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }
}
