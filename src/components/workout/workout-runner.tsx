"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  createRunnerState,
  getActiveSetDisplay,
  getFailedOperations,
  getRestTimerView,
  isNavigationBlocked,
  loadRunnerState,
  mergeRunnerStorageStates,
  navigationProtectionReason,
  persistRunnerState,
  runnerReducer,
  runnerOperationSemanticTarget,
  stableIdempotencyKey,
  syncRunnerOperations,
  type ActiveWorkoutState,
  type CardioDraft,
  type ExerciseSubstitution,
  type RestTimerView,
  type RunnerAction,
  type RunnerConnectivity,
  type RunnerOperation,
  type RunnerStorage,
  type RunnerSubmitter,
  type SetDraft,
  type WorkoutExerciseSnapshot,
  type WorkoutSnapshot,
} from "@/domain/workout-runner";
import {
  formatCardioPace,
  formatCardioSummary,
  displayToKilograms,
  displayToMeters,
  displayToPace,
  formatMeasurement,
  formatOperationStatus,
  formatRestTimer,
  formatRunnerStatus,
  formatSetTarget,
  formatSyncStatus,
  formatTimerAnnouncement,
  formatTimerStatus,
  kilogramsToDisplay,
  metersToDisplay,
  paceToDisplay,
  shouldAnnounceTimerChange,
  type RunnerUnitSystem,
  type RunnerStatusPresentation,
} from "@/components/workout/workout-runner-presenters";
import { CuratedVideoPlayer } from "@/components/video/curated-video-player";
import type { CuratedVideoPair } from "@/domain/youtube/embed";
import { PersonalGuidancePanel } from "@/components/workout/personal-guidance-panel";

export type RunnerNavigationProtection = Readonly<{
  blocked: boolean;
  reason?: string;
}>;

type NavigationProtectionOptions = Readonly<{
  onChange?: (protection: RunnerNavigationProtection) => void;
  protectBeforeUnload?: boolean;
}>;

export type RunnerPersistenceGuard = () => boolean;

export type RunnerStorageUpdateSource = Readonly<{
  subscribe(listener: () => void): () => void;
}>;

export type RunnerPersistenceTaskContext = Readonly<{
  isLatest: RunnerPersistenceGuard;
  isCancelled: () => boolean;
}>;

export type RunnerPersistenceQueue = Readonly<{
  enqueue: (
    task: (context: RunnerPersistenceTaskContext) => Promise<void>,
  ) => RunnerPersistenceHandle;
}>;

export type RunnerPersistenceHandle = Readonly<{
  promise: Promise<void>;
  cancel: () => void;
  isCurrent: RunnerPersistenceGuard;
  isLatest: RunnerPersistenceGuard;
}>;

/**
 * Serializes local persistence and remote sync work while making superseded
 * React effects unable to publish stale results back into the active state.
 * The injected submitter cannot be cancelled, so an in-flight request is
 * allowed to settle; its result is ignored when a newer revision is current.
 */
export function createRunnerPersistenceQueue(): RunnerPersistenceQueue {
  let tail: Promise<void> = Promise.resolve();
  let revision = 0;

  return {
    enqueue(task) {
      const taskRevision = ++revision;
      let cancelled = false;
      const isLatest = () => taskRevision === revision;
      const isCurrent = () => !cancelled && isLatest();
      const promise = tail.then(async () => {
        // A superseded queued revision must not write stale state. Cleanup
        // alone does not skip the latest revision: it still gets its durable
        // local write, while the task can use isCancelled to avoid UI adoption
        // or starting a remote sync after unmount.
        if (!isLatest()) return;
        await task({ isLatest, isCancelled: () => cancelled });
      });
      tail = promise.then(
        () => undefined,
        () => undefined,
      );
      return {
        promise,
        cancel: () => {
          cancelled = true;
        },
        isCurrent,
        isLatest,
      };
    },
  };
}

export function runnerSnapshotIdentity(
  snapshot: Pick<WorkoutSnapshot, "ownerUid" | "sessionId">,
): string {
  return `${snapshot.ownerUid.length}:${snapshot.ownerUid}${snapshot.sessionId.length}:${snapshot.sessionId}`;
}

export function runnerSnapshotRestoreKey(
  snapshot: Pick<
    WorkoutSnapshot,
    "ownerUid" | "sessionId" | "programRevisionId" | "dayId"
  >,
): string {
  return `${runnerSnapshotIdentity(snapshot)}\u0000${snapshot.programRevisionId.length}:${snapshot.programRevisionId}\u0000${snapshot.dayId.length}:${snapshot.dayId}`;
}

export function shouldResetRunnerSnapshot(
  previousSnapshotKey: string,
  nextSnapshotKey: string,
  previousRestoreEnabled: boolean,
  restoreEnabled: boolean,
): boolean {
  return (
    previousSnapshotKey !== nextSnapshotKey ||
    (restoreEnabled && !previousRestoreEnabled)
  );
}

export function browserRunnerConnectivity(): RunnerConnectivity {
  return typeof navigator !== "undefined" && navigator.onLine === false
    ? "offline"
    : "online";
}

export async function reloadRunnerStateFromStorage(
  current: ActiveWorkoutState,
  storage: RunnerStorage,
  getConnectivity: () => RunnerConnectivity = browserRunnerConnectivity,
): Promise<ActiveWorkoutState> {
  const restored = await loadRunnerState(storage, {
    ownerUid: current.snapshot.ownerUid,
    sessionId: current.snapshot.sessionId,
    snapshot: current.snapshot,
  });
  if (restored === undefined) return current;
  const merged = mergeRunnerStorageStates(restored, current);
  const durable =
    stableIdempotencyKey(merged) === stableIdempotencyKey(restored)
      ? restored
      : await persistRunnerState(storage, current);
  const connectivity = getConnectivity();
  const candidate =
    durable.connectivity === connectivity
      ? durable
      : runnerReducer(durable, {
          type: "set_connectivity",
          connectivity,
        });
  return stableIdempotencyKey(candidate) === stableIdempotencyKey(current)
    ? current
    : candidate;
}

export type RunnerPersistenceCycleOptions = Readonly<{
  storage: RunnerStorage;
  submitter: RunnerSubmitter;
}>;

export function runnerStateNeedsAdoption(
  current: ActiveWorkoutState,
  committed: ActiveWorkoutState | undefined,
): committed is ActiveWorkoutState {
  return (
    committed !== undefined &&
    stableIdempotencyKey(committed) !== stableIdempotencyKey(current)
  );
}

export async function runRunnerPersistenceCycle(
  state: ActiveWorkoutState,
  options: RunnerPersistenceCycleOptions,
  isCurrent: RunnerPersistenceGuard = () => true,
): Promise<ActiveWorkoutState | undefined> {
  const committed = await persistRunnerState(options.storage, state);
  if (!isCurrent()) return undefined;

  const hasPending = committed.operations.some(
    ({ status }) => status === "pending",
  );
  if (
    !hasPending ||
    committed.connectivity === "offline" ||
    committed.auth !== "valid"
  ) {
    return committed;
  }

  const next = await syncRunnerOperations(committed, {
    storage: options.storage,
    submit: options.submitter,
  });
  return isCurrent() ? next : undefined;
}

