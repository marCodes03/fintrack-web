import { Component, signal, inject, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './forgot-password.component.html'
})
export class ForgotPasswordComponent implements OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);

  protected email = '';
  protected otp = '';
  protected newPassword = '';
  protected confirmNewPassword = '';

  protected otpInputs = ['', '', '', '', '', ''];
  protected resendCountdown = signal<number>(0);
  private timerInterval: any = null;

  protected step = signal<'request' | 'verify' | 'reset'>('request');
  protected errorMessage = signal<string | null>(null);
  protected successMessage = signal<string | null>(null);
  protected simulatedOtp = signal<string | null>(null);
  protected isLoading = signal<boolean>(false);
  protected showPassword = signal<boolean>(false);
  protected showConfirmPassword = signal<boolean>(false);

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  protected getMaskedEmail(): string {
    if (!this.email) return '';
    const parts = this.email.split('@');
    if (parts.length !== 2) return this.email;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 3) {
      return `${name}***@${domain}`;
    }
    const maskedName = name.slice(0, 3) + '*'.repeat(name.length - 3);
    return `${maskedName}@${domain}`;
  }

  startResendTimer(): void {
    this.resendCountdown.set(60);
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
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

  handleForgotPassword(): void {
    if (!this.email) {
      this.errorMessage.set('Please enter your email address.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const targetEmail = this.email;

    this.authService.forgotPassword(targetEmail).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res.success) {
          this.successMessage.set(res.message || 'OTP generated.');
          // Support both properties
          const receivedOtp = res.simulatedOtp || res.otp;
          if (receivedOtp) {
            this.simulatedOtp.set(receivedOtp);
          }
          // Move to verify step
          this.step.set('verify');
          this.startResendTimer();
          // Reset inputs
          this.otpInputs = ['', '', '', '', '', ''];
          this.otp = '';
        } else {
          this.errorMessage.set(res.message || 'Verification failed.');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Check email address spelling.');
      }
    });
  }

  handleResendOtp(): void {
    if (this.resendCountdown() > 0 || this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.forgotPassword(this.email).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res.success) {
          this.successMessage.set('A new verification code has been sent.');
          const receivedOtp = res.simulatedOtp || res.otp;
          if (receivedOtp) {
            this.simulatedOtp.set(receivedOtp);
          }
          this.startResendTimer();
        } else {
          this.errorMessage.set(res.message || 'Failed to resend OTP.');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to resend OTP.');
      }
    });
  }

  onOtpInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value;
    
    // Only allow single digit
    val = val.replace(/[^0-9]/g, '');
    if (val.length > 1) {
      val = val.charAt(val.length - 1);
    }
    input.value = val;
    this.otpInputs[index] = val;
    this.updateOtpString();

    // Auto focus next field
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
      }
    }
  }

  onOtpKeyDown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace') {
      if (!this.otpInputs[index] && index > 0) {
        this.otpInputs[index - 1] = '';
        this.updateOtpString();
        const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement;
        if (prevInput) {
          prevInput.focus();
        }
      }
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasteData = event.clipboardData?.getData('text') || '';
    const digits = pasteData.replace(/[^0-9]/g, '').slice(0, 6).split('');
    
    for (let i = 0; i < 6; i++) {
      this.otpInputs[i] = digits[i] || '';
      const input = document.getElementById(`otp-${i}`) as HTMLInputElement;
      if (input) {
        input.value = this.otpInputs[i];
      }
    }
    
    const nextFocusIndex = Math.min(digits.length, 5);
    const focusInput = document.getElementById(`otp-${nextFocusIndex}`) as HTMLInputElement;
    if (focusInput) {
      focusInput.focus();
    }
    this.updateOtpString();
  }

  updateOtpString(): void {
    this.otp = this.otpInputs.join('');
  }

  handleVerifyOtp(): void {
    if (this.otp.length !== 6) {
      this.errorMessage.set('Please enter the full 6-digit verification code.');
      return;
    }
    
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.step.set('reset');
  }

  handleResetPasswordOtp(): void {
    if (!this.otp || !this.newPassword || !this.confirmNewPassword) {
      this.errorMessage.set('All fields are required.');
      return;
    }

    if (this.newPassword !== this.confirmNewPassword) {
      this.errorMessage.set('Passwords do not match.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.resetPasswordWithOtp(this.email, this.otp, this.newPassword).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          this.successMessage.set('Password reset successfully! Redirecting to login...');
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        } else {
          this.errorMessage.set(res.message || 'Password reset failed.');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to reset password. Check OTP code.');
      }
    });
  }

  backToRequestStep(): void {
    this.step.set('request');
    this.simulatedOtp.set(null);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.otp = '';
    this.otpInputs = ['', '', '', '', '', ''];
    this.newPassword = '';
    this.confirmNewPassword = '';
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.resendCountdown.set(0);
  }

  backToVerifyStep(): void {
    this.step.set('verify');
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.newPassword = '';
    this.confirmNewPassword = '';
  }
}
