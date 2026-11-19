import { Component, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  protected email = '';
  protected password = '';
  protected errorMessage = signal<string | null>(null);
  protected isLoading = signal<boolean>(false);
  protected showPassword = signal<boolean>(false);

  protected fieldErrors = signal<Record<string, string>>({});

  private showFieldErrors(errors: Record<string, string>): void {
    this.fieldErrors.set(errors);
    this.errorMessage.set('Fix the highlighted fields to continue.');
    const first = Object.keys(errors)[0];
    if (first) document.getElementById(first)?.focus();
  }

  handleLogin(): void {
    const errors: Record<string, string> = {};
    if (!this.email.trim()) errors['email'] = 'Enter your email address.';
    if (!this.password) errors['password'] = 'Enter your password.';
    if (Object.keys(errors).length) {
      this.showFieldErrors(errors);
      return;
    }
    this.fieldErrors.set({});

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.email, this.password).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage.set(res.message || 'Login failed.');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.error?.code === 'EMAIL_NOT_VERIFIED') {
          this.router.navigate(['/verify-email'], { state: { email: this.email } });
          return;
        }
        this.errorMessage.set(err.error?.message || 'An error occurred during login.');
      }
    });
  }
}
