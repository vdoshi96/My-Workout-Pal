import { describe, expect, it } from "vitest";

import {
  InMemoryRunnerStorage,
  RunnerStorageError,
  clearRunnerNamespace,
  createRunnerState,
  createWorkoutSnapshot,
  loadRunnerState,
  mergeRunnerStorageRecords,
  persistRunnerState,
  runnerReducer,
  runnerStorageKey,
  runnerStorageRecord,
  syncRunnerOperations,
  validateRunnerStorageRecord,
  type ActiveWorkoutState,
  type RunnerSnapshotInput,
  type RunnerStorageRecord,
  type RunnerStorageRecordV1,
} from "@/domain/workout-runner";
import {
  createRunnerStorageBroadcast,
  IndexedDBRunnerStorage,
  RUNNER_STORAGE_DATABASE_VERSION,
  RUNNER_STORAGE_OBJECT_STORE,
  runnerStorageNamespaceDigest,
  type RunnerBroadcastChannel,
  type RunnerIndexedDbDatabase,
  type RunnerIndexedDbFactory,
  type RunnerIndexedDbObjectStore,
  type RunnerIndexedDbOpenRequest,
  type RunnerIndexedDbRequest,
  type RunnerIndexedDbTransaction,
} from "@/client/runner-storage";

class FakeBroadcastChannel implements RunnerBroadcastChannel {
  readonly posted: unknown[] = [];
  readonly listeners = new Set<(event: MessageEvent<unknown>) => void>();
  closed = false;

  postMessage(value: unknown): void {
    this.posted.push(structuredClone(value));
  }

  addEventListener(
    type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ): void {
    if (type === "message") this.listeners.add(listener);
  }

  removeEventListener(
    type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ): void {
    if (type === "message") this.listeners.delete(listener);
  }

  close(): void {
    this.closed = true;
  }

