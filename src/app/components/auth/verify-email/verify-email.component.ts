import { Component, signal, inject, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './verify-email.component.html'
})
export class VerifyEmailComponent implements OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);

  protected email = '';
  protected otp = '';
  protected errorMessage = signal<string | null>(null);
  protected successMessage = signal<string | null>(null);
  protected simulatedOtp = signal<string | null>(null);
  protected isLoading = signal<boolean>(false);
  protected resendCountdown = signal<number>(0);
  private timerInterval: ReturnType<typeof setInterval> | undefined;

  constructor() {
    // Email and the dev-only code arrive via router state from register/login.
    const state = (this.router.getCurrentNavigation()?.extras.state ?? history.state ?? {}) as {
      email?: string;
      simulatedOtp?: string;
    };
    this.email = state.email ?? '';
    if (state.simulatedOtp) this.simulatedOtp.set(state.simulatedOtp);
    this.startResendTimer();
  }

  ngOnDestroy(): void {
    clearInterval(this.timerInterval);
  }

  private startResendTimer(): void {
    clearInterval(this.timerInterval);
    this.resendCountdown.set(60);
    this.timerInterval = setInterval(() => {
      const current = this.resendCountdown();
      if (current <= 1) {
        this.resendCountdown.set(0);
        clearInterval(this.timerInterval);
      } else {
        this.resendCountdown.set(current - 1);
      }
    }, 1000);
  }

  handleVerify(): void {
    if (!this.email || !/^\d{6}$/.test(this.otp)) {
      this.errorMessage.set('Enter your email and the 6-digit code.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.verifyEmail(this.email, this.otp).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage.set(res.message || 'Verification failed.');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Verification failed.');
      }
    });
  }

  handleResend(): void {
    if (this.resendCountdown() > 0 || this.isLoading() || !this.email) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.resendVerification(this.email).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage.set(res.message || 'A new code has been sent.');
        if (res.simulatedOtp) this.simulatedOtp.set(res.simulatedOtp);
        this.startResendTimer();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to resend the code.');
      }
    });
  }
}
