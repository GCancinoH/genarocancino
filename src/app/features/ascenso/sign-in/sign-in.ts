import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sign-in',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.css',
})
export class SignIn {
  private auth = inject(Auth, { optional: true });
  private fb = inject(FormBuilder);
  private readonly router = inject(Router);

  signInForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  async onSubmit() {
    if (this.signInForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.signInForm.value;

    try {
      if (!this.auth) {
        throw new Error("Firebase Auth is not properly initialized. Make sure you provided it in app.config.ts.");
      }
      await signInWithEmailAndPassword(this.auth, email!, password!);
      this.router.navigate(['ascenso/dashboard']);
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Error signing in');
    } finally {
      this.isLoading.set(false);
    }
  }
}

