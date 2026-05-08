import { TestBed } from '@angular/core/testing';
import { NgSignalDBService } from './api/db.service';
import { provideNgSignalDB, provideNgSignalDBPlugin } from './providers';
import { NgSignalDBConfig, NgSignalDBPlugin } from './core/types';
import { signal } from '@angular/core';
import 'fake-indexeddb/auto';

import { IDB_ENGINE_FACTORY } from './engine-factory';
import { MainThreadEngine } from './core/main-thread-engine';

describe('NgSignalDB', () => {
  let service: NgSignalDBService;
  let dbName: string;
  let mockPlugin: NgSignalDBPlugin;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    dbName = 'test_db_' + Math.random().toString(36).substring(7);
    const testConfig: NgSignalDBConfig = {
      dbName,
      version: 1,
      stores: {
        users: { keyPath: 'id' },
      }
    };

    mockPlugin = {
      onBeforeWrite: vi.fn().mockImplementation((store: string, data: any) => data),
      onAfterRead: vi.fn().mockImplementation((store: string, data: any) => data)
    };

    TestBed.configureTestingModule({
      providers: [
        provideNgSignalDB(testConfig),
        provideNgSignalDBPlugin(mockPlugin),
        { provide: IDB_ENGINE_FACTORY, useValue: (config: NgSignalDBConfig) => new MainThreadEngine(config) }
      ]
    });
    service = TestBed.inject(NgSignalDBService);
    // Ensure we await initialization
    await service.initializedPromise;
  });

  afterEach(async () => {
    // Cleanup DB
    service.reactivity.destroy();
    if (service.activeEngine) {
      await service.activeEngine.close();
    }
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(dbName);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve(); // Ignore blocked for tests
    });
  });

  it('should initialize successfully', () => {
    expect(service).toBeTruthy();
    expect(service.status()).toBe('ready');
  });

  it('should write and read data correctly', async () => {
    const db = service.db;
    const testUser = { id: 1, name: 'John Doe' };
    
    await db.users.put(testUser);
    
    // Check plugin invocation
    expect(mockPlugin.onBeforeWrite).toHaveBeenCalledWith('users', testUser);
    
    const fetched = await db.users.getOne(1);
    expect(fetched).toEqual(testUser);
    expect(mockPlugin.onAfterRead).toHaveBeenCalledWith('users', testUser);
  });

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  it('should support signal-based queries', async () => {
    const db = service.db;
    const testUser = { id: 2, name: 'Jane Doe' };
    
    const userSignal = db.users.get(2);
    
    // Write data
    db.users.put(testUser).then();
    await sleep(50); // allow async put to finish and debounce to run
    
    const state = userSignal();
    expect(state.data).toEqual(testUser);
  });

  it('should apply optimistic updates instantly', async () => {
    const db = service.db;
    const testUser = { id: 3, name: 'Optimistic User' };
    
    const usersSignal = db.users.asSignal();
    
    // Trigger put, which sets optimistic state synchronously before indexeddb
    const putPromise = db.users.put(testUser);
    
    // Read optimistic state
    const state = usersSignal();
    expect(state.data.find((u: any) => u.id === 3)).toBeTruthy();
    
    await sleep(50); // complete real put
    await putPromise;
  });

  it('should expose transaction and batch APIs', async () => {
    expect(typeof service.transaction).toBe('function');
    expect(typeof service.batch).toBe('function');
    
    const result = await service.batch(['users'], 'readwrite', [
      { type: 'put', store: 'users', value: { id: 99, name: 'Batch User' } },
      { type: 'get', store: 'users', key: 99 }
    ]);
    
    expect(result[1]).toEqual({ id: 99, name: 'Batch User' });
  });
});

