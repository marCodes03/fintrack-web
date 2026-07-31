import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ApiService, RefAccountType } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-account-slider',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './account-slider.component.html'
})
export class AccountSliderComponent {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  @Input() isOpen = false;
  @Input() isEditMode = false;
  @Input() editingId: string | null = null;
  @Input() accountTypes: RefAccountType[] = [];

  @Input() name = '';
  @Input() type = 'CASH';
  @Input() balance: number | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  protected readonly isLoading = signal<boolean>(false);
  protected readonly errorMessage = signal<string | null>(null);

  onSubmit(): void {
    if (!this.name.trim()) {
      this.errorMessage.set('Please give your account a name to get started!');
      return;
    }

    const userId = this.authService.currentUser()?.id || 'user-default-1';
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const payload = {
      name: this.name.trim(),
      type: this.type,
      balance: this.balance || 0,
      currency: 'PHP',
      userId
    };

    if (this.isEditMode && this.editingId) {
      this.http.put(`${this.apiService.apiUrl}/accounts/${this.editingId}`, payload).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.saved.emit();
          this.close.emit();
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.message || "Failed to save account details. Let's try that again.");
        }
      });
    } else {
      this.http.post(`${this.apiService.apiUrl}/accounts`, payload).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.saved.emit();
          this.close.emit();
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.message || "Failed to create account. Let's try that again.");
        }
      });
    }
  }

  onClose(): void {
    this.close.emit();
  }

  clearForm(): void {
    this.name = '';
    this.type = 'CASH';
    this.balance = null;
    this.errorMessage.set(null);
  }
}
