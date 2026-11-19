import { IconComponent } from '../icon/icon.component';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService, Review } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [IconComponent, FormsModule, CommonModule, RouterLink, HeaderComponent],
  templateUrl: './reviews.component.html'
})
export class ReviewsComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private router = inject(Router);

  protected rating = signal<number>(0);
  protected hoverRating = signal<number>(0);
  protected comment = '';
  protected reviews = signal<Review[]>([]);
  
  protected isLoading = signal<boolean>(false);
  protected successMessage = signal<string | null>(null);
  protected errorMessage = signal<string | null>(null);
  protected celebrate = signal<boolean>(false);

  protected fieldErrors = signal<Record<string, string>>({});

  private showFieldErrors(errors: Record<string, string>): void {
    this.fieldErrors.set(errors);
    this.errorMessage.set('Fix the highlighted fields to continue.');
    const first = Object.keys(errors)[0];
    if (first) document.getElementById('reviews-' + first)?.focus();
  }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadReviews();
  }

  loadReviews(): void {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    this.apiService.getReviews().subscribe({
      next: (res) => {
        if (res.success) {
          this.reviews.set(res.data);
        }
      },
      error: (err) => console.warn('Failed to load reviews:', err)
    });
  }

  setRating(r: number): void {
    this.rating.set(r);
  }

  setHover(r: number): void {
    this.hoverRating.set(r);
  }

  clearHover(): void {
    this.hoverRating.set(0);
  }

  onSubmit(): void {
    const errors: Record<string, string> = {};
    if (this.rating() === 0) errors['rating'] = 'Pick a rating from 1 to 5 stars.';
    if (!this.comment.trim()) errors['f1'] = 'Write a few words about your experience.';
    if (Object.keys(errors).length) {
      this.showFieldErrors(errors);
      return;
    }

    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.errorMessage.set('You must be logged in to submit a review.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.fieldErrors.set({});
    this.successMessage.set(null);

    this.apiService.submitReview(this.rating(), this.comment.trim()).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage.set(res.message || 'Review submitted successfully!');
        this.comment = '';
        // Let the chosen stars pop once before the form resets
        this.celebrate.set(true);
        setTimeout(() => { this.rating.set(0); this.celebrate.set(false); }, 450);
        this.loadReviews();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to submit review. Let’s try that again.');
      }
    });
  }
}
