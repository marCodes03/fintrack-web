import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-confirm-delete-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './confirm-delete-modal.component.html'
})
export class ConfirmDeleteModalComponent {
  @Input() isOpen = false;
  @Input() itemName = '';
  @Input() title = 'Confirm Delete';
  @Input() description = 'Please type "delete" to confirm this action.';

  @Output() confirm = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  protected confirmationInput = '';

  onClose(): void {
    this.confirmationInput = '';
    this.close.emit();
  }

  onConfirm(): void {
    if (this.confirmationInput.trim().toLowerCase() === 'delete') {
      this.confirm.emit();
      this.onClose();
    }
  }

  isConfirmDisabled(): boolean {
    return this.confirmationInput.trim().toLowerCase() !== 'delete';
  }
}
