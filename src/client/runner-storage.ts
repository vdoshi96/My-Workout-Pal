import {
  classifyRunnerStorageError,
  createRunnerWriterIdentity,
  mergeRunnerStorageRecords,
  RunnerOwnershipError,
  RunnerStorageError,
  RunnerTransitionError,
  runnerStorageKey,
  stableIdempotencyKey,
  validateRunnerStorageRecord,
  type RunnerStorage,
  type RunnerStorageOperation,
  type RunnerStorageRecord,
  type RunnerStorageRecordV2,
} from "@/domain/workout-runner";

export const RUNNER_STORAGE_DATABASE_NAME = "my-workout-pal-runner";
export const RUNNER_STORAGE_DATABASE_VERSION = 2;
export const RUNNER_STORAGE_OBJECT_STORE = "runnerStates";

export type RunnerIndexedDbRequest<T> = {
  result: T;
  error: unknown;
  onsuccess: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
};

export type RunnerIndexedDbUpgradeEvent = {
  oldVersion: number;
  newVersion: number | null;
  target: RunnerIndexedDbOpenRequest;
};

export type RunnerIndexedDbOpenRequest =
  RunnerIndexedDbRequest<RunnerIndexedDbDatabase> & {
    onupgradeneeded: ((event: RunnerIndexedDbUpgradeEvent) => void) | null;
    onblocked: ((event: unknown) => void) | null;
  };

export type RunnerIndexedDbObjectStore = {
  put(value: unknown): RunnerIndexedDbRequest<unknown>;
  get(key: string): RunnerIndexedDbRequest<unknown>;
  delete(key: string): RunnerIndexedDbRequest<unknown>;
  getAll(): RunnerIndexedDbRequest<unknown[]>;
};

export type RunnerIndexedDbTransaction = {
  objectStore(name: string): RunnerIndexedDbObjectStore;
  oncomplete: (() => void) | null;
  onerror: ((event: unknown) => void) | null;
  onabort: ((event: unknown) => void) | null;
  error?: unknown;
  abort?: () => void;
};

export type RunnerIndexedDbDatabase = {
  objectStoreNames: { contains(name: string): boolean };
  createObjectStore(
    name: string,
    options?: Readonly<{ keyPath?: string }>,
  ): RunnerIndexedDbObjectStore;
  transaction(
    storeNames: string | readonly string[],
    mode: "readonly" | "readwrite",
  ): RunnerIndexedDbTransaction;
  onversionchange?: ((event: unknown) => void) | null;
  close?: () => void;
};

export type RunnerIndexedDbFactory = {
  open(name: string, version: number): RunnerIndexedDbOpenRequest;
};

export type IndexedDBRunnerStorageOptions = Readonly<{
  factory?: RunnerIndexedDbFactory;
  ownerUid?: string;
  databaseName?: string;
  writerId?: string;
  clock?: () => number;
  /** A bounded, opaque post-commit hint. It is never used for correctness. */
  notify?: (notification: RunnerStorageNotification) => void;
}>;

export type RunnerStorageNotification = Readonly<{
  namespaceDigest: string;
  revision: number;
  writerId: string;
}>;

export const RUNNER_STORAGE_BROADCAST_CHANNEL =
  "my-workout-pal-runner-storage-v2";

export interface RunnerBroadcastChannel {
  postMessage(value: unknown): void;
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ): void;
  removeEventListener(
    type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ): void;
  close(): void;
}

export type RunnerStorageBroadcast = Readonly<{
  publish(notification: RunnerStorageNotification): void;
  subscribe(
    listener: (notification: RunnerStorageNotification) => void,
  ): () => void;
  close(): void;
}>;

const RUNNER_NAMESPACE_DIGEST = /^mwp_sha256_[a-f0-9]{64}$/;

export function runnerStorageNamespaceDigest(
  ownerUid: string,
  sessionId: string,
): string {
  assertOwnerUid(ownerUid);
  assertOwnerUid(sessionId);
  return stableIdempotencyKey({ ownerUid, sessionId });
}

function parseRunnerStorageNotification(
  value: unknown,
): RunnerStorageNotification | undefined {
  if (!isObjectRecord(value)) return undefined;
  const keys = Object.keys(value).sort();
  if (
    keys.length !== 3 ||
    keys[0] !== "namespaceDigest" ||
    keys[1] !== "revision" ||
    keys[2] !== "writerId"
  ) {
    return undefined;
  }
  const namespaceDigest = value["namespaceDigest"];
  const revision = value["revision"];
  const writerId = value["writerId"];
  if (
    typeof namespaceDigest !== "string" ||
    !RUNNER_NAMESPACE_DIGEST.test(namespaceDigest) ||
    typeof revision !== "number" ||
    !Number.isInteger(revision) ||
    revision <= 0 ||
    typeof writerId !== "string" ||
    writerId.trim().length === 0
  ) {
    return undefined;
  }
  return { namespaceDigest, revision, writerId };
}

