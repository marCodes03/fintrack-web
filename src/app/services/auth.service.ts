import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private baseUrl = `${inject(ApiService).apiUrl}/auth`;

  // Manage logged-in user state reactively using signal
  readonly currentUser = signal<User | null>(null);

  // JWT issued by the server at login (persisted in localStorage)
  readonly token = signal<string | null>(localStorage.getItem('fintrack_token'));

  getToken(): string | null {
    return this.token();
  }

  // Global hide amounts signal (persists in localStorage)
  readonly hideAmounts = signal<boolean>(localStorage.getItem('fintrack_hide_amounts') === 'true');

  private lastActivityKey = 'fintrack_last_activity';
  private inactivityLimit = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

  constructor() {
    // Load persisted user state from localStorage if exists
    const savedUser = localStorage.getItem('fintrack_user');
    if (savedUser && !this.token()) {
      // Legacy session without a JWT: clear state only. Pages redirect to /login themselves,
      // so we avoid navigating while the router is still initializing.
      this.clearSession();
    } else if (savedUser) {
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

      // Sliding session: while the user is active, swap the token for a fresh one.
      // Deferred so the HTTP interceptor (which injects AuthService) doesn't hit a circular dependency.
      setTimeout(() => this.refreshIfActive(), 0);
      setInterval(() => this.refreshIfActive(), this.refreshIntervalMs);
    }
  }

  private refreshIntervalMs = 30 * 60 * 1000; // 30 minutes

  private refreshIfActive(): void {
    if (!this.isAuthenticated() || !this.token()) return;
    const lastActivity = parseInt(localStorage.getItem(this.lastActivityKey) || '0', 10);
    if (Date.now() - lastActivity > this.refreshIntervalMs) return; // idle: let the token run out

    this.http.post<AuthResponse>(`${this.baseUrl}/refresh`, {}).subscribe({
      next: (res) => {
        if (res.success && res.token) {
          this.token.set(res.token);
          localStorage.setItem('fintrack_token', res.token);
        }
      },
      error: (err) => {
        // The auth interceptor skips /auth/ URLs, so handle an expired or revoked token here.
        if (err?.status === 401) this.logout();
      }
    });
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
        if (res.success && res.user && res.token) {
          this.token.set(res.token);
          localStorage.setItem('fintrack_token', res.token);
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

  private clearSession(): void {
    this.currentUser.set(null);
    this.token.set(null);
    localStorage.removeItem('fintrack_user');
    localStorage.removeItem('fintrack_token');
    localStorage.removeItem(this.lastActivityKey);
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }
}
