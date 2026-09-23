import { createIndexedDBRunnerStorage, RUNNER_STORAGE_DATABASE_NAME, RUNNER_STORAGE_OBJECT_STORE } from "@/client/runner-storage";

export type SessionSignOutResponse = Readonly<{ authenticated: false }>;

export class SessionSignOutError extends Error {
  readonly code: "malformed_response";

  constructor() {
    super("The server did not confirm sign-out safely.");
    this.name = "SessionSignOutError";
    this.code = "malformed_response";
  }
}

export function parseSessionSignOutResponse(value: unknown): SessionSignOutResponse {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).length !== 1 ||
    !("authenticated" in value) ||
    value.authenticated !== false
  ) {
    throw new SessionSignOutError();
  }
  return { authenticated: false };
}

export async function performSessionSignOut(
  dependencies: Readonly<{
    clearOwner: (ownerUid: string) => Promise<void>;
    deleteServerSession: () => Promise<unknown>;
    signOutFirebase: () => Promise<void>;
  }>,
  ownerUid: string,
): Promise<void> {
  if (typeof window !== "undefined" && typeof indexedDB !== "undefined") {
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const request = indexedDB.open(RUNNER_STORAGE_DATABASE_NAME);
      request.onupgradeneeded = () => { request.transaction?.abort(); resolve([]); };
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("Workout storage is blocked."));
      request.onsuccess = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(RUNNER_STORAGE_OBJECT_STORE)) { database.close(); resolve([]); return; }
        const transaction = database.transaction(RUNNER_STORAGE_OBJECT_STORE, "readonly");
        const read = transaction.objectStore(RUNNER_STORAGE_OBJECT_STORE).getAllKeys();
        read.onsuccess = () => resolve(read.result);
        read.onerror = () => reject(read.error);
        transaction.oncomplete = () => database.close();
        transaction.onabort = () => { database.close(); reject(transaction.error); };
      };
    });
    const storage = createIndexedDBRunnerStorage({ ownerUid });
    const records = await Promise.all(keys.filter((key): key is string => typeof key === "string" && key.startsWith(`runner:${encodeURIComponent(ownerUid)}:`)).map((key) => storage.load(key)));
    const unsynced = records.some((record) => {
      const state = record?.state;
      return state && state.status !== "completed" && state.status !== "abandoned" &&
        (state.dirtySetIds.length > 0 || state.dirtyCardio || state.dirtyNoteExerciseIds.length > 0 || state.operations.some(({ status }) => status !== "saved" && status !== "superseded"));
    });
    if (unsynced && !window.confirm("You have a workout in progress on this device. Signing out removes it from this device. Sign out anyway?")) throw new Error("Sign-out cancelled.");
  }
  await dependencies.clearOwner(ownerUid);
  parseSessionSignOutResponse(await dependencies.deleteServerSession());
  await dependencies.signOutFirebase();
}
