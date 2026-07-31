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
  imports: [FormsModule, CommonModule, RouterLink, HeaderComponent],
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

    this.apiService.getReviews(userId).subscribe({
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
    if (this.rating() === 0) {
      this.errorMessage.set('Please select a star rating between 1 and 5.');
      return;
    }
    if (!this.comment.trim()) {
      this.errorMessage.set('Please share a few words about your experience before submitting.');
      return;
    }

    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.errorMessage.set('You must be logged in to submit a review.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.apiService.submitReview(this.rating(), this.comment.trim(), userId).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage.set(res.message || 'Review submitted successfully!');
        this.rating.set(0);
        this.comment = '';
        this.loadReviews();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to submit review. Let’s try that again.');
      }
    });
  }
}
