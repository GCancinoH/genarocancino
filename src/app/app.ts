import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private auth = inject(Auth);
  protected readonly title = signal('myapp');

  constructor() {
    console.log('App initialization - currentUser:', this.auth.currentUser);
    this.auth.onAuthStateChanged(user => {
      console.log('AuthState changed:', user?.email);
    });
  }
}
