import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgSignalDBService } from 'ng-signal-db';

@Component({
  selector: 'app-db-demo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 20px;">
      <h2>NgSignalDB Demo</h2>
      <button (click)="addUser()">Add User</button>
      
      <div *ngIf="usersState() as state">
        <p>Status: {{ state.status }}</p>
        <ul>
          <li *ngFor="let user of state.data">
            {{ user.name }} ({{ user.id }})
          </li>
        </ul>
      </div>
    </div>
  `
})
export class DbDemoComponent {
  private dbService = inject(NgSignalDBService);
  
  // Fluent access: dbService.db.users
  usersState = this.dbService.db.users.asSignal();

  addUser() {
    const id = Math.random().toString(36).substring(7);
    this.dbService.db.users.add({ id, name: `User ${id}` });
  }
}