function defaultRunnerBroadcastFactory(
  name: string,
): RunnerBroadcastChannel | undefined {
  if (typeof globalThis.BroadcastChannel !== "function") return undefined;
  return new globalThis.BroadcastChannel(name);
}

export function createRunnerStorageBroadcast(
  options: Readonly<{
    factory?: (name: string) => RunnerBroadcastChannel | undefined;
  }> = {},
): RunnerStorageBroadcast | undefined {
  let channel: RunnerBroadcastChannel | undefined;
  try {
    channel = (options.factory ?? defaultRunnerBroadcastFactory)(
      RUNNER_STORAGE_BROADCAST_CHANNEL,
    );
  } catch {
    return undefined;
  }
  if (channel === undefined) return undefined;
  const listeners = new Set<
    (notification: RunnerStorageNotification) => void
  >();
  const handleMessage = (event: MessageEvent<unknown>): void => {
    const notification = parseRunnerStorageNotification(event.data);
    if (notification === undefined) return;
    for (const listener of listeners) listener(notification);
  };
  channel.addEventListener("message", handleMessage);
  return {
    publish(notification) {
      const parsed = parseRunnerStorageNotification(notification);
      if (parsed === undefined) {
        throw new RangeError("Runner storage notification is invalid.");
      }
      channel.postMessage(parsed);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close() {
      listeners.clear();
      channel.removeEventListener("message", handleMessage);
      channel.close();
    },
  };
}

function assertOwnerUid(ownerUid: string): void {
  if (typeof ownerUid !== "string" || ownerUid.trim().length === 0) {
    throw new RangeError("ownerUid must be a non-empty string");
  }
}

function defaultRunnerIndexedDbFactory(): RunnerIndexedDbFactory | undefined {
  if (typeof globalThis === "undefined") return undefined;
  const candidate = (
    globalThis as typeof globalThis & {
      indexedDB?: unknown;
    }
  ).indexedDB;
  if (
    typeof candidate !== "object" ||
    candidate === null ||
    !("open" in candidate) ||
    typeof (candidate as { open?: unknown }).open !== "function"
  ) {
    return undefined;
  }
  return candidate as RunnerIndexedDbFactory;
}

type RunnerStorageKeyParts = Readonly<{
  ownerUid: string;
  sessionId: string;
}>;

function parseRunnerStorageKey(key: string): RunnerStorageKeyParts | undefined {
  if (typeof key !== "string" || !key.startsWith("runner:")) return undefined;
  const encoded = key.slice("runner:".length);
  const separator = encoded.indexOf(":");
  if (separator <= 0 || separator === encoded.length - 1) return undefined;
  try {
    const ownerUid = decodeURIComponent(encoded.slice(0, separator));
    const sessionId = decodeURIComponent(encoded.slice(separator + 1));
    if (
      !ownerUid ||
      !sessionId ||
      runnerStorageKey(ownerUid, sessionId) !== key
    )
      return undefined;
    return { ownerUid, sessionId };
  } catch {
    return undefined;
  }
}

function assertStorageKeyOwner(
  key: string,
  ownerUid: string | undefined,
): RunnerStorageKeyParts {
  const parsed = parseRunnerStorageKey(key);
  if (!parsed) {
    throw new RunnerStorageError(
      "storage_corrupt",
      "The workout draft key is not valid.",
    );
  }
  if (ownerUid !== undefined && parsed.ownerUid !== ownerUid) {
    throw new RunnerOwnershipError();
  }
  return parsed;
}

function cloneStorageRecord(record: RunnerStorageRecord): RunnerStorageRecord {
  return structuredClone(record);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requestError(request: RunnerIndexedDbRequest<unknown>): unknown {
  return request.error ?? new Error("IndexedDB request failed");
}

function runRunnerIndexedDbTransaction<T>(
  database: RunnerIndexedDbDatabase,
  mode: "readonly" | "readwrite",
  operation: RunnerStorageOperation,
  body: Readonly<{
    run(
      store: RunnerIndexedDbObjectStore,
      finish: (value: T) => void,
      fail: (error: unknown) => void,
    ): void;
  }>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let transaction: RunnerIndexedDbTransaction;
    let finished = false;
    let result: T | undefined;
    let settled = false;

    const fail = (error: unknown): void => {
      if (settled) return;
      settled = true;
      reject(
        error instanceof RunnerTransitionError ||
          error instanceof RunnerOwnershipError
          ? error
          : classifyRunnerStorageError(error, operation),
      );
    };
    const finish = (value: T): void => {
      if (finished || settled) return;
      finished = true;
      result = value;
    };

    try {
      transaction = database.transaction([RUNNER_STORAGE_OBJECT_STORE], mode);
      transaction.oncomplete = () => {
        if (settled) return;
        if (!finished) {
          fail(new Error("IndexedDB transaction completed without a result"));
          return;
        }
        settled = true;
        resolve(result as T);
      };
      transaction.onerror = () =>
        fail(transaction.error ?? new Error("IndexedDB transaction failed"));
      transaction.onabort = () =>
        fail(transaction.error ?? new Error("IndexedDB transaction aborted"));
      body.run(
        transaction.objectStore(RUNNER_STORAGE_OBJECT_STORE),
        finish,
        fail,
      );
    } catch (error) {
      fail(error);
    }
  });
}

