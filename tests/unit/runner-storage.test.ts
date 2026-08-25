import { describe, expect, it } from "vitest";

import {
  InMemoryRunnerStorage,
  RunnerStorageError,
  clearRunnerNamespace,
  createRunnerState,
  createWorkoutSnapshot,
  loadRunnerState,
  persistRunnerState,
  runnerReducer,
  runnerStorageKey,
  runnerStorageRecord,
  type ActiveWorkoutState,
  type RunnerSnapshotInput,
  type RunnerStorageRecord,
} from "@/domain/workout-runner";
import {
  IndexedDBRunnerStorage,
  RUNNER_STORAGE_DATABASE_VERSION,
  RUNNER_STORAGE_OBJECT_STORE,
  type RunnerIndexedDbDatabase,
  type RunnerIndexedDbFactory,
  type RunnerIndexedDbObjectStore,
  type RunnerIndexedDbOpenRequest,
  type RunnerIndexedDbRequest,
  type RunnerIndexedDbTransaction,
} from "@/client/runner-storage";

const snapshot = createWorkoutSnapshot({
  sessionId: "session-a",
  ownerUid: "uid-a",
  programRevisionId: "revision-a",
  dayId: "day-a",
  dayName: "Pull",
  exercises: [
    {
      id: "row",
      name: "Row",
      loggingKind: "weight_reps",
      sets: [
        {
          id: "row-set",
          position: 1,
          phase: "work",
          target: {
            kind: "weight_reps",
            minimumReps: 8,
            maximumReps: 12,
            restSeconds: 90,
          },
        },
      ],
    },
  ],
});

function stateFor(ownerUid: string, sessionId: string): ActiveWorkoutState {
  const input = structuredClone(snapshot) as unknown as RunnerSnapshotInput;
  input.ownerUid = ownerUid;
  input.sessionId = sessionId;
  return createRunnerState(createWorkoutSnapshot(input), { now: 100 });
}

type StoredValue = RunnerStorageRecord;

class FakeRequest<T> implements RunnerIndexedDbRequest<T> {
  result!: T;
  error: unknown = null;
  onsuccess: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
}

class FakeStore implements RunnerIndexedDbObjectStore {
  readonly values = new Map<string, StoredValue>();

  put(value: unknown): RunnerIndexedDbRequest<unknown> {
    const request = new FakeRequest<unknown>();
    queueMicrotask(() => {
      const record = value as StoredValue;
      this.values.set(record.key, structuredClone(record));
      request.result = record.key;
      request.onsuccess?.({ target: request });
    });
    return request;
  }

  get(key: string): RunnerIndexedDbRequest<unknown> {
    const request = new FakeRequest<unknown>();
    queueMicrotask(() => {
      request.result = structuredClone(this.values.get(key));
      request.onsuccess?.({ target: request });
    });
    return request;
  }

  delete(key: string): RunnerIndexedDbRequest<unknown> {
    const request = new FakeRequest<unknown>();
    queueMicrotask(() => {
      this.values.delete(key);
      request.result = undefined;
      request.onsuccess?.({ target: request });
    });
    return request;
  }

  getAll(): RunnerIndexedDbRequest<unknown[]> {
    const request = new FakeRequest<unknown[]>();
    queueMicrotask(() => {
      request.result = [...this.values.values()].map((value) =>
        structuredClone(value),
      );
      request.onsuccess?.({ target: request });
    });
    return request;
  }
}

class FakeTransaction implements RunnerIndexedDbTransaction {
  oncomplete: (() => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onabort: ((event: unknown) => void) | null = null;

  constructor(private readonly store: FakeStore) {
    setTimeout(() => this.oncomplete?.(), 0);
  }

  objectStore(): RunnerIndexedDbObjectStore {
    return this.store;
  }
}

class FakeDatabase implements RunnerIndexedDbDatabase {
  version = 0;
  readonly stores = new Map<string, FakeStore>();
  readonly transactions: Array<"readonly" | "readwrite"> = [];
  onversionchange: ((event: unknown) => void) | null = null;
  closed = false;
  readonly objectStoreNames = {
    contains: (name: string) => this.stores.has(name),
  };