export function useWorkoutRunnerNavigationProtection(
  state: ActiveWorkoutState,
  options: NavigationProtectionOptions = {},
): RunnerNavigationProtection {
  const blocked = isNavigationBlocked(state);
  const reason = blocked ? navigationProtectionReason(state) : undefined;
  const { onChange, protectBeforeUnload } = options;
  const protection = useMemo<RunnerNavigationProtection>(
    () => (reason === undefined ? { blocked } : { blocked, reason }),
    [blocked, reason],
  );

  useEffect(() => {
    onChange?.(protection);
  }, [onChange, protection]);

  useEffect(() => {
    if (protectBeforeUnload !== true || !protection.blocked) return;
    const message = protection.reason ?? "Unsaved workout changes remain.";
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [protectBeforeUnload, protection]);

  return protection;
}

type RunnerInput =
  | Readonly<{ snapshot: WorkoutSnapshot; initialState?: never }>
  | Readonly<{ initialState: ActiveWorkoutState; snapshot?: never }>;

export type WorkoutRunnerProps = RunnerInput &
  Readonly<{
    storage: RunnerStorage;
    submitter: RunnerSubmitter;
    restoreFromStorage?: boolean;
    onStateChange?: (state: ActiveWorkoutState) => void;
    onComplete?: (state: ActiveWorkoutState) => void;
    onAbandon?: (state: ActiveWorkoutState) => void;
    onNavigateAway?: () => void;
    onNavigationProtectionChange?: (
      protection: RunnerNavigationProtection,
    ) => void;
    protectBeforeUnload?: boolean;
    reauthenticationHref?: string;
    getConnectivity?: () => RunnerConnectivity;
    storageUpdates?: RunnerStorageUpdateSource;
    unitSystem?: RunnerUnitSystem;
    getCompatibleSubstitutions?: (
      exercise: WorkoutExerciseSnapshot,
    ) =>
      | readonly ExerciseSubstitution[]
      | Promise<readonly ExerciseSubstitution[]>;
    effectiveExerciseIdBySnapshot?: Readonly<Record<string, string>>;
    curatedVideosByExerciseId?: Readonly<Record<string, CuratedVideoPair>>;
    title?: string;
    className?: string;
  }>;

function initialStateFor(input: RunnerInput): ActiveWorkoutState {
  return "initialState" in input && input.initialState !== undefined
    ? input.initialState
    : createRunnerState(input.snapshot);
}

function snapshotFor(input: RunnerInput): WorkoutSnapshot {
  return "initialState" in input && input.initialState !== undefined
    ? input.initialState.snapshot
    : input.snapshot;
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The workout action could not be completed.";
}

function scheduleRunnerMicrotask(task: () => void): () => void {
  let cancelled = false;
  queueMicrotask(() => {
    if (!cancelled) task();
  });
  return () => {
    cancelled = true;
  };
}

function numberFromInput(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : undefined;
}

function updateSetDraftField(
  draft: SetDraft,
  field: string,
  value: number | undefined,
): SetDraft {
  if (draft.kind === "weight_reps") {
    if (field === "weightKg") return { ...draft, weightKg: value };
    return { ...draft, repetitions: value };
  }
  if (draft.kind === "bodyweight_reps") {
    if (field === "addedWeightKg") return { ...draft, addedWeightKg: value };
    return { ...draft, repetitions: value };
  }
  if (draft.kind === "duration") return { ...draft, durationSeconds: value };
  if (field === "distanceMeters") return { ...draft, distanceMeters: value };
  return { ...draft, durationSeconds: value };
}

function updateCardioDraftField(
  draft: CardioDraft,
  field: string,
  value: number | string | undefined,
): CardioDraft {
  if (field === "notes")
    return { ...draft, notes: typeof value === "string" ? value : "" };
  if (field === "paceSecondsPerKilometer") {
    const pace = typeof value === "number" ? value : undefined;
    return {
      ...draft,
      paceSecondsPerKilometer: pace,
      paceSource: pace === undefined ? undefined : "entered",
    };
  }
  if (field === "durationSeconds") {
    return {
      ...draft,
      durationSeconds: typeof value === "number" ? value : undefined,
      paceSource: undefined,
    };
  }
  if (field === "distanceMeters") {
    return {
      ...draft,
      distanceMeters: typeof value === "number" ? value : undefined,
      paceSource: undefined,
    };
  }
  return {
    ...draft,
    inclinePercent: typeof value === "number" ? value : undefined,
  };
}

function inputValue(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}

function displayInputValue(
  value: number | undefined,
  unitSystem: RunnerUnitSystem,
  converter: (value: number, unitSystem: RunnerUnitSystem) => number,
): string {
  if (value === undefined) return "";
  const displayValue = converter(value, unitSystem);
  if (unitSystem === "metric") return String(displayValue);
  return String(Number(displayValue.toFixed(2)));
}

function statusClass(presentation: RunnerStatusPresentation): string {
  return `runner-status runner-status--${presentation.tone}`;
}

function readableOperationKind(kind: string): string {
  return kind
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

type LocalTabConflictGroup = Readonly<{
  targetKey: string;
  operations: readonly RunnerOperation[];
}>;

function groupLocalTabConflicts(
  operations: readonly RunnerOperation[],
): readonly LocalTabConflictGroup[] {
  const groups = new Map<string, RunnerOperation[]>();
  for (const operation of operations) {
    if (
      operation.status !== "failed" ||
      operation.failureKind !== "conflict" ||
      operation.errorCode !== "local_tab_conflict"
    ) {
      continue;
    }
    const target = runnerOperationSemanticTarget(operation);
    const targetKey = `${target.kind}:${target.id}`;
    const group = groups.get(targetKey) ?? [];
    group.push(operation);
    groups.set(targetKey, group);
  }
  return [...groups.entries()].map(([targetKey, group]) => ({
    targetKey,
    operations: group,
  }));
}

function conflictExerciseName(
  state: ActiveWorkoutState,
  exerciseId: string,
): string {
  return (
    state.substitutions[exerciseId]?.name ??
    state.snapshot.exercises.find(({ id }) => id === exerciseId)?.name ??
    "Exercise"
  );
}

function conflictTargetLabel(
  state: ActiveWorkoutState,
  operation: RunnerOperation,
): string {
  const payload = operation.payload;
  switch (payload.kind) {
    case "save_set": {
      const exercise = state.snapshot.exercises.find(
        ({ id }) => id === payload.exerciseId,
      );
      const position =
        exercise?.sets.find(({ id }) => id === payload.setId)?.position ?? 1;
      return `Set ${position} · ${conflictExerciseName(state, payload.exerciseId)}`;
    }
    case "save_cardio":
      return "Cardio log";
    case "save_note":
      return `${conflictExerciseName(state, payload.exerciseId)} note`;
    case "skip_exercise":
    case "substitute_exercise":
    case "complete_exercise":
      return `${conflictExerciseName(state, payload.exerciseId)} decision`;
    case "complete_session":
    case "abandon_session":
      return "Workout completion";
  }
}

function conflictChoiceLabel(
  operation: RunnerOperation,
  unitSystem: RunnerUnitSystem,
): string {
  const payload = operation.payload;
  switch (payload.kind) {
    case "save_set":
      return formatMeasurement(payload.measurement, { unitSystem });
    case "save_cardio":
      return `${payload.mode === "walker" ? "Walker" : "Runner"} · ${formatCardioSummary(payload.cardio, { unitSystem })}`;
    case "save_note":
      return payload.note.trim().length === 0
        ? "Empty note"
        : `Note: ${payload.note}`;
    case "skip_exercise":
      return payload.reason?.trim()
        ? `Skip · ${payload.reason}`
        : "Skip exercise";
    case "substitute_exercise":
      return `Use ${payload.replacement.name}`;
    case "complete_exercise":
      return "Complete exercise";
    case "complete_session":
      return "Complete workout";
    case "abandon_session":
      return payload.reason?.trim()
        ? `Abandon · ${payload.reason}`
        : "Abandon workout";
  }
}

function classNames(
  ...classes: readonly (string | undefined | false)[]
): string {
  return classes.filter(Boolean).join(" ");
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "number",
  step = "1",
  min = "0",
  inputMode = "decimal",
  placeholder,
  describedBy,
}: Readonly<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "number" | "text";
  step?: string;
  min?: string;
  inputMode?: "decimal" | "numeric" | "text";
  placeholder?: string;
  describedBy?: string;
}>): ReactNode {
  return (
    <label className="runner-field" htmlFor={id}>
      <span>{label}</span>
      <input
        aria-describedby={describedBy}
        id={id}
        inputMode={inputMode}
        min={type === "number" ? min : undefined}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        step={type === "number" ? step : undefined}
        type={type}
        value={value}
      />
    </label>
  );
}