function watchRunnerIndexedDbRequest<T>(
  request: RunnerIndexedDbRequest<T>,
  onSuccess: (value: T) => void,
  onFailure: (error: unknown) => void,
): void {
  request.onsuccess = () => {
    try {
      onSuccess(request.result);
    } catch (error) {
      onFailure(error);
    }
  };
  request.onerror = () => onFailure(requestError(request));
}

export class IndexedDBRunnerStorage implements RunnerStorage {
  private readonly factory: RunnerIndexedDbFactory | undefined;
  private readonly ownerUid: string | undefined;
  private readonly databaseName: string;
  private readonly writerId: string;
  private readonly clock: () => number;
  private readonly notify: ((notification: RunnerStorageNotification) => void) | undefined;
  private databasePromise: Promise<RunnerIndexedDbDatabase> | undefined;
  private databaseToken: symbol | undefined;

  constructor(options: IndexedDBRunnerStorageOptions = {}) {
    if (options.ownerUid !== undefined) assertOwnerUid(options.ownerUid);
    if (options.writerId !== undefined) assertOwnerUid(options.writerId);
    this.factory = options.factory ?? defaultRunnerIndexedDbFactory();
    this.ownerUid = options.ownerUid;
    this.databaseName = options.databaseName ?? RUNNER_STORAGE_DATABASE_NAME;
    this.writerId = options.writerId ?? createRunnerWriterIdentity();
    this.clock = options.clock ?? (() => Date.now());
    this.notify = options.notify;
  }

  private openDatabase(): Promise<RunnerIndexedDbDatabase> {
    if (this.databasePromise !== undefined) return this.databasePromise;
    if (this.factory === undefined) {
      return Promise.reject(new RunnerStorageError("storage_unsupported"));
    }

    const token = Symbol("runner-storage-database");
    this.databaseToken = token;
    const opening = new Promise<RunnerIndexedDbDatabase>((resolve, reject) => {
      let request: RunnerIndexedDbOpenRequest;
      let settled = false;
      const fail = (error: unknown): void => {
        if (settled) return;
        settled = true;
        reject(classifyRunnerStorageError(error, "open"));
      };
      try {
        request = this.factory!.open(
          this.databaseName,
          RUNNER_STORAGE_DATABASE_VERSION,
        );
        request.onupgradeneeded = (event) => {
          try {
            const database = event.target.result;
            if (
              !database.objectStoreNames.contains(RUNNER_STORAGE_OBJECT_STORE)
            ) {
              database.createObjectStore(RUNNER_STORAGE_OBJECT_STORE, {
                keyPath: "key",
              });
            }
          } catch (error) {
            fail(error);
          }
        };
        request.onblocked = () =>
          fail(new RunnerStorageError("storage_blocked"));
        request.onerror = () => fail(requestError(request));
        request.onsuccess = () => {
          const database = request.result;
          if (settled) {
            database?.close?.();
            return;
          }
          if (!database) {
            fail(new Error("IndexedDB open returned no database"));
            return;
          }
          database.onversionchange = () => {
            database.close?.();
            if (this.databaseToken === token) {
              this.databasePromise = undefined;
              this.databaseToken = undefined;
            }
          };
          settled = true;
          resolve(database);
        };
      } catch (error) {
        fail(error);
      }
    });
    this.databasePromise = opening.catch((error: unknown) => {
      if (this.databaseToken === token) {
        this.databasePromise = undefined;
        this.databaseToken = undefined;
      }
      throw error;
    });
    return this.databasePromise;
  }

