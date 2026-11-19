import { IconComponent } from '../icon/icon.component';
import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { DialogDirective } from '../../shared/dialog.directive';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-slider-menu',
  standalone: true,
  imports: [IconComponent, DialogDirective, RouterLink, RouterLinkActive],
  templateUrl: './slider-menu.component.html'
})
export class SliderMenuComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() resetPassword = new EventEmitter<void>();

  protected readonly user = this.authService.currentUser;
  protected accountOpen = signal<boolean>(false);




  onClose(): void {
    this.close.emit();
  }

  triggerResetPassword(): void {
    this.onClose();
    this.resetPassword.emit();
  }

  handleLogout(): void {
    this.onClose();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