export function WorkoutRunner(props: WorkoutRunnerProps) {
  const sourceSnapshot = snapshotFor(props);
  const sourceSnapshotRef = useRef(sourceSnapshot);
  const [state, setState] = useState<ActiveWorkoutState>(() =>
    initialStateFor(props),
  );
  const [announcement, setAnnouncement] = useState("");
  const [actionError, setActionError] = useState<string | undefined>();
  const [adapterError, setAdapterError] = useState<string | undefined>();
  const [isRestoring, setIsRestoring] = useState(
    props.restoreFromStorage === true && props.initialState === undefined,
  );
  const [connectivityInitialized, setConnectivityInitialized] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [skipReasons, setSkipReasons] = useState<
    Readonly<Record<string, string>>
  >({});
  const [abandonReason, setAbandonReason] = useState("");
  const [substitutionExerciseId, setSubstitutionExerciseId] =
    useState<string>();
  const [substitutionCandidates, setSubstitutionCandidates] = useState<
    readonly ExerciseSubstitution[]
  >([]);
  const [substitutionBusy, setSubstitutionBusy] = useState(false);
  const unitSystem = props.unitSystem ?? "metric";
  const { onAbandon, onComplete, onStateChange } = props;
  const previousTimerView = useRef<RestTimerView | undefined>(undefined);
  const previousRunnerStatus = useRef(state.status);
  const previousSyncStatus = useRef(state.sync.status);
  const previousAuthBlocked = useRef(false);
  const previousLocalConflictCount = useRef(0);
  const authBlockedHeading = useRef<HTMLHeadingElement>(null);
  const localConflictHeading = useRef<HTMLHeadingElement>(null);
  const runnerIdentity = runnerSnapshotIdentity(sourceSnapshot);
  const snapshotKey = runnerSnapshotRestoreKey(sourceSnapshot);
  const stateIdentity = runnerSnapshotIdentity(state.snapshot);
  const stateMatchesSnapshot =
    stateIdentity === runnerIdentity &&
    state.snapshot.programRevisionId === sourceSnapshot.programRevisionId &&
    state.snapshot.dayId === sourceSnapshot.dayId;
  const restoreEnabled =
    props.restoreFromStorage === true && props.initialState === undefined;
  const initialSnapshotKey = useRef(snapshotKey);
  const initialRestoreEnabled = useRef(restoreEnabled);
  const restoreInFlightKey = useRef<string | undefined>(undefined);
  const persistenceQueue = useRef<RunnerPersistenceQueue>(
    createRunnerPersistenceQueue(),
  );
  const stateRef = useRef(state);

  useEffect(() => {
    sourceSnapshotRef.current = sourceSnapshot;
  }, [sourceSnapshot]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const protectionOptions: NavigationProtectionOptions =
    props.onNavigationProtectionChange === undefined
      ? { protectBeforeUnload: props.protectBeforeUnload === true }
      : {
          onChange: props.onNavigationProtectionChange,
          protectBeforeUnload: props.protectBeforeUnload === true,
        };
  const protection = useWorkoutRunnerNavigationProtection(
    state,
    protectionOptions,
  );
  const localTabConflictGroups = useMemo(
    () => groupLocalTabConflicts(state.operations),
    [state.operations],
  );

  useEffect(() => {
    const shouldReset = shouldResetRunnerSnapshot(
      initialSnapshotKey.current,
      snapshotKey,
      initialRestoreEnabled.current,
      restoreEnabled,
    );
    initialSnapshotKey.current = snapshotKey;
    initialRestoreEnabled.current = restoreEnabled;
    if (!shouldReset) {
      if (!restoreEnabled) {
        restoreInFlightKey.current = undefined;
        return scheduleRunnerMicrotask(() => setIsRestoring(false));
      }
      return;
    }
    restoreInFlightKey.current = restoreEnabled ? snapshotKey : undefined;
    return scheduleRunnerMicrotask(() => {
      setState(initialStateFor(props));
      setActionError(undefined);
      setAdapterError(undefined);
      setConnectivityInitialized(false);
      setIsRestoring(restoreEnabled);
    });
  }, [props, props.initialState, props.snapshot, restoreEnabled, snapshotKey]);

  useEffect(() => {
    if (!restoreEnabled) {
      restoreInFlightKey.current = undefined;
      return;
    }
    restoreInFlightKey.current = snapshotKey;
    let cancelled = false;
    const restoreSnapshot = sourceSnapshotRef.current;
    void loadRunnerState(props.storage, {
      ownerUid: restoreSnapshot.ownerUid,
      sessionId: restoreSnapshot.sessionId,
      snapshot: restoreSnapshot,
    })
      .then((restored) => {
        if (cancelled || restored === undefined) return;
        const connectivity = (
          props.getConnectivity ?? browserRunnerConnectivity
        )();
        const hydrated =
          restored.connectivity === connectivity
            ? restored
            : runnerReducer(restored, {
                type: "set_connectivity",
                connectivity,
              });
        setState(hydrated);
        setAnnouncement("Saved workout state restored.");
      })
      .catch((error: unknown) => {
        if (!cancelled) setAdapterError(errorMessage(error));
      })
      .finally(() => {
        if (!cancelled && restoreInFlightKey.current === snapshotKey) {
          restoreInFlightKey.current = undefined;
          setIsRestoring(false);
        }
      });
    return () => {
      cancelled = true;
      if (restoreInFlightKey.current === snapshotKey) {
        restoreInFlightKey.current = undefined;
      }
    };
  }, [
    props.getConnectivity,
    props.initialState,
    props.storage,
    sourceSnapshot.ownerUid,
    sourceSnapshot.sessionId,
    sourceSnapshot.programRevisionId,
    sourceSnapshot.dayId,
    restoreEnabled,
    snapshotKey,
  ]);

  useEffect(() => {
    const connectivity = (props.getConnectivity ?? browserRunnerConnectivity)();
    return scheduleRunnerMicrotask(() => {
      setState((current) =>
        current.connectivity === connectivity
          ? current
          : runnerReducer(current, {
              type: "set_connectivity",
              connectivity,
            }),
      );
      setConnectivityInitialized(true);
    });
  }, [props.getConnectivity, snapshotKey]);

  useEffect(() => {
    const handleOffline = () => {
      setState((current) =>
        current.connectivity === "offline"
          ? current
          : runnerReducer(current, {
              type: "set_connectivity",
              connectivity: "offline",
            }),
      );
      setAnnouncement(
        "You are offline. New workout changes remain queued on this device.",
      );
    };
    const handleOnline = () => {
      setState((current) =>
        current.connectivity === "online"
          ? current
          : runnerReducer(current, {
              type: "set_connectivity",
              connectivity: "online",
            }),
      );
      setAnnouncement(
        "Connection restored. Pending workout changes will sync.",
      );
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    let requestedAgain = false;

    const reread = (): void => {
      if (inFlight) {
        requestedAgain = true;
        return;
      }
      inFlight = true;
      const before = stateRef.current;
      void reloadRunnerStateFromStorage(
        before,
        props.storage,
        props.getConnectivity ?? browserRunnerConnectivity,
      )
        .then((next) => {
          if (cancelled) return;
          if (stateRef.current !== before) {
            requestedAgain = true;
            return;
          }
          if (next !== before) {
            stateRef.current = next;
            setState(next);
            setAdapterError(undefined);
            setAnnouncement(
              "Another tab updated this workout. Device state reconciled.",
            );
          }
        })
        .catch((error: unknown) => {
          if (!cancelled) setAdapterError(errorMessage(error));
        })
        .finally(() => {
          inFlight = false;
          if (!cancelled && requestedAgain) {
            requestedAgain = false;
            reread();
          }
        });
    };

    const unsubscribe = props.storageUpdates?.subscribe(reread);
    const handleFocus = (): void => reread();
    const handleVisibility = (): void => {
      if (document.visibilityState === "visible") reread();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      unsubscribe?.();
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [props.getConnectivity, props.storage, props.storageUpdates, snapshotKey]);

  useEffect(() => {
    if (
      !connectivityInitialized ||
      isRestoring ||
      restoreInFlightKey.current === snapshotKey ||
      !stateMatchesSnapshot
    ) {
      return;
    }
    const handle = persistenceQueue.current.enqueue(
      async ({ isLatest, isCancelled }) => {
        const next = await runRunnerPersistenceCycle(
          state,
          { storage: props.storage, submitter: props.submitter },
          () => isLatest() && !isCancelled(),
        );
        if (!isLatest() || isCancelled()) return;
        setAdapterError(undefined);
        if (runnerStateNeedsAdoption(state, next)) {
          setState((current) => (current === state ? next : current));
        }
      },
    );
    void handle.promise.catch((error: unknown) => {
      if (handle.isCurrent()) setAdapterError(errorMessage(error));
    });
    return () => handle.cancel();
  }, [
    connectivityInitialized,
    isRestoring,
    props.storage,
    props.submitter,
    snapshotKey,
    state,
    stateMatchesSnapshot,
  ]);

  useEffect(() => {
    onStateChange?.(state);
  }, [onStateChange, state]);

  useEffect(() => {
    const previous = previousRunnerStatus.current;
    if (previous !== state.status && state.status === "completed") {
      onComplete?.(state);
      setAnnouncement("Workout completed and saved.");
    } else if (previous !== state.status && state.status === "abandoned") {
      onAbandon?.(state);
      setAnnouncement("Workout abandoned and saved.");
    }
    previousRunnerStatus.current = state.status;
  }, [onAbandon, onComplete, state]);

  useEffect(() => {
    const previous = previousSyncStatus.current;
    previousSyncStatus.current = state.sync.status;
    if (previous !== state.sync.status) {
      return scheduleRunnerMicrotask(() =>
        setAnnouncement(
          `Workout save status: ${formatSyncStatus(state.sync.status).label}.`,
        ),
      );
    }
  }, [state.sync.status]);

  useEffect(() => {
    const blocked = state.auth !== "valid";
    if (blocked && !previousAuthBlocked.current) {
      authBlockedHeading.current?.focus();
      setAnnouncement(
        state.auth === "revoked"
          ? "Your sign-in was revoked. Reauthenticate as the same account to continue syncing."
          : "Your sign-in expired. Reauthenticate as the same account to continue syncing.",
      );
    }
    previousAuthBlocked.current = blocked;
  }, [state.auth]);

  useEffect(() => {
    const conflictCount = localTabConflictGroups.length;
    if (conflictCount > 0 && previousLocalConflictCount.current === 0) {
      localConflictHeading.current?.focus();
      setAnnouncement(
        "Another tab queued a different value. Choose one value before syncing.",
      );
    }
    previousLocalConflictCount.current = conflictCount;
  }, [localTabConflictGroups.length]);

  function retryConnection() {
    setState((current) =>
      runnerReducer(current, {
        type: "set_connectivity",
        connectivity: "online",
        now: Date.now(),
      }),
    );
    setAnnouncement(
      "Retrying the connection with the same queued workout operation.",
    );
  }

  const timerView = useMemo(
    () => getRestTimerView(state, clockNow),
    [clockNow, state],
  );

  useEffect(() => {
    if (timerView.status !== "running") return;
    const interval = window.setInterval(() => setClockNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [timerView.status]);

  useEffect(() => {
    const previous = previousTimerView.current;
    if (shouldAnnounceTimerChange(previous, timerView)) {
      setAnnouncement(formatTimerAnnouncement(timerView));
    }
    previousTimerView.current = timerView;
  }, [timerView]);

  function apply(action: RunnerAction, message?: string) {
    try {
      const next = runnerReducer(state, action);
      setState(next);
      setActionError(undefined);
      if (message !== undefined) setAnnouncement(message);
    } catch (error: unknown) {
      const messageText = errorMessage(error);
      setActionError(messageText);
      setAnnouncement(messageText);
    }
  }

  const currentExercise =
    state.snapshot.exercises[state.currentExerciseIndex] ??
    state.snapshot.exercises[0]!;
  const activeSet = getActiveSetDisplay(state);
  const currentExerciseName =
    state.substitutions[currentExercise.id]?.name ?? currentExercise.name;
  const currentExerciseSectionLabel = currentExercise.sectionTitle?.trim()
    || (currentExercise.sectionKind === "strength"
      ? "Strength"
      : currentExercise.sectionKind === "accessory"
        ? "Accessory"
        : currentExercise.sectionKind === "core"
          ? "Core"
          : currentExercise.sectionKind === "cardio"
            ? "Cardio"
            : currentExercise.loggingKind === "duration"
              ? "Timed movement"
              : currentExercise.loggingKind === "distance_duration"
                ? "Distance movement"
                : "Movement");
  const currentEffectiveExerciseId =
    state.substitutions[currentExercise.id]?.id ??
    props.effectiveExerciseIdBySnapshot?.[currentExercise.id];
  const currentCuratedVideos = currentEffectiveExerciseId
    ? props.curatedVideosByExerciseId?.[currentEffectiveExerciseId]
    : undefined;
  const currentPersonalGuidance = state.substitutions[currentExercise.id]
    ? []
    : currentExercise.guidance ?? [];
  const workSetCount = state.snapshot.exercises.reduce(
    (total, exercise) =>
      total + exercise.sets.filter(({ phase }) => phase === "work").length,
    0,
  );
  const loggedWorkSetCount = state.snapshot.exercises.reduce(
    (total, exercise) =>
      total +
      exercise.sets.filter(
        ({ id, phase }) =>
          phase === "work" && state.loggedSets[id] !== undefined,
      ).length,
    0,
  );
  const progressValue = workSetCount === 0 ? 0 : loggedWorkSetCount;
  const syncPresentation =
    adapterError !== undefined
      ? { label: "Save failed", tone: "failed" as const }
      : state.sync.status === "idle" &&
          state.operations.some(({ status }) => status === "saved")
        ? { label: "Saved", tone: "saved" as const }
        : formatSyncStatus(state.sync.status);
  const failedOperations = getFailedOperations(state).filter(
    ({ errorCode }) => errorCode !== "local_tab_conflict",
  );
  const closed = state.status === "completed" || state.status === "abandoned";
  const hasLoggedCurrentExercise = currentExercise.sets.some(
    ({ id }) => state.loggedSets[id] !== undefined,
  );
  const operationByKey = useMemo(
    () =>
      new Map(
        state.operations.map(
          (operation) => [operation.idempotencyKey, operation] as const,
        ),
      ),
    [state.operations],
  );

  function updateSetField(field: string, value: string) {
    const parsed = numberFromInput(value);
    const canonicalValue =
      parsed === undefined
        ? undefined
        : field === "weightKg" || field === "addedWeightKg"
          ? displayToKilograms(parsed, unitSystem)
          : field === "distanceMeters"
            ? displayToMeters(parsed, unitSystem)
            : parsed;
    apply({
      type: "update_set_draft",
      setId: activeSet.setId,
      draft: updateSetDraftField(activeSet.draft, field, canonicalValue),
    });
  }

  function updateCardioField(field: string, value: string) {
    if (state.cardioDraft === undefined) return;
    const parsed = field === "notes" ? undefined : numberFromInput(value);
    const nextValue =
      field === "notes"
        ? value
        : parsed === undefined
          ? undefined
          : field === "distanceMeters"
            ? displayToMeters(parsed, unitSystem)
            : field === "paceSecondsPerKilometer"
              ? displayToPace(parsed, unitSystem)
              : parsed;
    apply({
      type: "update_cardio_draft",
      draft: updateCardioDraftField(state.cardioDraft, field, nextValue),
    });
  }

  async function requestSubstitutions(exercise: WorkoutExerciseSnapshot) {
    if (props.getCompatibleSubstitutions === undefined) return;
    setSubstitutionBusy(true);
    setSubstitutionExerciseId(exercise.id);
    setSubstitutionCandidates([]);
    try {
      const candidates = await props.getCompatibleSubstitutions(exercise);
      const compatibleCandidates = candidates.filter(
        ({ loggingKind }) => loggingKind === exercise.loggingKind,
      );
      setSubstitutionCandidates(compatibleCandidates);
      setAnnouncement(
        compatibleCandidates.length === 0
          ? "No compatible substitutions are available."
          : `${compatibleCandidates.length} compatible substitutions available.`,
      );
    } catch (error: unknown) {
      setActionError(errorMessage(error));
    } finally {
      setSubstitutionBusy(false);
    }
  }

  function handleNavigateAway() {
    if (protection.blocked) {
      const message =
        protection.reason ?? "Save or resolve this workout before leaving.";
      setActionError(message);
      setAnnouncement(message);
      return;
    }
    props.onNavigateAway?.();
  }

  function statusForOperation(
    operationKey: string | undefined,
  ): RunnerStatusPresentation | undefined {
    if (operationKey === undefined) return undefined;
    const operation = operationByKey.get(operationKey);
    return operation === undefined
      ? undefined
      : formatOperationStatus(operation.status);
  }

  function renderSetEditor() {
    const draft = activeSet.draft;
    const prefix =
      `runner-${state.snapshot.sessionId}-${activeSet.setId}`.replace(
        /[^a-zA-Z0-9_-]/g,
        "-",
      );
    if (draft.kind === "weight_reps") {
      return (
        <div className="runner-field-grid">
          <Field
            id={`${prefix}-weight`}
            label={`Weight (${unitSystem === "imperial" ? "lb" : "kg"})`}
            step="0.01"
            value={displayInputValue(
              draft.weightKg,
              unitSystem,
              kilogramsToDisplay,
            )}
            onChange={(value) => updateSetField("weightKg", value)}
          />
          <Field
            id={`${prefix}-repetitions`}
            label="Repetitions"
            inputMode="numeric"
            step="1"
            value={inputValue(draft.repetitions)}
            onChange={(value) => updateSetField("repetitions", value)}
          />
        </div>
      );
    }
    if (draft.kind === "bodyweight_reps") {
      return (
        <div className="runner-field-grid">
          <Field
            id={`${prefix}-repetitions`}
            label="Repetitions"
            inputMode="numeric"
            step="1"
            value={inputValue(draft.repetitions)}
            onChange={(value) => updateSetField("repetitions", value)}
          />
          <Field
            id={`${prefix}-added-weight`}
            label={`Added weight (${unitSystem === "imperial" ? "lb" : "kg"})`}
            step="0.01"
            value={displayInputValue(
              draft.addedWeightKg,
              unitSystem,
              kilogramsToDisplay,
            )}
            onChange={(value) => updateSetField("addedWeightKg", value)}
          />
        </div>
      );
    }
    if (draft.kind === "duration") {
      return (
        <div className="runner-field-grid runner-field-grid--single">
          <Field
            id={`${prefix}-duration`}
            label="Duration (seconds)"
            inputMode="numeric"
            step="1"
            value={inputValue(draft.durationSeconds)}
            onChange={(value) => updateSetField("durationSeconds", value)}
          />
        </div>
      );
    }
    return (
      <div className="runner-field-grid">
        <Field
          id={`${prefix}-distance`}
          label={`Distance (${unitSystem === "imperial" ? "mi" : "meters"})`}
          step="0.01"
          value={displayInputValue(
            draft.distanceMeters,
            unitSystem,
            metersToDisplay,
          )}
          onChange={(value) => updateSetField("distanceMeters", value)}
        />
        <Field
          id={`${prefix}-duration`}
          label="Duration (seconds)"
          inputMode="numeric"
          step="1"
          value={inputValue(draft.durationSeconds)}
          onChange={(value) => updateSetField("durationSeconds", value)}
        />
      </div>
    );
  }

  function renderCardio() {
    const cardioOptionCount = state.snapshot.cardioOptions.length;
    if (cardioOptionCount === 0) return null;
    const cardioDraft = state.cardioDraft;
    const cardioPrefix = `runner-${state.snapshot.sessionId}-cardio`.replace(
      /[^a-zA-Z0-9_-]/g,
      "-",
    );
    return (
      <section
        className="runner-card runner-cardio"
        aria-labelledby="runner-cardio-heading"
      >
        <div className="runner-section-heading">
          <div>
            <span className="runner-eyebrow">
              {cardioOptionCount === 1
                ? "Configured cardio option"
                : `Configured cardio options (${cardioOptionCount})`}
            </span>
            <h3 id="runner-cardio-heading">Cardio finish</h3>
          </div>
          {state.loggedCardio ? (
            <span className={statusClass({ label: "Saved", tone: "saved" })}>
              Saved
            </span>
          ) : null}
        </div>
        <p className="runner-muted">
          {cardioOptionCount === 1
            ? "Choose the configured cardio option that belongs to this immutable session snapshot."
            : `Choose one of the ${cardioOptionCount} configured cardio options in this immutable session snapshot.`}
        </p>
        <div
          className="runner-choice-grid"
          role="group"
          aria-label="Cardio mode"
        >
          {state.snapshot.cardioOptions.map((option) => (
            <button
              aria-pressed={state.cardioMode === option.mode}
              className={classNames(
                "runner-choice",
                state.cardioMode === option.mode && "runner-choice--selected",
              )}
              disabled={closed}
              key={option.id}
              onClick={() =>
                apply(
                  { type: "select_cardio", mode: option.mode },
                  `${option.mode === "walker" ? "Walker" : "Runner"} cardio selected.`,
                )
              }
              type="button"
            >
              <strong>{option.mode === "walker" ? "Walker" : "Runner"}</strong>
              <span>
                {formatCardioSummary(
                  {
                    durationSeconds: option.targetDurationSeconds,
                    distanceMeters: option.targetDistanceMeters,
                    paceSecondsPerKilometer:
                      option.targetPaceSecondsPerKilometer,
                    inclinePercent: option.targetInclinePercent,
                  },
                  { unitSystem },
                )}
              </span>
            </button>
          ))}
        </div>
        {state.cardioMode && cardioDraft ? (
          <>
            <div className="runner-target runner-target--dark">
              <span>Target</span>
              <strong>
                {formatCardioSummary(
                  {
                    durationSeconds:
                      state.snapshot.cardioOptions.find(
                        ({ mode }) => mode === state.cardioMode,
                      )?.targetDurationSeconds ?? 0,
                    distanceMeters: state.snapshot.cardioOptions.find(
                      ({ mode }) => mode === state.cardioMode,
                    )?.targetDistanceMeters,
                    paceSecondsPerKilometer: state.snapshot.cardioOptions.find(
                      ({ mode }) => mode === state.cardioMode,
                    )?.targetPaceSecondsPerKilometer,
                    inclinePercent: state.snapshot.cardioOptions.find(
                      ({ mode }) => mode === state.cardioMode,
                    )?.targetInclinePercent,
                  },
                  { unitSystem },
                )}
              </strong>
            </div>
            <div className="runner-field-grid">
              <Field
                id={`${cardioPrefix}-duration`}
                label="Duration (seconds)"
                inputMode="numeric"
                step="1"
                value={inputValue(cardioDraft.durationSeconds)}
                onChange={(value) =>
                  updateCardioField("durationSeconds", value)
                }
              />
              <Field
                id={`${cardioPrefix}-distance`}
                label={`Distance (${unitSystem === "imperial" ? "mi" : "meters"})`}
                step="0.01"
                value={displayInputValue(
                  cardioDraft.distanceMeters,
                  unitSystem,
                  metersToDisplay,
                )}
                onChange={(value) => updateCardioField("distanceMeters", value)}
              />
              <Field
                id={`${cardioPrefix}-pace`}
                label={`Pace (seconds/${unitSystem === "imperial" ? "mi" : "km"})`}
                inputMode="numeric"
                step="1"
                value={displayInputValue(
                  cardioDraft.paceSecondsPerKilometer,
                  unitSystem,
                  paceToDisplay,
                )}
                onChange={(value) =>
                  updateCardioField("paceSecondsPerKilometer", value)
                }
              />
              <Field
                id={`${cardioPrefix}-incline`}
                label="Incline (%)"
                value={inputValue(cardioDraft.inclinePercent)}
                onChange={(value) => updateCardioField("inclinePercent", value)}
              />
            </div>
            <p className="runner-field-help">
              {cardioDraft.paceSource === "derived"
                ? `Pace ${formatCardioPace(cardioDraft.paceSecondsPerKilometer, { unitSystem })} is derived from duration and distance.`
                : "Enter pace or provide duration and distance to derive it."}
            </p>
            <label
              className="runner-field runner-field--wide"
              htmlFor={`${cardioPrefix}-notes`}
            >
              <span>Cardio notes</span>
              <textarea
                id={`${cardioPrefix}-notes`}
                maxLength={2_000}
                onChange={(event) =>
                  updateCardioField("notes", event.target.value)
                }
                rows={3}
                value={cardioDraft.notes}
              />
            </label>
            <div className="runner-inline-actions">
              <button
                className="runner-button runner-button--primary"
                disabled={closed}
                onClick={() =>
                  apply(
                    { type: "save_cardio" },
                    "Cardio log queued for saving.",
                  )
                }
                type="button"
              >
                Save cardio
              </button>
              {state.loggedCardio ? (
                <span className="runner-muted">
                  {formatCardioSummary(state.loggedCardio.cardio, {
                    unitSystem,
                  })}
                </span>
              ) : null}
            </div>
          </>
        ) : (
          <p className="runner-empty">
            Select a cardio template to enter its result.
          </p>
        )}
      </section>
    );
  }

  return (
    <section
      className={classNames("workout-runner", props.className)}
      aria-labelledby="runner-title"
    >
      <a className="skip-link" href="#runner-active-panel">
        Skip to active set
      </a>
      <header className="runner-header">
        <div>
          <span className="runner-eyebrow">Active workout</span>
          <h1 id="runner-title">{props.title ?? state.snapshot.dayName}</h1>
          <p>
            Follow the preserved prescription, log what happened, and leave with
            an honest session state.
          </p>
        </div>
        <span className="runner-stamp">{formatRunnerStatus(state.status)}</span>
      </header>

      <section
        className="runner-identity"
        aria-label="Workout snapshot identity"
      >
        <dl>
          <div>
            <dt>Day</dt>
            <dd>
              {state.snapshot.dayName}
              <small>{state.snapshot.dayId}</small>
            </dd>
          </div>
          <div>
            <dt>Program revision</dt>
            <dd>
              <code>{state.snapshot.programRevisionId}</code>
            </dd>
          </div>
          <div>
            <dt>Session</dt>
            <dd>
              <code>{state.snapshot.sessionId}</code>
            </dd>
          </div>
        </dl>
        <p>Snapshot identity stays fixed while the active log changes.</p>
      </section>

      <section className="runner-progress" aria-label="Workout progress">
        <div className="runner-progress-heading">
          <span>Work sets logged</span>
          <strong>
            {progressValue} of {workSetCount}
          </strong>
        </div>
        <progress
          aria-label={`${progressValue} of ${workSetCount} work sets logged`}
          max={workSetCount}
          value={progressValue}
        />
        <span className={statusClass(syncPresentation)}>
          {syncPresentation.label}
        </span>
      </section>

      {isRestoring ? (
        <p className="runner-banner runner-banner--pending" role="status">
          Resuming saved workout state…
        </p>
      ) : null}
      {adapterError ? (
        <p className="runner-banner runner-banner--failed" role="alert">
          Local workout storage is unavailable: {adapterError}
        </p>
      ) : null}
      {actionError ? (
        <p className="runner-banner runner-banner--failed" role="alert">
          {actionError}
        </p>
      ) : null}
      {state.sync.errorMessage ? (
        <p className="runner-banner runner-banner--failed" role="alert">
          {state.sync.errorMessage}
        </p>
      ) : null}
      {state.auth !== "valid" ? (
        <section
          aria-labelledby="runner-auth-blocked-title"
          className="runner-banner runner-banner--auth runner-banner--action"
          role="alert"
        >
          <h2
            id="runner-auth-blocked-title"
            ref={authBlockedHeading}
            tabIndex={-1}
          >
            {state.auth === "revoked"
              ? "Your sign-in was revoked"
              : "Your sign-in expired"}
          </h2>
          <p>
            Reauthenticate as the same account to sync this workout. Queued
            activity remains on this device.
          </p>
          {props.reauthenticationHref ? (
            <a
              className="runner-button runner-button--primary"
              href={props.reauthenticationHref}
            >
              Reauthenticate and return
            </a>
          ) : null}
        </section>
      ) : null}
      {state.connectivity === "offline" ? (
        <section
          aria-labelledby="runner-offline-title"
          className="runner-banner runner-banner--offline runner-banner--action"
          role="status"
        >
          <h2 id="runner-offline-title">Offline queued</h2>
          <p>
            Changes remain on this device until a connection attempt is
            confirmed.
          </p>
          <button
            className="runner-button"
            onClick={retryConnection}
            type="button"
          >
            Retry connection
          </button>
        </section>
      ) : null}
      <p aria-atomic="true" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="runner-layout">
        <aside
          className="runner-outline"
          aria-labelledby="runner-outline-heading"
        >
          <div className="runner-section-heading">
            <div>
              <span className="runner-eyebrow">Session route</span>
              <h2 id="runner-outline-heading">Workout outline</h2>
            </div>
            <span>{state.snapshot.exercises.length} moves</span>
          </div>
          <ol>
            {state.snapshot.exercises.map((exercise, index) => {
              const exerciseName =
                state.substitutions[exercise.id]?.name ?? exercise.name;
              const complete = state.completedExerciseIds.includes(exercise.id);
              const skipped = state.skippedExerciseIds.includes(exercise.id);
              const isCurrent = index === state.currentExerciseIndex;
              return (
                <li key={exercise.id}>
                  <button
                    aria-current={isCurrent ? "step" : undefined}
                    className={classNames(
                      isCurrent && "runner-outline-item--current",
                    )}
                    onClick={() => apply({ type: "navigate_exercise", index })}
                    type="button"
                  >
                    <span className="runner-outline-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <strong>{exerciseName}</strong>
                      <small>
                        {skipped
                          ? "Skipped"
                          : complete
                            ? "Completed"
                            : `${exercise.sets.length} sets · ${exercise.loggingKind.replace("_", " ")}`}
                      </small>
                    </span>
                    <span aria-hidden="true">
                      {skipped ? "—" : complete ? "✓" : isCurrent ? "●" : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <div className="runner-main" id="runner-active-panel">
          <section
            className="runner-card runner-active-card"
            aria-labelledby="runner-active-heading"
          >
            <header className="runner-active-heading">
              <div>
                <span className="runner-eyebrow">{currentExerciseSectionLabel}</span>
                <span className="runner-eyebrow">
                  Exercise {state.currentExerciseIndex + 1} of{" "}
                  {state.snapshot.exercises.length}
                </span>
                <h2 id="runner-active-heading">{currentExerciseName}</h2>
                <p>
                  {currentExercise.loggingKind.replace("_", " ")} ·{" "}
                  {currentExercise.sets.length} prescribed sets
                </p>
                {state.snapshot.cardioOptions.length === 0 ? (
                  <p className="runner-muted">No cardio segment is configured for this session.</p>
                ) : null}
              </div>
              <span
                className={classNames(
                  "runner-phase",
                  activeSet.isWarmup
                    ? "runner-phase--warmup"
                    : "runner-phase--work",
                )}
              >
                {activeSet.isWarmup ? "Warm-up" : "Work"}
              </span>
            </header>

            {props.curatedVideosByExerciseId ? (
              <section
                aria-labelledby="runner-technique-heading"
                className="runner-technique"
              >
                <div className="runner-section-heading">
                  <div>
                    <span className="runner-eyebrow">
                      {currentCuratedVideos
                        ? "Two-source technique check"
                        : currentPersonalGuidance.length > 0
                          ? "Personal technique reference"
                          : "Technique check"}
                    </span>
                    <h3 id="runner-technique-heading">
                      {currentCuratedVideos
                        ? "Technique demonstrations"
                        : "Technique guidance"}
                    </h3>
                  </div>
                  <span>
                    {currentCuratedVideos
                      ? "Approved pair"
                      : currentPersonalGuidance.length > 0
                        ? "Your links"
                        : "Unavailable"}
                  </span>
                </div>
                {currentCuratedVideos ? (
                  <CuratedVideoPlayer videos={currentCuratedVideos} />
                ) : currentPersonalGuidance.length > 0 ? (
                  <PersonalGuidancePanel links={currentPersonalGuidance} />
                ) : (
                  <p className="runner-empty">
                    No approved catalog pair is available for this movement.
                    Workout logging remains available.
                  </p>
                )}
              </section>
            ) : null}

            <div
              className="runner-set-tabs"
              role="group"
              aria-label={`${currentExerciseName} sets`}
            >
              {currentExercise.sets.map((set, index) => {
                const logged = state.loggedSets[set.id];
                const isCurrent = index === state.currentSetIndex;
                const operationStatus = statusForOperation(
                  logged?.operationKey,
                );
                return (
                  <button
                    aria-current={isCurrent ? "step" : undefined}
                    className={classNames(
                      "runner-set-tab",
                      isCurrent && "runner-set-tab--current",
                      set.phase === "warmup" && "runner-set-tab--warmup",
                    )}
                    key={set.id}
                    onClick={() => apply({ type: "navigate_set", index })}
                    type="button"
                  >
                    <span>{set.position}</span>
                    <strong>
                      {set.phase === "warmup" ? "Warm-up" : "Work"}
                    </strong>
                    <small>
                      {logged
                        ? (operationStatus?.label ?? "Saved")
                        : "Not logged"}
                    </small>
                  </button>
                );
              })}
            </div>

            <div className="runner-set-context">
              <div className="runner-context-block">
                <span>Previous</span>
                <strong>
                  {formatMeasurement(activeSet.previous, { unitSystem })}
                </strong>
              </div>
              <div className="runner-context-block">
                <span>Target</span>
                <strong>
                  {formatSetTarget(activeSet.target, { unitSystem })}
                </strong>
              </div>
            </div>

            <fieldset className="runner-editor" disabled={closed}>
              <legend>
                Log {activeSet.isWarmup ? "warm-up" : "work"} set{" "}
                {activeSet.setPosition}
              </legend>
              {renderSetEditor()}
              <div className="runner-inline-actions">
                <button
                  className="runner-button runner-button--primary"
                  onClick={() =>
                    apply(
                      { type: "save_set", setId: activeSet.setId },
                      `${activeSet.isWarmup ? "Warm-up" : "Work"} set queued for saving.`,
                    )
                  }
                  type="button"
                >
                  Save set
                </button>
                {state.loggedSets[activeSet.setId] ? (
                  <span
                    className={statusClass(
                      statusForOperation(
                        state.loggedSets[activeSet.setId]?.operationKey,
                      ) ?? { label: "Saved", tone: "saved" },
                    )}
                  >
                    {statusForOperation(
                      state.loggedSets[activeSet.setId]?.operationKey,
                    )?.label ?? "Saved"}
                  </span>
                ) : null}
              </div>
            </fieldset>

            <section
              className="runner-rest"
              aria-labelledby="runner-rest-heading"
            >
              <div>
                <span className="runner-eyebrow">Recovery interval</span>
                <h3 id="runner-rest-heading">Rest timer</h3>
                <p aria-live="off">{formatTimerStatus(timerView)}</p>
              </div>
              <strong
                aria-label={`${timerView.remainingSeconds} seconds remaining`}
              >
                {formatRestTimer(timerView.remainingSeconds)}
              </strong>
              <div className="runner-inline-actions">
                {timerView.status === "running" ? (
                  <button
                    className="runner-button"
                    disabled={closed}
                    onClick={() =>
                      apply({ type: "pause_rest" }, "Rest timer paused.")
                    }
                    type="button"
                  >
                    Pause
                  </button>
                ) : null}
                {timerView.status === "paused" ? (
                  <button
                    className="runner-button"
                    disabled={closed}
                    onClick={() =>
                      apply({ type: "resume_rest" }, "Rest timer resumed.")
                    }
                    type="button"
                  >
                    Resume
                  </button>
                ) : null}
                {timerView.status === "idle" ||
                timerView.status === "complete" ? (
                  <button
                    className="runner-button"
                    disabled={closed}
                    onClick={() =>
                      apply({ type: "start_rest" }, "Rest timer started.")
                    }
                    type="button"
                  >
                    Start {formatRestTimer(activeSet.target.restSeconds)}
                  </button>
                ) : null}
                {timerView.status !== "idle" ? (
                  <button
                    className="runner-button runner-button--quiet"
                    disabled={closed}
                    onClick={() =>
                      apply({ type: "clear_rest" }, "Rest timer cleared.")
                    }
                    type="button"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </section>
          </section>

          <section
            className="runner-card runner-notes"
            aria-labelledby="runner-notes-heading"
          >
            <div className="runner-section-heading">
              <div>
                <span className="runner-eyebrow">Field notes</span>
                <h3 id="runner-notes-heading">Exercise note</h3>
              </div>
              {state.dirtyNoteExerciseIds.includes(currentExercise.id) ? (
                <span
                  className={statusClass({ label: "Pending", tone: "pending" })}
                >
                  Unsaved
                </span>
              ) : null}
            </div>
            <label
              className="runner-field runner-field--wide"
              htmlFor="runner-exercise-note"
            >
              <span>Private note for {currentExerciseName}</span>
              <textarea
                disabled={closed}
                id="runner-exercise-note"
                maxLength={2_000}
                onChange={(event) =>
                  apply({
                    type: "update_note",
                    exerciseId: currentExercise.id,
                    note: event.target.value,
                  })
                }
                rows={4}
                value={state.notesByExercise[currentExercise.id] ?? ""}
              />
            </label>
            <button
              className="runner-button"
              disabled={
                closed ||
                !state.dirtyNoteExerciseIds.includes(currentExercise.id)
              }
              onClick={() =>
                apply(
                  { type: "save_note", exerciseId: currentExercise.id },
                  "Exercise note queued for saving.",
                )
              }
              type="button"
            >
              Save note
            </button>
          </section>

          {props.getCompatibleSubstitutions ? (
            <section
              className="runner-card runner-substitution"
              aria-labelledby="runner-substitution-heading"
            >
              <div className="runner-section-heading">
                <div>
                  <span className="runner-eyebrow">Compatible reroute</span>
                  <h3 id="runner-substitution-heading">
                    Need another movement
                  </h3>
                </div>
                <span>
                  {state.substitutions[currentExercise.id]
                    ? "Substituted"
                    : "Optional"}
                </span>
              </div>
              <p className="runner-muted">
                Choose a replacement before logging this exercise. The domain
                keeps the original targets and logging kind.
              </p>
              <button
                className="runner-button"
                disabled={
                  closed || substitutionBusy || hasLoggedCurrentExercise
                }
                onClick={() => void requestSubstitutions(currentExercise)}
                type="button"
              >
                {substitutionBusy
                  ? "Finding compatible moves…"
                  : "Find a compatible movement"}
              </button>
              {substitutionExerciseId === currentExercise.id &&
              substitutionCandidates.length > 0 ? (
                <ul className="runner-candidate-list">
                  {substitutionCandidates.map((candidate) => (
                    <li key={candidate.id}>
                      <button
                        className="runner-candidate"
                        disabled={closed}
                        onClick={() => {
                          apply(
                            {
                              type: "substitute_exercise",
                              exerciseId: currentExercise.id,
                              replacement: candidate,
                            },
                            `${candidate.name} selected as a compatible substitution.`,
                          );
                          setSubstitutionCandidates([]);
                        }}
                        type="button"
                      >
                        <strong>{candidate.name}</strong>
                        <span>
                          {candidate.loggingKind.replace("_", " ")} · preserve
                          targets
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {substitutionExerciseId === currentExercise.id &&
              !substitutionBusy &&
              substitutionCandidates.length === 0 ? (
                <p className="runner-empty">
                  No compatible replacements are available for this exercise.
                </p>
              ) : null}
            </section>
          ) : null}

          <section
            className="runner-card runner-exercise-actions"
            aria-labelledby="runner-exercise-actions-heading"
          >
            <div className="runner-section-heading">
              <div>
                <span className="runner-eyebrow">Exercise decision</span>
                <h3 id="runner-exercise-actions-heading">Mark this movement</h3>
              </div>
            </div>
            {state.skippedExerciseIds.includes(currentExercise.id) ? (
              <p className="runner-banner runner-banner--offline">
                This exercise is skipped. Its work sets are excluded from
                completion requirements.
              </p>
            ) : state.completedExerciseIds.includes(currentExercise.id) ? (
              <p className="runner-banner runner-banner--saved">
                Exercise completed. You can review the snapshot before finishing
                the workout.
              </p>
            ) : (
              <>
                <label
                  className="runner-field runner-field--wide"
                  htmlFor="runner-skip-reason"
                >
                  <span>Skip reason (optional)</span>
                  <textarea
                    disabled={closed}
                    id="runner-skip-reason"
                    maxLength={500}
                    onChange={(event) =>
                      setSkipReasons((previous) => ({
                        ...previous,
                        [currentExercise.id]: event.target.value,
                      }))
                    }
                    rows={2}
                    value={skipReasons[currentExercise.id] ?? ""}
                  />
                </label>
                <div className="runner-inline-actions">
                  <button
                    className="runner-button runner-button--quiet"
                    disabled={closed}
                    onClick={() => {
                      const reason = skipReasons[currentExercise.id];
                      apply(
                        reason
                          ? {
                              type: "skip_exercise",
                              exerciseId: currentExercise.id,
                              reason,
                            }
                          : {
                              type: "skip_exercise",
                              exerciseId: currentExercise.id,
                            },
                        "Exercise skipped and queued for saving.",
                      );
                    }}
                    type="button"
                  >
                    Skip exercise
                  </button>
                  <button
                    className="runner-button runner-button--primary"
                    disabled={closed}
                    onClick={() =>
                      apply(
                        {
                          type: "complete_exercise",
                          exerciseId: currentExercise.id,
                        },
                        "Exercise completed and queued for saving.",
                      )
                    }
                    type="button"
                  >
                    Complete exercise
                  </button>
                </div>
              </>
            )}
          </section>

          {renderCardio()}

          {localTabConflictGroups.length > 0 ? (
            <section
              aria-labelledby="runner-local-conflict-heading"
              className="runner-card runner-recovery runner-local-conflicts"
              role="alert"
            >
              <div className="runner-section-heading">
                <div>
                  <span className="runner-eyebrow">
                    Another tab changed this workout
                  </span>
                  <h3
                    id="runner-local-conflict-heading"
                    ref={localConflictHeading}
                    tabIndex={-1}
                  >
                    Choose the workout value to keep
                  </h3>
                </div>
                <span
                  className={statusClass({
                    label: "Conflict",
                    tone: "conflict",
                  })}
                >
                  {localTabConflictGroups.length} target
                  {localTabConflictGroups.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="runner-muted">
                Both values remain on this device. Nothing is sent until you
                choose one original operation.
              </p>
              {localTabConflictGroups.map((group) => {
                const targetLabel = conflictTargetLabel(
                  state,
                  group.operations[0]!,
                );
                return (
                  <fieldset
                    className="runner-conflict-group"
                    key={group.targetKey}
                  >
                    <legend>{targetLabel}</legend>
                    <div className="runner-conflict-choices">
                      {group.operations.map((operation) => {
                        const choiceLabel = conflictChoiceLabel(
                          operation,
                          unitSystem,
                        );
                        return (
                          <button
                            aria-label={`Keep ${choiceLabel} for ${targetLabel}`}
                            className="runner-button"
                            disabled={closed}
                            key={operation.idempotencyKey}
                            onClick={() =>
                              apply(
                                {
                                  type: "resolve_local_tab_conflict",
                                  idempotencyKey: operation.idempotencyKey,
                                },
                                `${choiceLabel} selected for ${targetLabel} and queued with its original save identity.`,
                              )
                            }
                            type="button"
                          >
                            <strong>{choiceLabel}</strong>
                            <span>Keep this value</span>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                );
              })}
              <button
                className="runner-button runner-button--quiet"
                onClick={() => {
                  localConflictHeading.current?.focus();
                  setAnnouncement(
                    "Conflict left unresolved. Both values remain blocked on this device.",
                  );
                }}
                type="button"
              >
                Leave both values unresolved
              </button>
            </section>
          ) : null}

          {failedOperations.length > 0 ? (
            <section
              className="runner-card runner-recovery"
              aria-labelledby="runner-recovery-heading"
            >
              <div className="runner-section-heading">
                <div>
                  <span className="runner-eyebrow">Recovery</span>
                  <h3 id="runner-recovery-heading">Save activity</h3>
                </div>
                <span
                  className={statusClass({ label: "Failed", tone: "failed" })}
                >
                  {failedOperations.length} failed
                </span>
              </div>
              <ul>
                {failedOperations.map((operation) => {
                  const retryable =
                    operation.retryable !== false &&
                    operation.failureKind !== "conflict" &&
                    operation.failureKind !== "permanent";
                  return (
                    <li key={operation.idempotencyKey}>
                      <div>
                        <strong>{readableOperationKind(operation.kind)}</strong>
                        <small>
                          {operation.errorMessage ?? operation.errorCode}
                        </small>
                      </div>
                      {retryable ? (
                        <button
                          className="runner-button"
                          disabled={closed}
                          onClick={() =>
                            apply(
                              {
                                type: "retry_operation",
                                idempotencyKey: operation.idempotencyKey,
                              },
                              `${readableOperationKind(operation.kind)} retry queued.`,
                            )
                          }
                          type="button"
                        >
                          Retry
                        </button>
                      ) : (
                        <span className="runner-muted">Resolve conflict</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      <footer className="runner-footer">
        <div>
          <span className="runner-eyebrow">Session control</span>
          <p>
            {protection.blocked
              ? (protection.reason ??
                "Save or resolve this workout before leaving.")
              : "All local changes are saved or safely reconciled."}
          </p>
        </div>
        <div className="runner-footer-actions">
          <button
            className="runner-button runner-button--quiet"
            disabled={state.status === "abandoning" || closed}
            onClick={() => {
              const reason = abandonReason.trim();
              apply(
                reason
                  ? { type: "abandon_session", reason }
                  : { type: "abandon_session" },
                "Workout abandonment queued for saving.",
              );
            }}
            type="button"
          >
            Abandon workout
          </button>
          <button
            className="runner-button runner-button--primary"
            disabled={closed || state.status === "completing"}
            onClick={() =>
              apply(
                { type: "complete_session" },
                "Workout completion queued for saving.",
              )
            }
            type="button"
          >
            Complete workout
          </button>
          {props.onNavigateAway ? (
            <button
              className="runner-button runner-button--quiet"
              onClick={handleNavigateAway}
              type="button"
            >
              Exit workout
            </button>
          ) : null}
        </div>
        <label
          className="runner-field runner-field--wide runner-footer-reason"
          htmlFor="runner-abandon-reason"
        >
          <span>Abandonment note (optional)</span>
          <textarea
            disabled={closed}
            id="runner-abandon-reason"
            maxLength={500}
            onChange={(event) => setAbandonReason(event.target.value)}
            rows={2}
            value={abandonReason}
          />
        </label>
      </footer>
    </section>
  );
}