  async load(key: string): Promise<RunnerStorageRecord | undefined> {
    const expected = assertStorageKeyOwner(key, this.ownerUid);
    const database = await this.openDatabase();
    return runRunnerIndexedDbTransaction<RunnerStorageRecord | undefined>(
      database,
      "readonly",
      "read",
      {
        run: (store, finish, fail) => {
          const request = store.get(key);
          watchRunnerIndexedDbRequest(
            request,
            (value) => {
              if (value === undefined) {
                finish(undefined);
                return;
              }
              finish(
                cloneStorageRecord(
                  validateRunnerStorageRecord(value, {
                    expectedKey: key,
                    ownerUid: expected.ownerUid,
                    sessionId: expected.sessionId,
                  }),
                ),
              );
            },
            fail,
          );
        },
      },
    );
  }

  async save(
    key: string,
    record: RunnerStorageRecord,
  ): Promise<RunnerStorageRecordV2> {
    const expected = assertStorageKeyOwner(key, this.ownerUid);
    const incoming = validateRunnerStorageRecord(record, {
      expectedKey: key,
      ownerUid: expected.ownerUid,
      sessionId: expected.sessionId,
    });
    const database = await this.openDatabase();
    const committed = await runRunnerIndexedDbTransaction<RunnerStorageRecordV2>(
      database,
      "readwrite",
      "write",
      {
        run: (store, finish, fail) => {
          const readRequest = store.get(key);
          watchRunnerIndexedDbRequest(
            readRequest,
            (value) => {
              try {
                const existing =
                  value === undefined
                    ? undefined
                    : validateRunnerStorageRecord(value, {
                        expectedKey: key,
                        ownerUid: expected.ownerUid,
                        sessionId: expected.sessionId,
                      });
                const next = mergeRunnerStorageRecords(existing, incoming, {
                  revision: (existing?.schemaVersion === 2
                    ? existing.revision
                    : 0) + 1,
                  writerId: this.writerId,
                  committedAt: this.clock(),
                });
                const writeRequest = store.put(cloneStorageRecord(next));
                watchRunnerIndexedDbRequest(
                  writeRequest,
                  () => finish(next),
                  fail,
                );
              } catch (error) {
                fail(error);
              }
            },
            fail,
          );
        },
      },
    );
    try {
      this.notify?.({
        namespaceDigest: runnerStorageNamespaceDigest(
          expected.ownerUid,
          expected.sessionId,
        ),
        revision: committed.revision,
        writerId: committed.writerId,
      });
    } catch {
      // Notifications are advisory; a delivery failure cannot undo a commit.
    }
    return cloneStorageRecord(committed) as RunnerStorageRecordV2;
  }

  async remove(key: string): Promise<void> {
    assertStorageKeyOwner(key, this.ownerUid);
    const database = await this.openDatabase();
    await runRunnerIndexedDbTransaction<void>(database, "readwrite", "remove", {
      run: (store, finish, fail) => {
        const request = store.delete(key);
        watchRunnerIndexedDbRequest(request, () => finish(undefined), fail);
      },
    });
  }

  async clearOwner(ownerUid: string): Promise<void> {
    assertOwnerUid(ownerUid);
    if (this.ownerUid !== undefined && this.ownerUid !== ownerUid) {
      throw new RunnerOwnershipError();
    }
    const database = await this.openDatabase();
    await runRunnerIndexedDbTransaction<void>(database, "readwrite", "clear", {
      run: (store, finish, fail) => {
        const request = store.getAll();
        watchRunnerIndexedDbRequest(
          request,
          (values) => {
            for (const value of values) {
              if (!isObjectRecord(value)) continue;
              const candidate = value as Record<string, unknown>;
              const key = candidate["key"];
              if (
                typeof key !== "string" ||
                parseRunnerStorageKey(key)?.ownerUid !== ownerUid
              ) {
                continue;
              }
              const deleteRequest = store.delete(key);
              watchRunnerIndexedDbRequest(deleteRequest, () => undefined, fail);
            }
            finish(undefined);
          },
          fail,
        );
      },
    });
  }
}

export const IndexedDbRunnerStorage = IndexedDBRunnerStorage;

export function createIndexedDBRunnerStorage(
  options: IndexedDBRunnerStorageOptions = {},
): IndexedDBRunnerStorage {
  return new IndexedDBRunnerStorage(options);
}

export const createIndexedDbRunnerStorage = createIndexedDBRunnerStorage;