  emit(data: unknown): void {
    for (const listener of this.listeners) {
      listener({ data } as MessageEvent<unknown>);
    }
  }
}

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
    expect(loaded).toMatchObject({
      schemaVersion: 2,
      revision: 1,
      state,
    });
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

  it("preserves a schema-one pending record through an upgrade and reopen", async () => {
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
    const record: RunnerStorageRecordV1 = {
      schemaVersion: 1,
      key: runnerStorageKey("uid-a", "session-a"),
      ownerUid: "uid-a",
      sessionId: "session-a",
      state: pending,
    };
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
    ).resolves.toMatchObject({
      schemaVersion: 2,
      revision: 1,
      state: secondState,
    });
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
    ).resolves.toMatchObject({
      schemaVersion: 2,
      revision: 1,
      state: secondState,
    });
  });

  it("clears a corrupt payload through the in-memory owner namespace", async () => {
    const records = new Map<string, RunnerStorageRecord>();
    const storage = new InMemoryRunnerStorage({ records });
    const firstState = stateFor("uid-a", "session-a");
    const secondState = stateFor("uid-b", "session-b");
    const firstKey = runnerStorageKey("uid-a", "session-a");

    await persistRunnerState(storage, firstState);
    await persistRunnerState(storage, secondState);
    const corrupt = (await storage.load(firstKey))!;
    records.set(firstKey, { ...corrupt, ownerUid: "uid-corrupt" });

    await clearRunnerNamespace(storage, "uid-a");

    await expect(storage.load(firstKey)).resolves.toBeUndefined();
    await expect(
      storage.load(runnerStorageKey("uid-b", "session-b")),
    ).resolves.toMatchObject({
      schemaVersion: 2,
      revision: 1,
      state: secondState,
    });
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

describe("schema-two atomic runner storage merge", () => {
  it("publishes only validated opaque cross-tab storage hints", () => {
    const fake = new FakeBroadcastChannel();
    const broadcast = createRunnerStorageBroadcast({
      factory: () => fake,
    });
    expect(broadcast).toBeDefined();
    const digest = runnerStorageNamespaceDigest("uid-a", "session-a");
    expect(digest).not.toContain("uid-a");
    expect(digest).not.toContain("session-a");

    const received: unknown[] = [];
    const unsubscribe = broadcast!.subscribe((notification) => {
      received.push(notification);
    });
    const notification = {
      namespaceDigest: digest,
      revision: 7,
      writerId: "runner-writer-tab-a",
    };
    broadcast!.publish(notification);
    expect(fake.posted).toEqual([notification]);

    fake.emit({ ...notification, revision: 8 });
    fake.emit({ ...notification, ownerUid: "uid-a" });
    fake.emit({ ...notification, namespaceDigest: "uid-a:session-a" });
    expect(received).toEqual([{ ...notification, revision: 8 }]);

    unsubscribe();
    fake.emit({ ...notification, revision: 9 });
    expect(received).toHaveLength(1);
    broadcast!.close();
    expect(fake.closed).toBe(true);
  });

  it("writes schema two metadata and returns the committed record", async () => {
    const storage = new InMemoryRunnerStorage({
      writerId: "tab-a",
      clock: () => 123,
    });
    const state = stateFor("uid-a", "session-a");

    const committed = await storage.save(
      runnerStorageKey("uid-a", "session-a"),
      runnerStorageRecord(state, { committedAt: 123 }),
    );

    expect(committed).toMatchObject({
      schemaVersion: 2,
      revision: 1,
      writerId: "tab-a",
      committedAt: 123,
      state,
    });
  });

  it("merges distinct stale operations exactly once and marks same-target divergence", async () => {
    const storage = new InMemoryRunnerStorage({ writerId: "tab-a" });
    const key = runnerStorageKey("uid-a", "session-a");
    let first = stateFor("uid-a", "session-a");
    first = runnerReducer(first, {
      type: "update_set_draft",
      setId: "row-set",
      draft: { kind: "weight_reps", weightKg: 20, repetitions: 8 },
    });
    first = runnerReducer(first, { type: "save_set", setId: "row-set" });
    const firstRecord = runnerStorageRecord(first, { committedAt: 100 });
    await storage.save(key, firstRecord);

    let second = stateFor("uid-a", "session-a");
    second = runnerReducer(second, {
      type: "update_set_draft",
      setId: "row-set",
      draft: { kind: "weight_reps", weightKg: 22, repetitions: 8 },
    });
    second = runnerReducer(second, { type: "save_set", setId: "row-set" });
    const secondRecord = runnerStorageRecord(second, { committedAt: 101 });
    const merged = mergeRunnerStorageRecords(firstRecord, secondRecord, {
      committedAt: 102,
      writerId: "tab-b",
    });

    expect(merged.state.operations).toHaveLength(2);
    expect(merged.state.operations.map(({ status }) => status)).toEqual([
      "failed",
      "failed",
    ]);
    expect(
      merged.state.operations.map(({ errorCode }) => errorCode),
    ).toEqual(["local_tab_conflict", "local_tab_conflict"]);
  });

  it("treats skip and completion as one exercise decision target", () => {
    let skipped = stateFor("uid-a", "session-a");
    skipped = runnerReducer(skipped, {
      type: "skip_exercise",
      exerciseId: "row",
      reason: "not today",
      now: 101,
    });
    let completed = stateFor("uid-a", "session-a");
    completed = runnerReducer(completed, {
      type: "update_set_draft",
      setId: "row-set",
      draft: { kind: "weight_reps", weightKg: 20, repetitions: 8 },
    });
    completed = runnerReducer(completed, {
      type: "save_set",
      setId: "row-set",
      now: 101,
    });
    const setKey = completed.operations[0]!.idempotencyKey;
    completed = runnerReducer(completed, {
      type: "operation_saved",
      idempotencyKey: setKey,
      now: 102,
    });
    completed = runnerReducer(completed, {
      type: "complete_exercise",
      exerciseId: "row",
      now: 103,
    });

    const merged = mergeRunnerStorageRecords(
      runnerStorageRecord(skipped, { committedAt: 101 }),
      runnerStorageRecord(completed, { committedAt: 102 }),
    );

    const decisions = merged.state.operations.filter(
      ({ kind }) => kind === "skip_exercise" || kind === "complete_exercise",
    );
    expect(decisions.map(({ status }) => status)).toEqual([
      "failed",
      "failed",
    ]);
    expect(decisions.map(({ errorCode }) => errorCode)).toEqual([
      "local_tab_conflict",
      "local_tab_conflict",
    ]);
  });

  it("treats walker and runner logs as one session cardio target", () => {
    const input = structuredClone(snapshot) as unknown as RunnerSnapshotInput;
    input.cardioOptions = [
      {
        id: "cardio-walker",
        mode: "walker",
        targetDurationSeconds: 600,
        targetDistanceMeters: 1_000,
      },
      {
        id: "cardio-runner",
        mode: "runner",
        targetDurationSeconds: 600,
        targetDistanceMeters: 1_000,
      },
    ];
    const cardioSnapshot = createWorkoutSnapshot(input);
    let walker = createRunnerState(cardioSnapshot, { now: 100 });
    walker = runnerReducer(walker, {
      type: "select_cardio",
      mode: "walker",
      now: 101,
    });
    walker = runnerReducer(walker, {
      type: "update_cardio_draft",
      draft: {
        mode: "walker",
        durationSeconds: 600,
        distanceMeters: 1_000,
        paceSecondsPerKilometer: 600,
        paceSource: "entered",
        inclinePercent: undefined,
        notes: "walker",
      },
      now: 102,
    });
    walker = runnerReducer(walker, { type: "save_cardio", now: 103 });

    let runner = createRunnerState(cardioSnapshot, { now: 100 });
    runner = runnerReducer(runner, {
      type: "select_cardio",
      mode: "runner",
      now: 101,
    });
    runner = runnerReducer(runner, {
      type: "update_cardio_draft",
      draft: {
        mode: "runner",
        durationSeconds: 600,
        distanceMeters: 1_000,
        paceSecondsPerKilometer: 600,
        paceSource: "entered",
        inclinePercent: undefined,
        notes: "runner",
      },
      now: 102,
    });
    runner = runnerReducer(runner, { type: "save_cardio", now: 104 });

    const merged = mergeRunnerStorageRecords(
      runnerStorageRecord(walker, { committedAt: 103 }),
      runnerStorageRecord(runner, { committedAt: 104 }),
    );

    expect(merged.state.operations.map(({ status }) => status)).toEqual([
      "failed",
      "failed",
    ]);
    expect(merged.state.operations.map(({ errorCode }) => errorCode)).toEqual([
      "local_tab_conflict",
      "local_tab_conflict",
    ]);
  });

  it("preserves revoked authentication state through validation and merge", async () => {
    let revoked = stateFor("uid-a", "session-a");
    revoked = runnerReducer(revoked, {
      type: "set_auth",
      auth: "revoked",
      now: 123,
    });
    const record = runnerStorageRecord(revoked, { committedAt: 123 });

    expect(validateRunnerStorageRecord(record).state).toMatchObject({
      auth: "revoked",
      sync: { status: "auth_revoked", errorCode: "session_revoked" },
    });
    const storage = new InMemoryRunnerStorage({ writerId: "tab-a" });
    const committed = await storage.save(record.key, record);

    expect(committed.state).toMatchObject({
      auth: "revoked",
      sync: { status: "auth_revoked", errorCode: "session_revoked" },
    });
  });

  it("projects the exact value chosen for a local-tab conflict", () => {
    let first = stateFor("uid-a", "session-a");
    first = runnerReducer(first, {
      type: "update_set_draft",
      setId: "row-set",
      draft: { kind: "weight_reps", weightKg: 20, repetitions: 8 },
    });
    first = runnerReducer(first, {
      type: "save_set",
      setId: "row-set",
      now: 101,
    });
    const firstKey = first.operations[0]!.idempotencyKey;

    let second = stateFor("uid-a", "session-a");
    second = runnerReducer(second, {
      type: "update_set_draft",
      setId: "row-set",
      draft: { kind: "weight_reps", weightKg: 27.5, repetitions: 6 },
    });
    second = runnerReducer(second, {
      type: "save_set",
      setId: "row-set",
      now: 102,
    });

    const conflicted = mergeRunnerStorageRecords(
      runnerStorageRecord(first, { committedAt: 101 }),
      runnerStorageRecord(second, { committedAt: 102 }),
    );
    const resolved = runnerReducer(conflicted.state, {
      type: "resolve_local_tab_conflict",
      idempotencyKey: firstKey,
    });

    expect(
      resolved.operations.find(
        ({ idempotencyKey }) => idempotencyKey === firstKey,
      )?.status,
    ).toBe("pending");
    expect(
      resolved.operations
        .filter(({ idempotencyKey }) => idempotencyKey !== firstKey)
        .every(({ status }) => status === "superseded"),
    ).toBe(true);
    expect(resolved.loggedSets["row-set"]?.measurement).toMatchObject({
      weightKg: 20,
      repetitions: 8,
    });
    expect(resolved.loggedSets["row-set"]?.operationKey).toBe(firstKey);
    expect(resolved.drafts["row-set"]).toMatchObject({
      weightKg: 20,
      repetitions: 8,
    });

    const persisted = mergeRunnerStorageRecords(
      conflicted,
      runnerStorageRecord(resolved, { committedAt: 103 }),
    );
    expect(persisted.state.loggedSets["row-set"]?.measurement).toMatchObject({
      weightKg: 20,
      repetitions: 8,
    });
  });

  it("lets confirmed authority supersede a later-timestamp stale same-target write", () => {
    let confirmed = stateFor("uid-a", "session-a");
    confirmed = runnerReducer(confirmed, {
      type: "update_set_draft",
      setId: "row-set",
      draft: { kind: "weight_reps", weightKg: 20, repetitions: 8 },
    });
    confirmed = runnerReducer(confirmed, {
      type: "save_set",
      setId: "row-set",
      now: 101,
    });
    const confirmedKey = confirmed.operations[0]!.idempotencyKey;
    confirmed = runnerReducer(confirmed, {
      type: "operation_saved",
      idempotencyKey: confirmedKey,
      now: 102,
    });

    let stale = stateFor("uid-a", "session-a");
    stale = runnerReducer(stale, {
      type: "update_set_draft",
      setId: "row-set",
      draft: { kind: "weight_reps", weightKg: 25, repetitions: 8 },
    });
    stale = runnerReducer(stale, {
      type: "save_set",
      setId: "row-set",
      now: 9_999,
    });
    const staleKey = stale.operations[0]!.idempotencyKey;

    const merged = mergeRunnerStorageRecords(
      runnerStorageRecord(confirmed, { committedAt: 102 }),
      runnerStorageRecord(stale, { committedAt: 9_999 }),
    );

    expect(
      merged.state.operations.find(({ idempotencyKey }) => idempotencyKey === confirmedKey)
        ?.status,
    ).toBe("saved");
    expect(
      merged.state.operations.find(({ idempotencyKey }) => idempotencyKey === staleKey)
        ?.status,
    ).toBe("superseded");
    expect(merged.state.loggedSets["row-set"]?.measurement).toMatchObject({
      weightKg: 20,
      repetitions: 8,
    });
  });

  it("keeps an intentional edit when its source contains the saved predecessor", () => {
    let confirmed = stateFor("uid-a", "session-a");
    confirmed = runnerReducer(confirmed, {
      type: "update_set_draft",
      setId: "row-set",
      draft: { kind: "weight_reps", weightKg: 20, repetitions: 8 },
    });
    confirmed = runnerReducer(confirmed, {
      type: "save_set",
      setId: "row-set",
      now: 101,
    });
    const confirmedKey = confirmed.operations[0]!.idempotencyKey;
    confirmed = runnerReducer(confirmed, {
      type: "operation_saved",
      idempotencyKey: confirmedKey,
      now: 102,
    });
    let later = runnerReducer(confirmed, {
      type: "update_set_draft",
      setId: "row-set",
      draft: { kind: "weight_reps", weightKg: 25, repetitions: 8 },
    });
    later = runnerReducer(later, {
      type: "save_set",
      setId: "row-set",
      now: 103,
    });
    const laterKey = later.operations.find(
      ({ idempotencyKey }) => idempotencyKey !== confirmedKey,
    )!.idempotencyKey;

    const merged = mergeRunnerStorageRecords(
      runnerStorageRecord(confirmed, { committedAt: 102 }),
      runnerStorageRecord(later, { committedAt: 103 }),
    );

    expect(
      merged.state.operations.find(({ idempotencyKey }) => idempotencyKey === confirmedKey)
        ?.status,
    ).toBe("saved");
    expect(
      merged.state.operations.find(({ idempotencyKey }) => idempotencyKey === laterKey)
        ?.status,
    ).toBe("pending");

    const reverse = mergeRunnerStorageRecords(
      runnerStorageRecord(later, { committedAt: 103 }),
      runnerStorageRecord(confirmed, { committedAt: 102 }),
    );
    expect(
      reverse.state.operations.find(({ idempotencyKey }) => idempotencyKey === confirmedKey)
        ?.status,
    ).toBe("saved");
    expect(
      reverse.state.operations.find(({ idempotencyKey }) => idempotencyKey === laterKey)
        ?.status,
    ).toBe("pending");
  });

  it("freezes a merged session after a saved terminal operation", () => {
    let completed = stateFor("uid-a", "session-a");
    completed = runnerReducer(completed, {
      type: "skip_exercise",
      exerciseId: "row",
      reason: "not today",
      now: 99,
    });
    const skipKey = completed.operations[0]!.idempotencyKey;
    completed = runnerReducer(completed, {
      type: "operation_saved",
      idempotencyKey: skipKey,
      now: 100,
    });
    completed = runnerReducer(completed, {
      type: "complete_session",
      now: 101,
    });
    const completeKey = completed.operations.at(-1)!.idempotencyKey;
    completed = runnerReducer(completed, {
      type: "operation_saved",
      idempotencyKey: completeKey,
      now: 102,
    });

    let stale = stateFor("uid-a", "session-a");
    stale = runnerReducer(stale, {
      type: "update_note",
      exerciseId: "row",
      note: "stale note",
    });
    stale = runnerReducer(stale, {
      type: "save_note",
      exerciseId: "row",
      now: 9_999,
    });
    stale = runnerReducer(stale, {
      type: "update_set_draft",
      setId: "row-set",
      draft: { kind: "weight_reps", weightKg: 30, repetitions: 10 },
    });
    stale = runnerReducer(stale, {
      type: "save_set",
      setId: "row-set",
      now: 10_000,
    });

    const merged = mergeRunnerStorageRecords(
      runnerStorageRecord(completed, { committedAt: 102 }),
      runnerStorageRecord(stale, { revision: 50, committedAt: 10_000 }),
    );

    expect(merged.state.status).toBe("completed");
    expect(
      merged.state.operations
        .filter(
          ({ idempotencyKey }) =>
            idempotencyKey !== completeKey && idempotencyKey !== skipKey,
        )
        .every(({ status }) => status === "superseded"),
    ).toBe(true);
    expect(
      merged.state.operations.find(({ idempotencyKey }) => idempotencyKey === skipKey)
        ?.status,
    ).toBe("saved");
    expect(merged.state.dirtySetIds).toEqual([]);
    expect(merged.state.dirtyNoteExerciseIds).toEqual([]);
    expect(merged.state.drafts["row-set"]).toBeUndefined();
    expect(merged.state.notesByExercise["row"]).toBeUndefined();

    const reverseCompleted = mergeRunnerStorageRecords(
      runnerStorageRecord(stale, { revision: 50, committedAt: 10_000 }),
      runnerStorageRecord(completed, { committedAt: 102 }),
    );
    expect(reverseCompleted.state.status).toBe("completed");
    expect(
      reverseCompleted.state.operations
        .filter(
          ({ idempotencyKey }) =>
            idempotencyKey !== completeKey && idempotencyKey !== skipKey,
        )
        .every(({ status }) => status === "superseded"),
    ).toBe(true);
    expect(
      reverseCompleted.state.operations.find(({ idempotencyKey }) => idempotencyKey === skipKey)
        ?.status,
    ).toBe("saved");
    expect(reverseCompleted.state.dirtySetIds).toEqual([]);
    expect(reverseCompleted.state.dirtyNoteExerciseIds).toEqual([]);
    expect(reverseCompleted.state.drafts["row-set"]).toBeUndefined();
    expect(reverseCompleted.state.notesByExercise["row"]).toBeUndefined();

    let abandoned = stateFor("uid-a", "session-a");
    abandoned = runnerReducer(abandoned, {
      type: "abandon_session",
      reason: "finished early",
      now: 100,
    });
    const abandonKey = abandoned.operations[0]!.idempotencyKey;
    abandoned = runnerReducer(abandoned, {
      type: "operation_saved",
      idempotencyKey: abandonKey,
      now: 101,
    });
    const abandonedMerge = mergeRunnerStorageRecords(
      runnerStorageRecord(abandoned, { committedAt: 101 }),
      runnerStorageRecord(stale, { revision: 50, committedAt: 10_000 }),
    );

    expect(abandonedMerge.state.status).toBe("abandoned");
    expect(
      abandonedMerge.state.operations
        .filter(({ idempotencyKey }) => idempotencyKey !== abandonKey)
        .every(({ status }) => status === "superseded"),
    ).toBe(true);

    const reverseAbandoned = mergeRunnerStorageRecords(
      runnerStorageRecord(stale, { revision: 50, committedAt: 10_000 }),
      runnerStorageRecord(abandoned, { committedAt: 101 }),
    );
    expect(reverseAbandoned.state.status).toBe("abandoned");
    expect(
      reverseAbandoned.state.operations
        .filter(({ idempotencyKey }) => idempotencyKey !== abandonKey)
        .every(({ status }) => status === "superseded"),
    ).toBe(true);
  });

  it("supersedes a stale tab note after the exercise decision is confirmed", async () => {
    let completed = stateFor("uid-a", "session-a");
    completed = runnerReducer(completed, {
      type: "update_set_draft",
      setId: "row-set",
      draft: { kind: "weight_reps", weightKg: 25, repetitions: 10 },
    });
    completed = runnerReducer(completed, {
      type: "save_set",
      setId: "row-set",
      now: 101,
    });
    const setKey = completed.operations.at(-1)!.idempotencyKey;
    completed = runnerReducer(completed, {
      type: "operation_saved",
      idempotencyKey: setKey,
      now: 102,
    });
    completed = runnerReducer(completed, {
      type: "complete_exercise",
      exerciseId: "row",
      now: 103,
    });
    const completionKey = completed.operations.at(-1)!.idempotencyKey;
    completed = runnerReducer(completed, {
      type: "operation_saved",
      idempotencyKey: completionKey,
      now: 104,
    });

    let stale = stateFor("uid-a", "session-a");
    stale = runnerReducer(stale, {
      type: "update_note",
      exerciseId: "row",
      note: "A stale tab note",
    });
    stale = runnerReducer(stale, {
      type: "save_note",
      exerciseId: "row",
      now: 200,
    });
    const noteKey = stale.operations.at(-1)!.idempotencyKey;

    const merged = mergeRunnerStorageRecords(
      runnerStorageRecord(completed, { committedAt: 104 }),
      runnerStorageRecord(stale, { committedAt: 200 }),
    );

    expect(
      merged.state.operations.find(
        ({ idempotencyKey }) => idempotencyKey === noteKey,
      ),
    ).toMatchObject({
      status: "superseded",
      errorCode: "superseded",
    });
    expect(merged.state.sync.status).toBe("idle");
    expect(merged.state.dirtyNoteExerciseIds).toEqual([]);
    expect(merged.state.notesByExercise["row"]).toBeUndefined();

    const submitted: string[] = [];
    await syncRunnerOperations(merged.state, {
      storage: new InMemoryRunnerStorage(),
      submit: async ({ idempotencyKey }) => {
        submitted.push(idempotencyKey);
        return { status: "saved", persistedId: "unexpected" };
      },
    });
    expect(submitted).toEqual([]);
  });

  it("preserves a later note created from the confirmed exercise decision", () => {
    let completed = stateFor("uid-a", "session-a");
    completed = runnerReducer(completed, {
      type: "update_set_draft",
      setId: "row-set",
      draft: { kind: "weight_reps", weightKg: 25, repetitions: 10 },
    });
    completed = runnerReducer(completed, {
      type: "save_set",
      setId: "row-set",
      now: 101,
    });
    completed = runnerReducer(completed, {
      type: "operation_saved",
      idempotencyKey: completed.operations.at(-1)!.idempotencyKey,
      now: 102,
    });
    completed = runnerReducer(completed, {
      type: "complete_exercise",
      exerciseId: "row",
      now: 103,
    });
    completed = runnerReducer(completed, {
      type: "operation_saved",
      idempotencyKey: completed.operations.at(-1)!.idempotencyKey,
      now: 104,
    });

    let laterNote = runnerReducer(completed, {
      type: "update_note",
      exerciseId: "row",
      note: "A deliberate post-completion note",
    });
    laterNote = runnerReducer(laterNote, {
      type: "save_note",
      exerciseId: "row",
      now: 200,
    });
    const noteKey = laterNote.operations.at(-1)!.idempotencyKey;

    const merged = mergeRunnerStorageRecords(
      runnerStorageRecord(completed, { committedAt: 104 }),
      runnerStorageRecord(laterNote, { committedAt: 200 }),
    );

    expect(
      merged.state.operations.find(
        ({ idempotencyKey }) => idempotencyKey === noteKey,
      ),
    ).toMatchObject({ status: "pending" });
    expect(merged.state.notesByExercise["row"]).toBe(
      "A deliberate post-completion note",
    );
    expect(merged.state.dirtyNoteExerciseIds).toEqual([]);
  });

  it("deduplicates identical canonical payloads with distinct keys", async () => {
    let first = stateFor("uid-a", "session-a");
    first = runnerReducer(first, {
      type: "update_set_draft",
      setId: "row-set",
      draft: { kind: "weight_reps", weightKg: 20, repetitions: 8 },
    });
    first = runnerReducer(first, {
      type: "save_set",
      setId: "row-set",
      now: 101,
    });

    let second = stateFor("uid-a", "session-a");
    second = runnerReducer(second, {
      type: "update_set_draft",
      setId: "row-set",
      draft: { kind: "weight_reps", weightKg: 20, repetitions: 8 },
    });
    second = runnerReducer(second, {
      type: "save_set",
      setId: "row-set",
      now: 102,
    });
    const duplicate = {
      ...second.operations[0]!,
      idempotencyKey: "legacy-equivalent-key",
    };
    second = {
      ...second,
      operations: [duplicate],
      loggedSets: {
        ...second.loggedSets,
        "row-set": {
          ...second.loggedSets["row-set"]!,
          operationKey: duplicate.idempotencyKey,
        },
      },
    };

    const merged = mergeRunnerStorageRecords(
      runnerStorageRecord(first, { committedAt: 101 }),
      runnerStorageRecord(second, { committedAt: 102 }),
    );
    expect(merged.state.operations.map(({ status }) => status)).not.toContain(
      "failed",
    );
    expect(
      merged.state.operations.filter(({ status }) => status === "pending"),
    ).toHaveLength(1);

    const submitted: string[] = [];
    const synced = await syncRunnerOperations(merged.state, {
      storage: new InMemoryRunnerStorage(),
      submit: async ({ idempotencyKey }) => {
        submitted.push(idempotencyKey);
        return { status: "saved" };
      },
    });
    expect(submitted).toHaveLength(1);
    expect(synced.operations.filter(({ status }) => status === "saved")).toHaveLength(1);
  });

  it("upgrades a genuine schema-one record on its first write", async () => {
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
      now: 101,
    });
    const key = runnerStorageKey("uid-a", "session-a");
    const v1: RunnerStorageRecordV1 = {
      schemaVersion: 1,
      key,
      ownerUid: "uid-a",
      sessionId: "session-a",
      state: pending,
    };
    oldStore.values.set(key, structuredClone(v1));

    const storage = createStorage(factory, "uid-a");
    const loaded = await storage.load(key);
    expect(loaded?.schemaVersion).toBe(1);
    const committed = await storage.save(key, loaded!);

    expect(committed).toMatchObject({
      schemaVersion: 2,
      revision: 1,
      state: {
        drafts: { "row-set": { weightKg: 30, repetitions: 10 } },
        operations: [{ status: "pending" }],
      },
    });
    expect(
      (factory.database.stores.get(RUNNER_STORAGE_OBJECT_STORE)!.values.get(key) as RunnerStorageRecord)
        .schemaVersion,
    ).toBe(2);
  });

  it("atomically merges distinct operations from two in-memory writers", async () => {
    const records = new Map<string, RunnerStorageRecord>();
    const first = new InMemoryRunnerStorage({
      ownerUid: "uid-a",
      writerId: "tab-a",
      records,
    });
    const second = new InMemoryRunnerStorage({
      ownerUid: "uid-a",
      writerId: "tab-b",
      records,
    });
    const key = runnerStorageKey("uid-a", "session-a");
    let firstState = stateFor("uid-a", "session-a");
    firstState = runnerReducer(firstState, {
      type: "update_set_draft",
      setId: "row-set",
      draft: { kind: "weight_reps", weightKg: 20, repetitions: 8 },
    });
    firstState = runnerReducer(firstState, {
      type: "save_set",
      setId: "row-set",
      now: 101,
    });
    let secondState = stateFor("uid-a", "session-a");
    secondState = runnerReducer(secondState, {
      type: "update_note",
      exerciseId: "row",
      note: "a distinct note",
    });
    secondState = runnerReducer(secondState, {
      type: "save_note",
      exerciseId: "row",
      now: 102,
    });

    await Promise.all([
      first.save(key, runnerStorageRecord(firstState, { committedAt: 101 })),
      second.save(key, runnerStorageRecord(secondState, { committedAt: 102 })),
    ]);
    const loaded = await first.load(key);

    expect(loaded?.schemaVersion).toBe(2);
    expect(
      loaded?.schemaVersion === 2 ? loaded.revision : undefined,
    ).toBe(2);
    expect(loaded?.state.operations).toHaveLength(2);
    expect(loaded?.state.operations.map(({ status }) => status)).toEqual([
      "pending",
      "pending",
    ]);
    expect(loaded?.state.operations.map(({ idempotencyKey }) => idempotencyKey)).toEqual(
      expect.arrayContaining([
        firstState.operations[0]!.idempotencyKey,
        secondState.operations[0]!.idempotencyKey,
      ]),
    );
  });

  it("atomically merges distinct operations from two IndexedDB writers", async () => {
    const factory = new FakeFactory();
    const first = new IndexedDBRunnerStorage({
      factory,
      ownerUid: "uid-a",
      writerId: "tab-a",
      clock: () => 101,
    });
    const second = new IndexedDBRunnerStorage({
      factory,
      ownerUid: "uid-a",
      writerId: "tab-b",
      clock: () => 102,
    });
    const key = runnerStorageKey("uid-a", "session-a");
    let firstState = stateFor("uid-a", "session-a");
    firstState = runnerReducer(firstState, {
      type: "update_set_draft",
      setId: "row-set",
      draft: { kind: "weight_reps", weightKg: 20, repetitions: 8 },
    });
    firstState = runnerReducer(firstState, {
      type: "save_set",
      setId: "row-set",
      now: 101,
    });
    let secondState = stateFor("uid-a", "session-a");
    secondState = runnerReducer(secondState, {
      type: "update_note",
      exerciseId: "row",
      note: "a distinct note",
    });
    secondState = runnerReducer(secondState, {
      type: "save_note",
      exerciseId: "row",
      now: 102,
    });

    await first.save(key, runnerStorageRecord(firstState, { committedAt: 101 }));
    await second.save(key, runnerStorageRecord(secondState, { committedAt: 102 }));
    const loaded = await first.load(key);

    expect(loaded?.schemaVersion).toBe(2);
    expect(
      loaded?.state.operations.map(({ idempotencyKey }) => idempotencyKey),
    ).toEqual(
      expect.arrayContaining([
        firstState.operations[0]!.idempotencyKey,
        secondState.operations[0]!.idempotencyKey,
      ]),
    );
    expect(loaded?.state.operations).toHaveLength(2);
  });

  it("keeps a confirmed IndexedDB value over a stale second writer", async () => {
    const factory = new FakeFactory();
    const first = new IndexedDBRunnerStorage({
      factory,
      ownerUid: "uid-a",
      writerId: "tab-a",
      clock: () => 102,
    });
    const second = new IndexedDBRunnerStorage({
      factory,
      ownerUid: "uid-a",
      writerId: "tab-b",
      clock: () => 9_999,
    });
    const key = runnerStorageKey("uid-a", "session-a");
    let confirmed = stateFor("uid-a", "session-a");
    confirmed = runnerReducer(confirmed, {
      type: "update_set_draft",
      setId: "row-set",
      draft: { kind: "weight_reps", weightKg: 20, repetitions: 8 },
    });
    confirmed = runnerReducer(confirmed, {
      type: "save_set",
      setId: "row-set",
      now: 101,
    });
    const confirmedKey = confirmed.operations[0]!.idempotencyKey;
    confirmed = runnerReducer(confirmed, {
      type: "operation_saved",
      idempotencyKey: confirmedKey,
      now: 102,
    });
    let stale = stateFor("uid-a", "session-a");
    stale = runnerReducer(stale, {
      type: "update_set_draft",
      setId: "row-set",
      draft: { kind: "weight_reps", weightKg: 25, repetitions: 8 },
    });
    stale = runnerReducer(stale, {
      type: "save_set",
      setId: "row-set",
      now: 9_999,
    });
    const staleKey = stale.operations[0]!.idempotencyKey;

    await first.save(key, runnerStorageRecord(confirmed, { committedAt: 102 }));
    await second.save(key, runnerStorageRecord(stale, { committedAt: 9_999 }));
    const loaded = await first.load(key);

    expect(
      loaded?.state.operations.find(({ idempotencyKey }) => idempotencyKey === confirmedKey)
        ?.status,
    ).toBe("saved");
    expect(
      loaded?.state.operations.find(({ idempotencyKey }) => idempotencyKey === staleKey)
        ?.status,
    ).toBe("superseded");
    expect(loaded?.state.loggedSets["row-set"]?.measurement).toMatchObject({
      weightKg: 20,
      repetitions: 8,
    });
  });

  it("keeps post-commit notifications opaque and advisory", async () => {
    const factory = new FakeFactory();
    const notifications: unknown[] = [];
    const storage = new IndexedDBRunnerStorage({
      factory,
      ownerUid: "uid-a",
      writerId: "tab-a",
      notify: (notification) => {
        notifications.push(notification);
        throw new Error("notification delivery is unavailable");
      },
    });
    const state = stateFor("uid-a", "session-a");
    const key = runnerStorageKey("uid-a", "session-a");

    await expect(
      storage.save(key, runnerStorageRecord(state)),
    ).resolves.toMatchObject({ schemaVersion: 2, revision: 1 });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toEqual({
      namespaceDigest: expect.stringMatching(/^mwp_sha256_/),
      revision: 1,
      writerId: "tab-a",
    });
    expect(JSON.stringify(notifications[0])).not.toContain("uid-a");
    await expect(storage.load(key)).resolves.toMatchObject({
      schemaVersion: 2,
      state,
    });
  });
});
