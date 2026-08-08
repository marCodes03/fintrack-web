import { Component, Input, Output, EventEmitter, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-slider-menu',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './slider-menu.component.html'
})
export class SliderMenuComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() resetPassword = new EventEmitter<void>();

  protected readonly user = this.authService.currentUser;
  protected isDarkMode = signal<boolean>(false);
  protected readonly hideAmounts = this.authService.hideAmounts;

  toggleHideAmounts(): void {
    this.authService.toggleHideAmounts();
  }

  ngOnInit(): void {
    this.isDarkMode.set(document.documentElement.classList.contains('dark'));
  }

  toggleTheme(): void {
    const nextDark = !this.isDarkMode();
    this.isDarkMode.set(nextDark);
    localStorage.setItem('theme', nextDark ? 'dark' : 'light');
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

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
