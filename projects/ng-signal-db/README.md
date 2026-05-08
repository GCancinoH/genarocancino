# NgSignalDB

A lightweight, zero-boilerplate IndexedDB wrapper for Angular, powered by Signals.

## Features

- **Angular Signals natively**: Treat database queries directly as signals.
- **Optimistic Updates**: Instant UI feedback before database persistence.
- **Worker & Main Thread Engine**: Offload heavy transactions to a Web Worker, with seamless main-thread fallback.
- **Plugin System**: Hook into read/write cycles (e.g., encryption, logging).
- **Zoneless Support**: Works flawlessly in modern, zoneless Angular apps.

## Quickstart

### 1. Configure the Provider

In your `app.config.ts`, provide the configuration:

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideNgSignalDB } from 'ng-signal-db';

export const appConfig: ApplicationConfig = {
  providers: [
    provideNgSignalDB({
      dbName: 'my_app_db',
      version: 1,
      stores: {
        users: { keyPath: 'id', indexes: [{ name: 'email', keyPath: 'email' }] }
      }
    })
  ]
};
```

### 2. Basic Usage

Inject the service in your component to query or mutate data:

```typescript
import { Component, inject } from '@angular/core';
import { NgSignalDBService } from 'ng-signal-db';

@Component({
  selector: 'app-users',
  template: `
    @if (usersSignal().status === 'loading') {
      <p>Loading...</p>
    } @else {
      <ul>
        @for (user of usersSignal().data; track user.id) {
          <li>{{ user.name }} <button (click)="deleteUser(user.id)">Delete</button></li>
        }
      </ul>
      <button (click)="addUser()">Add User</button>
    }
  `
})
export class UsersComponent {
  private dbService = inject(NgSignalDBService);
  
  // Queries become reactive signals automatically!
  usersSignal = this.dbService.db.users.asSignal();

  addUser() {
    // The UI updates instantly due to optimistic updates.
    this.dbService.db.users.put({ id: Date.now(), name: 'New User' });
  }

  deleteUser(id: number) {
    this.dbService.db.users.delete(id);
  }
}
```

## Advanced Features

### Plugin System

You can create plugins to manipulate data before writing or after reading. Use `provideNgSignalDBPlugin` to inject them:

```typescript
import { provideNgSignalDBPlugin, NgSignalDBPlugin } from 'ng-signal-db';

const encryptionPlugin: NgSignalDBPlugin = {
  onBeforeWrite: async (store, data) => encrypt(data),
  onAfterRead: async (store, data) => decrypt(data)
};

export const appConfig: ApplicationConfig = {
  providers: [
    // ... config
    provideNgSignalDBPlugin(encryptionPlugin)
  ]
};
```

### Transactions and Batching

To execute multiple operations atomatically, use the `.batch` or `.transaction` API directly on the service.

```typescript
await dbService.batch(['users', 'settings'], 'readwrite', [
  { type: 'put', store: 'users', value: userObj },
  { type: 'put', store: 'settings', value: settingsObj }
]);
```

### Cursor Pagination

For large datasets, use `.limit(n)` and `.offset(n)` on queries to paginate without overwhelming memory:

```typescript
const topTen = dbService.db.users.limit(10).offset(0).asSignal();
```

## Building

To build the library, run `ng build ng-signal-db`.

## Testing

Run `ng test ng-signal-db` to execute unit tests.
