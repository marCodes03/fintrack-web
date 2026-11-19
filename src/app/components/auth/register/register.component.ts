import { Component, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  protected name = '';
  protected email = '';
  protected password = '';
  protected confirmPassword = '';
  protected errorMessage = signal<string | null>(null);
  protected successMessage = signal<string | null>(null);
  protected isLoading = signal<boolean>(false);
  protected showPassword = signal<boolean>(false);
  protected showConfirmPassword = signal<boolean>(false);

  protected fieldErrors = signal<Record<string, string>>({});

  private showFieldErrors(errors: Record<string, string>): void {
    this.fieldErrors.set(errors);
    this.errorMessage.set('Fix the highlighted fields to continue.');
    const first = Object.keys(errors)[0];
    if (first) document.getElementById(first)?.focus();
  }

  handleRegister(): void {
    const errors: Record<string, string> = {};
    if (!this.name.trim()) errors['name'] = 'Enter your full name.';
    if (!this.email.trim()) errors['email'] = 'Enter your email address.';
    if (!this.password) errors['password'] = 'Choose a password.';
    if (!this.confirmPassword) errors['confirmPassword'] = 'Re-enter your password.';
    else if (this.password && this.password !== this.confirmPassword) errors['confirmPassword'] = 'Passwords do not match.';
    if (Object.keys(errors).length) {
      this.showFieldErrors(errors);
      return;
    }
    this.fieldErrors.set({});

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.register(this.name, this.email, this.password).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          this.successMessage.set('Account created! Check your email for a verification code...');
          setTimeout(() => {
            this.router.navigate(['/verify-email'], {
              state: { email: res.email ?? this.email, simulatedOtp: res.simulatedOtp }
            });
          }, 1000);
        } else {
          this.errorMessage.set(res.message || 'Registration failed.');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'An error occurred during registration.');
      }
    });
  }
}
