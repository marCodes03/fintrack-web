import { Component, signal, Output, EventEmitter, inject } from '@angular/core';
import { DialogDirective } from '../../../shared/dialog.directive';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [DialogDirective, FormsModule],
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

  protected fieldErrors = signal<Record<string, string>>({});

  private showFieldErrors(errors: Record<string, string>): void {
    this.fieldErrors.set(errors);
    this.errorMessage.set('Fix the highlighted fields to continue.');
    const first = Object.keys(errors)[0];
    if (first) document.getElementById(first)?.focus();
  }

  handleResetPassword(): void {
    const errors: Record<string, string> = {};
    if (!this.currentPassword) errors['currentPassword'] = 'Enter your current password.';
    if (!this.newPassword) errors['newPassword'] = 'Choose a new password.';
    if (!this.confirmNewPassword) errors['confirmNewPassword'] = 'Re-enter the new password.';
    else if (this.newPassword && this.newPassword !== this.confirmNewPassword) errors['confirmNewPassword'] = 'Passwords do not match.';
    if (Object.keys(errors).length) {
      this.showFieldErrors(errors);
      return;
    }
    this.fieldErrors.set({});

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
