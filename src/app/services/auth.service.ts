import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  private baseUrl = window.location.origin.includes('localhost')
    ? 'http://localhost:3000/api/auth'
    : 'https://fintrack-api-env1.onrender.com/api/auth';

  // Manage logged-in user state reactively using signal
  readonly currentUser = signal<User | null>(null);

  constructor() {
    // Load persisted user state from localStorage if exists
    const savedUser = localStorage.getItem('fintrack_user');
    if (savedUser) {
      try {
        this.currentUser.set(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('fintrack_user');
      }
    }
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
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }
}
