import { Component, signal, inject, Output, EventEmitter } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SliderMenuComponent } from '../slider-menu/slider-menu.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [SliderMenuComponent, RouterLink],
  templateUrl: './header.component.html'
})
export class HeaderComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  @Output() resetPassword = new EventEmitter<void>();

  protected readonly user = this.authService.currentUser;
  protected readonly isSliderOpen = signal<boolean>(false);
  protected readonly hideAmounts = this.authService.hideAmounts;
  protected readonly isDarkMode = signal<boolean>(document.documentElement.classList.contains('dark'));

  toggleTheme(): void {
    const nextDark = !this.isDarkMode();
    this.isDarkMode.set(nextDark);
    localStorage.setItem('theme', nextDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', nextDark);
  }

  toggleHideAmounts(): void {
    this.authService.toggleHideAmounts();
  }

  openSlider(): void {
    this.isSliderOpen.set(true);
  }

  closeSlider(): void {
    this.isSliderOpen.set(false);
  }

  triggerResetPassword(): void {
    this.closeSlider();
    this.resetPassword.emit();
  }
}
