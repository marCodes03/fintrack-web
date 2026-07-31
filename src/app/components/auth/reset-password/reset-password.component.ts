import { Component, signal, Output, EventEmitter, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './reset-password.component.html'
})
export class ResetPasswordComponent {
  private authService = inject(AuthService);

  @Output() close = new EventEmitter<void>();

  protected currentPassword = '';
  protected newPassword = '';
  protected confirmNewPassword = '';
  protected errorMessage = signal<string | null>(null);
  protected successMessage = signal<string | null>(null);
  protected isLoading = signal<boolean>(false);
  protected showCurrentPassword = signal<boolean>(false);
  protected showNewPassword = signal<boolean>(false);
  protected showConfirmNewPassword = signal<boolean>(false);

  handleResetPassword(): void {
    if (!this.currentPassword || !this.newPassword || !this.confirmNewPassword) {
      this.errorMessage.set('All fields are required.');
      return;
    }

    if (this.newPassword !== this.confirmNewPassword) {
      this.errorMessage.set('New passwords do not match.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.resetPassword(this.currentPassword, this.newPassword).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          this.successMessage.set('Password reset successfully!');
          setTimeout(() => {
            this.close.emit();
          }, 1500);
        } else {
          this.errorMessage.set(res.message || 'Failed to update password.');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to update password.');
      }
    });
  }

  onCancel(): void {
    this.close.emit();
  }
}