  createObjectStore(name: string): RunnerIndexedDbObjectStore {
    const store = new FakeStore();
    this.stores.set(name, store);
    return store;
  }

  transaction(
    _storeNames: string | readonly string[],
    mode: "readonly" | "readwrite",
  ): RunnerIndexedDbTransaction {
    this.transactions.push(mode);
    const store = this.stores.get(RUNNER_STORAGE_OBJECT_STORE);
    if (!store) throw new Error("runner store missing");
    return new FakeTransaction(store);
  }

  close(): void {
    this.closed = true;
  }
}

class FakeFactory implements RunnerIndexedDbFactory {
  database = new FakeDatabase();
  opens = 0;
  openFailures = 0;
  blockedAttempts = 0;
  blockedWithLateSuccessAttempts = 0;
  upgrades: Array<{ oldVersion: number; newVersion: number }> = [];

  open(_name: string, version: number): RunnerIndexedDbOpenRequest {
    this.opens += 1;
    if (this.database.closed) {
      const previous = this.database;
      const reopened = new FakeDatabase();
      reopened.version = previous.version;
      for (const [name, previousStore] of previous.stores) {
        const store = reopened.createObjectStore(name) as FakeStore;
        for (const [key, value] of previousStore.values) {
          store.values.set(key, structuredClone(value));
        }
      }
      this.database = reopened;
    }
    if (this.openFailures > 0) {
      this.openFailures -= 1;
      throw { name: "InvalidStateError" };
    }
    const request =
      new FakeRequest<RunnerIndexedDbDatabase>() as RunnerIndexedDbOpenRequest;
    queueMicrotask(() => {
      if (this.blockedWithLateSuccessAttempts > 0) {
        this.blockedWithLateSuccessAttempts -= 1;
        request.result = this.database;
        request.onblocked?.({ target: request });
        request.onsuccess?.({ target: request });
        return;
      }
      if (this.blockedAttempts > 0) {
        this.blockedAttempts -= 1;
        request.onblocked?.({ target: request });
        return;
      }
      const oldVersion = this.database.version;
      if (oldVersion < version) {
        this.database.version = version;
        this.upgrades.push({ oldVersion, newVersion: version });
        request.result = this.database;
        request.onupgradeneeded?.({
          oldVersion,
          newVersion: version,
          target: request,
        });
      }
      request.result = this.database;
      request.onsuccess?.({ target: request });
    });
    return request;
  }
}

function createStorage(factory: RunnerIndexedDbFactory, ownerUid?: string) {
  return ownerUid === undefined
    ? new IndexedDBRunnerStorage({ factory })
    : new IndexedDBRunnerStorage({ factory, ownerUid });
}

describe("IndexedDB runner storage", () => {
  it("opens the versioned store, persists a record atomically, and reloads a clone", async () => {
    const factory = new FakeFactory();
    const storage = createStorage(factory, "uid-a");
    const state = stateFor("uid-a", "session-a");

    await persistRunnerState(storage, state);
    const loaded = await storage.load(runnerStorageKey("uid-a", "session-a"));

    expect(factory.opens).toBe(1);
    expect(factory.upgrades).toEqual([
      { oldVersion: 0, newVersion: RUNNER_STORAGE_DATABASE_VERSION },
    ]);
    expect(
      factory.database.objectStoreNames.contains(RUNNER_STORAGE_OBJECT_STORE),
    ).toBe(true);
    expect(loaded).toEqual(runnerStorageRecord(state));
    expect(loaded).not.toBe(runnerStorageRecord(state));
    expect(factory.database.transactions).toEqual(["readwrite", "readonly"]);
  });

  it("leaves malformed state for the existing restore boundary to reject", async () => {
    const factory = new FakeFactory();
    const storage = createStorage(factory, "uid-a");
    const state = stateFor("uid-a", "session-a");
    const record = runnerStorageRecord(state);

    await persistRunnerState(storage, state);
    factory.database.stores
      .get(RUNNER_STORAGE_OBJECT_STORE)!
      .values.set(record.key, {
        ...record,
        state: {
          ...record.state,
          operations: "corrupt",
        } as unknown as ActiveWorkoutState,
      });

    await expect(
      loadRunnerState(storage, {
        ownerUid: "uid-a",
        sessionId: "session-a",
        snapshot,
      }),
    ).rejects.toMatchObject({
      name: "RunnerTransitionError",
      code: "corrupt_storage",
    });
  });

  it("preserves a pending record through the v0 upgrade and a reopened connection", async () => {
    const factory = new FakeFactory();
    const oldStore = factory.database.createObjectStore(
      RUNNER_STORAGE_OBJECT_STORE,
    ) as FakeStore;
    let pending = stateFor("uid-a", "session-a");
    pending = runnerReducer(pending, {
      type: "update_set_draft",
      setId: "row-set",
      draft: { kind: "weight_reps", weightKg: 30, repetitions: 10 },
    });
    pending = runnerReducer(pending, {
      type: "save_set",
      setId: "row-set",
    });
    const record = runnerStorageRecord(pending);
    oldStore.values.set(record.key, structuredClone(record));

    const first = createStorage(factory, "uid-a");
    await expect(
      first.load(runnerStorageKey("uid-a", "session-a")),
    ).resolves.toMatchObject({
      state: { operations: [{ status: "pending" }] },
    });
    expect(factory.upgrades).toEqual([
      { oldVersion: 0, newVersion: RUNNER_STORAGE_DATABASE_VERSION },
    ]);

    factory.database.onversionchange?.({});
    expect(factory.database.closed).toBe(true);

    const reopened = createStorage(factory, "uid-a");
    await expect(
      reopened.load(runnerStorageKey("uid-a", "session-a")),
    ).resolves.toMatchObject({
      state: { operations: [{ status: "pending" }] },
    });
  });

  it("keeps owner namespaces isolated and clears only one UID", async () => {
    const factory = new FakeFactory();
    const first = createStorage(factory, "uid-a");
    const second = createStorage(factory, "uid-b");
    const firstState = stateFor("uid-a", "session-a");
    const secondState = stateFor("uid-b", "session-b");

    await persistRunnerState(first, firstState);
    await persistRunnerState(second, secondState);

    await clearRunnerNamespace(first, "uid-a");

    await expect(
      first.load(runnerStorageKey("uid-a", "session-a")),
    ).resolves.toBeUndefined();
    await expect(
      second.load(runnerStorageKey("uid-b", "session-b")),
    ).resolves.toEqual(runnerStorageRecord(secondState));
    await expect(
      second.load(runnerStorageKey("uid-a", "session-a")),
    ).rejects.toMatchObject({ name: "RunnerOwnershipError" });
  });

  it("clears a corrupt payload when its key is still in the requested owner namespace", async () => {
    const factory = new FakeFactory();
    const first = createStorage(factory, "uid-a");
    const second = createStorage(factory, "uid-b");
    const firstState = stateFor("uid-a", "session-a");
    const secondState = stateFor("uid-b", "session-b");

    await persistRunnerState(first, firstState);
    await persistRunnerState(second, secondState);
    const firstKey = runnerStorageKey("uid-a", "session-a");
    const firstStore = factory.database.stores.get(
      RUNNER_STORAGE_OBJECT_STORE,
    )!;
    const corrupt = firstStore.values.get(firstKey)!;
    firstStore.values.set(firstKey, { ...corrupt, ownerUid: "uid-corrupt" });

    await clearRunnerNamespace(first, "uid-a");

    await expect(first.load(firstKey)).resolves.toBeUndefined();
    await expect(
      second.load(runnerStorageKey("uid-b", "session-b")),
    ).resolves.toEqual(runnerStorageRecord(secondState));
  });

  it("clears a corrupt payload through the in-memory owner namespace", async () => {
    const storage = new InMemoryRunnerStorage();
    const firstState = stateFor("uid-a", "session-a");
    const secondState = stateFor("uid-b", "session-b");
    const firstKey = runnerStorageKey("uid-a", "session-a");

    await persistRunnerState(storage, firstState);
    await persistRunnerState(storage, secondState);
    const corrupt = (await storage.load(firstKey))!;
    await storage.save(firstKey, { ...corrupt, ownerUid: "uid-corrupt" });

    await clearRunnerNamespace(storage, "uid-a");

    await expect(storage.load(firstKey)).resolves.toBeUndefined();
    await expect(
      storage.load(runnerStorageKey("uid-b", "session-b")),
    ).resolves.toEqual(runnerStorageRecord(secondState));
  });

  it("rejects a key outside the configured owner namespace", async () => {
    const factory = new FakeFactory();
    const storage = createStorage(factory, "uid-a");

    await expect(
      storage.load(runnerStorageKey("uid-b", "session-b")),
    ).rejects.toMatchObject({ name: "RunnerOwnershipError" });
    await expect(clearRunnerNamespace(storage, "uid-b")).rejects.toMatchObject({
      name: "RunnerOwnershipError",
    });
  });

  it("maps an unavailable IndexedDB factory to a UI-safe error", async () => {
    const storage = createStorage(
      undefined as unknown as RunnerIndexedDbFactory,
    );

    await expect(
      storage.load(runnerStorageKey("uid-a", "session-a")),
    ).rejects.toMatchObject({
      name: "RunnerStorageError",
      code: "storage_unsupported",
      retryable: false,
    } satisfies Partial<RunnerStorageError>);
  });

  it("classifies schema failures without exposing browser error text", async () => {
    const storage = createStorage({
      open: () => {
        throw { name: "VersionError", message: "private browser detail" };
      },
    });

    await expect(
      storage.load(runnerStorageKey("uid-a", "session-a")),
    ).rejects.toMatchObject({
      code: "storage_schema_mismatch",
      retryable: false,
      message:
        "Workout draft storage needs an app update before it can be used.",
    });
  });

  it("resets a failed open so a later storage attempt can retry", async () => {
    const factory = new FakeFactory();
    factory.openFailures = 1;
    const storage = createStorage(factory, "uid-a");

    await expect(
      storage.load(runnerStorageKey("uid-a", "session-a")),
    ).rejects.toMatchObject({ code: "storage_open_failed", retryable: true });
    await expect(
      storage.load(runnerStorageKey("uid-a", "session-a")),
    ).resolves.toBeUndefined();
    expect(factory.opens).toBe(2);
  });

  it("resets a blocked open so a later storage attempt can retry", async () => {
    const factory = new FakeFactory();
    factory.blockedAttempts = 1;
    const storage = createStorage(factory, "uid-a");

    await expect(
      storage.load(runnerStorageKey("uid-a", "session-a")),
    ).rejects.toMatchObject({ code: "storage_blocked", retryable: true });
    await expect(
      storage.load(runnerStorageKey("uid-a", "session-a")),
    ).resolves.toBeUndefined();
    expect(factory.opens).toBe(2);
  });

  it("closes a late-success database after a blocked open and retries cleanly", async () => {
    const factory = new FakeFactory();
    factory.blockedWithLateSuccessAttempts = 1;
    const storage = createStorage(factory, "uid-a");
    const leakedDatabase = factory.database;

    await expect(
      storage.load(runnerStorageKey("uid-a", "session-a")),
    ).rejects.toMatchObject({ code: "storage_blocked" });
    expect(leakedDatabase.closed).toBe(true);
    await expect(
      storage.load(runnerStorageKey("uid-a", "session-a")),
    ).resolves.toBeUndefined();
    expect(factory.database).not.toBe(leakedDatabase);
    expect(factory.database.closed).toBe(false);
    expect(factory.opens).toBe(2);
  });
});
