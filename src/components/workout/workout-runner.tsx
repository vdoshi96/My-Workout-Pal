"use client";

import { LOGGING_KIND_LABELS } from "@/components/exercises/labels";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  createRunnerState,
  RunnerTransitionError,
  validateSetDraft,
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
  setEntryErrorMessage,
  formatCardioPace,
  formatCardioSummary,
  displayToKilograms,
  displayToMeters,
  displayToPace,
  formatMeasurement,
  formatOperationStatus,
  formatPreviousSet,
  formatRestHeading,
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
import { parseClockDuration, formatClockDuration } from "@/domain/time-entry";
import Link from "next/link";
import { MovementDemo } from "@/components/video/demo-sheet";
import { withFrom } from "@/domain/navigation/back-target";
import type { CuratedVideos } from "@/domain/youtube/embed";
import { PersonalGuidancePanel } from "@/components/workout/personal-guidance-panel";
import { Icon } from "@/components/ui/icon";
import { PalSticker } from "@/components/ui/scene-stage";

export type RunnerNavigationProtection = Readonly<{
  blocked: boolean;
  reason?: string;
}>;

type NavigationProtectionOptions = Readonly<{
  onChange?: (protection: RunnerNavigationProtection) => void;
  deviceWritePending?: boolean;
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
    checkpoint?: () => Promise<unknown>,
  ) => RunnerPersistenceHandle;
}>;

export type RunnerPersistenceHandle = Readonly<{
  promise: Promise<void>;
  cancel: () => void;
  isCurrent: RunnerPersistenceGuard;
  isLatest: RunnerPersistenceGuard;
}>;

/**
 * Serializes sync work while optional device checkpoints start immediately.
 * Superseded React effects cannot publish stale results into active state.
 * The injected submitter cannot be cancelled, so an in-flight request is
 * allowed to settle; its result is ignored when a newer revision is current.
 */
export function createRunnerPersistenceQueue(): RunnerPersistenceQueue {
  let tail: Promise<void> = Promise.resolve();
  let revision = 0;

  return {
    enqueue(task, checkpoint) {
      const taskRevision = ++revision;
      let cancelled = false;
      const isLatest = () => taskRevision === revision;
      const isCurrent = () => !cancelled && isLatest();
      // Device durability must not wait behind a remote request. Storage
      // transactions merge revisions atomically, including late server acks.
      const durable = Promise.resolve().then(() => checkpoint?.());
      void durable.catch(() => undefined);
      const promise = tail.then(async () => {
        await durable;
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
  const blocked = options.deviceWritePending === true || isNavigationBlocked(state);
  const reason = options.deviceWritePending ? "Saving to this device…" : blocked ? navigationProtectionReason(state) : undefined;
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
    curatedVideosByExerciseId?: Readonly<Record<string, CuratedVideos>>;
    /** Full guide destinations keyed by effective exercise id. */
    guideHrefByExerciseId?: Readonly<Record<string, string>>;
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
  if (error instanceof RunnerTransitionError && !error.code.startsWith("invalid_")) return error.message;
  console.error("Workout action failed", error);
  return "Couldn't save that change. Check your entries and try again.";
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
  return `pal-run-status pal-run-status--${presentation.tone}`;
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
  invalid,
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
  describedBy?: string | undefined;
  invalid?: boolean;
}>): ReactNode {
  return (
    <label className="pal-run-field" htmlFor={id}>
      <span>{label}</span>
      <input
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
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
  const [setError, setSetError] = useState(false);
  const [persistedState, setPersistedState] = useState<ActiveWorkoutState>();
  const [persistAttempt, setPersistAttempt] = useState(0);
  const [cardioText, setCardioText] = useState<Partial<Record<"durationSeconds" | "paceSecondsPerKilometer", string>>>({});
  const [cardioError, setCardioError] = useState(false);
  const activeHeading = useRef<HTMLHeadingElement>(null);
  const setFieldset = useRef<HTMLFieldSetElement>(null);
  const setStrip = useRef<HTMLDivElement>(null);
  const restHeading = useRef<HTMLHeadingElement>(null);
  const moreSummary = useRef<HTMLElement>(null);
  const endButton = useRef<HTMLButtonElement>(null);
  const endDialog = useRef<HTMLDialogElement>(null);
  const skipDialog = useRef<HTMLDialogElement>(null);
  const focusAfterAdvance = useRef(false);
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
    { ...protectionOptions, deviceWritePending: persistedState !== state },
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
        if (!cancelled) { console.error("Workout device storage failed", error); setAdapterError("We couldn't save to this device. Your last logged set is safe."); }
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
        "You're offline. Sets are saved on this device and will sync when you reconnect.",
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
              "Updated from another tab.",
            );
          }
        })
        .catch((error: unknown) => {
          if (!cancelled) { console.error("Workout device storage failed", error); setAdapterError("We couldn't save to this device. Your last logged set is safe."); }
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
      async () => {
        const record = await persistRunnerState(props.storage, state);
        if (stateRef.current === state) setPersistedState(state);
        return record;
      },
    );
    void handle.promise.catch((error: unknown) => {
      if (handle.isCurrent()) { console.error("Workout device storage failed", error); setAdapterError("We couldn't save to this device. Your last logged set is safe."); }
    });
    return () => handle.cancel();
  }, [
    persistAttempt,
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
      "Retrying…",
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

  const apply = useCallback((action: RunnerAction, message?: string) => {
    try {
      const next = runnerReducer(state, action);
      // Keep a new set or exercise selection ahead of older shared navigation.
      const navigated = next.currentExerciseIndex !== state.currentExerciseIndex ||
        next.currentSetIndex !== state.currentSetIndex;
      setState(navigated ? {
        ...next,
        lastUpdatedAt: Math.max(Date.now(), state.lastUpdatedAt + 1, next.lastUpdatedAt),
      } : next);
      setActionError(undefined);
      if (message !== undefined) setAnnouncement(message);
    } catch (error: unknown) {
      const messageText = errorMessage(error);
      setActionError(messageText);
      setAnnouncement(messageText);
    }
  }, [state, setState, setActionError, setAnnouncement]);

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
  const currentGuideHref = currentEffectiveExerciseId
    ? props.guideHrefByExerciseId?.[currentEffectiveExerciseId]
    : undefined;
  const currentExerciseAnchor = `exercise-${state.currentExerciseIndex + 1}`;
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
    setSetError(false);
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
    const clockField = field === "durationSeconds" || field === "paceSecondsPerKilometer";
    if (clockField) setCardioText((previous) => ({ ...previous, [field]: value }));
    setCardioError(false);
    const parsed = field === "notes" ? undefined : clockField ? parseClockDuration(value) : numberFromInput(value);
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

  useEffect(() => {
    const guard = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.(".pal-run-bar a");
      if (link && protection.blocked) {
        event.preventDefault();
        event.stopPropagation();
        setActionError(protection.reason);
      }
    };
    document.addEventListener("click", guard, true);
    return () => document.removeEventListener("click", guard, true);
  }, [protection]);

  useEffect(() => {
    if (setError) setFieldset.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus();
  }, [setError]);

  // On phones the set pills scroll sideways; keep the current one in view without moving the page.
  useEffect(() => {
    const strip = setStrip.current;
    const current = strip?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!strip || !current) return;
    const start = current.offsetLeft;
    const end = start + current.offsetWidth;
    if (start < strip.scrollLeft || end > strip.scrollLeft + strip.clientWidth) {
      strip.scrollTo({ left: Math.max(0, start - 8) });
    }
  }, [state.currentSetIndex, currentExercise.id]);

  useEffect(() => {
    if (!focusAfterAdvance.current) return;
    focusAfterAdvance.current = false;
    activeHeading.current?.focus();
    const done = state.completedExerciseIds.includes(currentExercise.id);
    setAnnouncement(done ? "Exercise done." : `Next: ${currentExerciseName}, set ${state.currentSetIndex + 1} of ${currentExercise.sets.length}.`);
  }, [state, currentExercise.id, currentExerciseName, currentExercise.sets.length]);


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
        <div className="pal-set-fields">
          <Field
            id={`${prefix}-weight`}
            invalid={setError && ((draft.weightKg === undefined || draft.weightKg < 0))}
            describedBy={setError && ((draft.weightKg === undefined || draft.weightKg < 0)) ? "runner-set-error" : undefined}
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
            invalid={setError && ((draft.repetitions === undefined || draft.repetitions < 1 || !Number.isInteger(draft.repetitions)))}
            describedBy={setError && ((draft.repetitions === undefined || draft.repetitions < 1 || !Number.isInteger(draft.repetitions))) ? "runner-set-error" : undefined}
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
        <div className="pal-set-fields">
          <Field
            id={`${prefix}-repetitions`}
            invalid={setError && ((draft.repetitions === undefined || draft.repetitions < 1 || !Number.isInteger(draft.repetitions)))}
            describedBy={setError && ((draft.repetitions === undefined || draft.repetitions < 1 || !Number.isInteger(draft.repetitions))) ? "runner-set-error" : undefined}
            label="Repetitions"
            inputMode="numeric"
            step="1"
            value={inputValue(draft.repetitions)}
            onChange={(value) => updateSetField("repetitions", value)}
          />
          <Field
            id={`${prefix}-added-weight`}
            invalid={setError && (draft.addedWeightKg !== undefined && draft.addedWeightKg < 0)}
            describedBy={setError && (draft.addedWeightKg !== undefined && draft.addedWeightKg < 0) ? "runner-set-error" : undefined}
            label={`Added weight, optional (${unitSystem === "imperial" ? "lb" : "kg"})`}
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
        <div className="pal-set-fields pal-set-fields--single">
          <Field
            id={`${prefix}-duration`}
            invalid={setError && ((draft.durationSeconds === undefined || draft.durationSeconds <= 0 || !Number.isInteger(draft.durationSeconds)))}
            describedBy={setError && ((draft.durationSeconds === undefined || draft.durationSeconds <= 0 || !Number.isInteger(draft.durationSeconds))) ? "runner-set-error" : undefined}
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
      <div className="pal-set-fields">
        <Field
          id={`${prefix}-distance`}
            invalid={setError && ((draft.distanceMeters === undefined || draft.distanceMeters <= 0))}
            describedBy={setError && ((draft.distanceMeters === undefined || draft.distanceMeters <= 0)) ? "runner-set-error" : undefined}
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
            invalid={setError && ((draft.durationSeconds === undefined || draft.durationSeconds <= 0 || !Number.isInteger(draft.durationSeconds)))}
            describedBy={setError && ((draft.durationSeconds === undefined || draft.durationSeconds <= 0 || !Number.isInteger(draft.durationSeconds))) ? "runner-set-error" : undefined}
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
        className="pal-run-section pal-run-cardio"
        aria-labelledby="runner-cardio-heading"
      >
        <div className="pal-run-section-head">
          <h3 id="runner-cardio-heading">Cardio finish</h3>
          <span className="pal-run-section-note">Required to finish</span>
          {state.loggedCardio ? (
            <span className={statusClass({ label: "Saved", tone: "saved" })}>
              Saved
            </span>
          ) : null}
        </div>
        <p className="pal-run-muted">Pick your cardio finish.</p>
        <div
          className="pal-run-choices"
          role="group"
          aria-label="Cardio"
        >
          {state.snapshot.cardioOptions.map((option) => (
            <button
              aria-pressed={state.cardioMode === option.mode}
              className="pal-run-choice"
              disabled={closed}
              key={option.id}
              onClick={() => { setCardioText({}); setCardioError(false); apply({ type: "select_cardio", mode: option.mode }); }}
              type="button"
            >
              <Icon name={option.mode === "walker" ? "walk" : "run"} />
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
          <div className="pal-set-entry pal-run-cardio-entry">
            <p className="pal-run-target">
              <span>Target</span>{" "}
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
            </p>
            <div className="pal-set-fields">
              <Field
                id={`${cardioPrefix}-duration`}
                label="Duration"
                type="text"
                placeholder="mm:ss"
                invalid={cardioError && !cardioDraft.durationSeconds}
                describedBy={cardioError ? "runner-cardio-error" : undefined}
                inputMode="numeric"
                step="1"
                value={cardioText.durationSeconds ?? (cardioDraft.durationSeconds === undefined ? "" : formatClockDuration(cardioDraft.durationSeconds))}
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
                label={`Pace (min/${unitSystem === "imperial" ? "mi" : "km"})`}
                type="text"
                placeholder="mm:ss"
                invalid={cardioError && cardioText.paceSecondsPerKilometer !== undefined && cardioText.paceSecondsPerKilometer !== "" && parseClockDuration(cardioText.paceSecondsPerKilometer) === undefined}
                describedBy={cardioError ? "runner-cardio-error" : undefined}
                inputMode="numeric"
                step="1"
                value={cardioText.paceSecondsPerKilometer ?? (cardioDraft.paceSecondsPerKilometer === undefined ? "" : formatClockDuration(paceToDisplay(cardioDraft.paceSecondsPerKilometer, unitSystem)))}
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
            {cardioError ? <p id="runner-cardio-error" className="pal-field-error">Enter a time like 20:00.</p> : null}
            <p className="pal-run-muted">
              {cardioDraft.paceSource === "derived"
                ? `Pace ${formatCardioPace(cardioDraft.paceSecondsPerKilometer, { unitSystem })} is worked out from your time and distance.`
                : "Enter a pace, or a time and distance and we'll work it out."}
            </p>
            <label
              className="pal-run-field"
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
            <div className="pal-run-entry-actions">
              <button
                className="primary-action"
                disabled={closed}
                onClick={() => {
                  if (!cardioDraft.durationSeconds || (cardioText.paceSecondsPerKilometer && parseClockDuration(cardioText.paceSecondsPerKilometer) === undefined)) { setCardioError(true); return; }
                  apply({ type: "save_cardio" });
                }}
                type="button"
              >
                Save cardio
              </button>
              {state.loggedCardio ? (
                <span className="pal-run-muted">
                  {formatCardioSummary(state.loggedCardio.cardio, {
                    unitSystem,
                  })}
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="pal-run-muted">
            Choose Walker or Runner to log it.
          </p>
        )}
      </section>
    );
  }

  const loggedActiveSet = state.loggedSets[activeSet.setId];
  const activeSetStatus = loggedActiveSet
    ? statusForOperation(loggedActiveSet.operationKey) ?? { label: "Saved", tone: "saved" as const }
    : undefined;
  const restActive = timerView.status !== "idle";
  // Rest controls swap (Pause ↔ Resume, Start ↔ Clear) and the rest area moves above the set entry while
  // resting. When the pressed control disappears, put focus on the rest heading instead of losing it.
  const keepFocusInRest = () => {
    window.requestAnimationFrame(() => {
      if (document.activeElement === null || document.activeElement === document.body) restHeading.current?.focus();
    });
  };
  const restSection = (
    <section
      className={classNames("pal-run-rest", restActive && "pal-run-rest--active")}
      data-state={timerView.status}
      role="timer"
      aria-labelledby="runner-rest-heading"
    >
      {restActive ? <PalSticker pose="resting" /> : null}
      <div className="pal-run-rest-copy">
        <h3 id="runner-rest-heading" ref={restHeading} tabIndex={-1}>{formatRestHeading(timerView)}</h3>
        <p>{formatTimerStatus(timerView)}</p>
      </div>
      {restActive ? (
        <strong className="pal-timer">
          {formatRestTimer(timerView.remainingSeconds)}
        </strong>
      ) : null}
      <div className="pal-run-rest-actions">
        {timerView.status === "running" ? (
          <button
            className="secondary-action"
            disabled={closed}
            onClick={() => {
              apply({ type: "pause_rest" }, "Rest timer paused.");
              keepFocusInRest();
            }}
            type="button"
          >
            <Icon name="pause" />
            Pause
          </button>
        ) : null}
        {timerView.status === "paused" ? (
          <button
            className="secondary-action"
            disabled={closed}
            onClick={() => { const now = Date.now(); setClockNow(now); apply({ type: "resume_rest", now }, "Rest timer resumed."); keepFocusInRest(); }}
            type="button"
          >
            <Icon name="play" />
            Resume
          </button>
        ) : null}
        {timerView.status !== "idle" ? <button type="button" className="secondary-action" disabled={closed} onClick={() => { const now = Date.now(); setClockNow(now); apply({type: "extend_rest", seconds: 30, now}, "30 seconds added."); }}><Icon name="plus" />Add 30 seconds</button> : null}
        {timerView.status === "idle" ||
        timerView.status === "complete" ? (
          <button
            className="secondary-action"
            disabled={closed}
            onClick={() => { const now = Date.now(); setClockNow(now); apply({ type: "start_rest", now }, "Rest timer started."); keepFocusInRest(); }}
            type="button"
          >
            Start {formatRestTimer(activeSet.target.restSeconds)}
          </button>
        ) : null}
        {timerView.status !== "idle" ? (
          <button
            className="pal-text-button"
            disabled={closed}
            onClick={() => {
              apply({ type: "clear_rest" }, "Rest timer cleared.");
              keepFocusInRest();
            }}
            type="button"
          >
            Clear
          </button>
        ) : null}
      </div>
    </section>
  );

  return (
    <section
      className={classNames("pal-run", props.className)}
      aria-labelledby="runner-title"
    >
      <header className="pal-run-head">
        <h1 id="runner-title">{props.title ?? state.snapshot.dayName}</h1>
        <section className="pal-run-progress" aria-label="Workout progress">
          <progress
            aria-label={`${progressValue} of ${workSetCount} work sets logged`}
            max={workSetCount}
            value={progressValue}
          />
          <p>
            <span>
              Exercise {state.currentExerciseIndex + 1} of{" "}
              {state.snapshot.exercises.length}
            </span>
            <span>
              <strong>{progressValue} of {workSetCount}</strong> work sets logged
            </span>
            <span className={statusClass(syncPresentation)}>
              {syncPresentation.label}
            </span>
            {state.status === "active" ? null : (
              <span className="pal-tag">{formatRunnerStatus(state.status)}</span>
            )}
          </p>
        </section>
      </header>

      {isRestoring ? (
        <p className="pal-run-banner pal-run-banner--pending" role="status">
          Picking up where you left off…
        </p>
      ) : null}
      {adapterError ? <div className="pal-run-banner pal-run-banner--alert" role="alert">
        <p>{"We couldn't save to this device. Your last logged set is safe."}</p>
        <button className="secondary-action" type="button" onClick={() => setPersistAttempt((value) => value + 1)}>Try again</button>
      </div> : null}
      {state.auth !== "valid" ? (
        <section
          aria-labelledby="runner-auth-blocked-title"
          className="pal-run-banner pal-run-banner--alert"
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
            Sign in again to keep syncing. Your sets are safe on this device.
          </p>
          {props.reauthenticationHref ? (
            <a
              className="primary-action"
              href={props.reauthenticationHref}
            >
              Sign in again
            </a>
          ) : null}
        </section>
      ) : null}
      {state.connectivity === "offline" ? (
        <section
          aria-labelledby="runner-offline-title"
          className="pal-run-banner pal-run-banner--offline"
          role="status"
        >
          <h2 id="runner-offline-title">{"You're offline"}</h2>
          <p>
            Sets are saved on this device and will sync when you reconnect.
          </p>
          <button
            className="secondary-action"
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

      <div className="pal-run-layout">
        <details
          className="pal-run-outline"
          aria-label="Workout outline"
        >
          <summary>Workout outline</summary>
          <p className="pal-run-outline-count">
            {state.snapshot.exercises.length} {state.snapshot.exercises.length === 1 ? "exercise" : "exercises"}
          </p>
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
                    onClick={() => apply({ type: "navigate_exercise", index })}
                    type="button"
                  >
                    <span className="pal-run-outline-number">
                      {index + 1}
                    </span>
                    <span>
                      <strong>{exerciseName}</strong>
                      <small>
                        {skipped
                          ? "Skipped"
                          : complete
                            ? "Completed"
                            : `${exercise.sets.length} sets · ${LOGGING_KIND_LABELS[exercise.loggingKind]}`}
                      </small>
                    </span>
                    <span aria-hidden="true" className="pal-run-outline-mark">
                      {skipped ? "—" : complete ? "✓" : isCurrent ? "●" : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </details>

        <div className="pal-run-main" id="runner-active-panel">
          <section
            className="pal-run-active"
            aria-labelledby="runner-active-heading"
            id={currentExerciseAnchor}
          >
            <header className="pal-run-move">
              <span className="sr-only">{currentExerciseSectionLabel}</span>
              <h2 id="runner-active-heading" ref={activeHeading} tabIndex={-1}>{currentExerciseName}</h2>
              <p className="pal-run-target">
                <span>Target</span>{" "}
                <strong>{formatSetTarget(activeSet.target, { unitSystem })}</strong>
              </p>
              {props.curatedVideosByExerciseId || currentGuideHref ? (
                <div className="pal-run-tools">
                  {props.curatedVideosByExerciseId ? (
                    <MovementDemo movementName={currentExerciseName} videos={currentCuratedVideos} />
                  ) : null}
                  {currentGuideHref ? (
                    <Link
                      className="pal-run-guide-link"
                      href={withFrom(currentGuideHref, `/workout/${encodeURIComponent(state.snapshot.sessionId)}#${currentExerciseAnchor}`)}
                      onClick={(event) => {
                        if (!protection.blocked) return;
                        event.preventDefault();
                        setActionError(protection.reason ?? "Save or resolve this workout before leaving.");
                      }}
                      prefetch={false}
                    >
                      Full guide<span className="sr-only"> for {currentExerciseName}</span>
                      <Icon name="arrow-right" />
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </header>

            <div
              className="pal-run-sets"
              ref={setStrip}
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
                      "pal-run-set",
                      isCurrent && "runner-set-tab--current",
                      set.phase === "warmup" && "pal-run-set--warmup",
                      logged && "pal-run-set--logged",
                    )}
                    data-status={logged ? (operationStatus?.tone ?? "saved") : undefined}
                    key={set.id}
                    onClick={() => apply({ type: "navigate_set", index })}
                    type="button"
                  >
                    <span className="pal-run-set-number">
                      {set.position}
                      {logged ? <span aria-hidden="true" className="pal-run-check"><Icon name="check" /></span> : null}
                    </span>
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

            {restActive ? restSection : null}

            {loggedActiveSet && !state.completedExerciseIds.includes(currentExercise.id) ? <div className="pal-run-forward">
              <button type="button" className="primary-action" disabled={closed || state.dirtySetIds.includes(activeSet.setId)} onClick={() => { focusAfterAdvance.current = true; setSetError(false); apply(
                state.currentSetIndex < currentExercise.sets.length - 1
                  ? { type: "next_set", setId: activeSet.setId }
                  : { type: "complete_exercise_and_next", exerciseId: currentExercise.id },
                undefined
              ); }}>{state.currentSetIndex < currentExercise.sets.length - 1 ? "Next set" : state.currentExerciseIndex < state.snapshot.exercises.length - 1 ? "Next exercise" : "Finish exercise"}<Icon name="arrow-right" /></button>
              <p>Tap any set above to change it.</p>
            </div> : null}

            <fieldset className="pal-set-entry pal-run-entry" ref={setFieldset} disabled={closed}>
              <legend className="pal-set-entry-title">
                Log {activeSet.isWarmup ? "warm-up" : "work"} set{" "}
                {activeSet.setPosition}
              </legend>
              <p className="pal-run-previous">
                {formatPreviousSet(activeSet.previous, { unitSystem })}
              </p>
              {renderSetEditor()}
              {setError ? <p id="runner-set-error" className="pal-field-error">{setEntryErrorMessage(activeSet.draft.kind)}</p> : null}
              <div className="pal-run-entry-actions">
                <button
                  className="primary-action"
                  onClick={() => {
                    if (!validateSetDraft(activeSet.draft).ok) { setSetError(true); setActionError(undefined); return; }
                    const now = Date.now();
                    setClockNow(now);
                    apply({ type: "log_set_and_rest", setId: activeSet.setId, now });
                  }}
                  type="button"
                >
                  {loggedActiveSet ? "Update set & rest" : "Log set & rest"}
                </button>
                {activeSetStatus ? (
                  <span className={statusClass(activeSetStatus)}>
                    {activeSetStatus.label}
                  </span>
                ) : null}
              </div>
            </fieldset>

            {restActive ? null : restSection}

            {currentPersonalGuidance.length > 0 ? (
              <details className="pal-run-disclosure pal-run-links-disclosure">
                <summary>Your links</summary>
                <PersonalGuidancePanel links={currentPersonalGuidance} />
              </details>
            ) : null}

            <details className="pal-run-disclosure pal-run-more"><summary ref={moreSummary}>More options</summary>
              <section
                className="pal-run-section"
                aria-labelledby="runner-notes-heading"
              >
                <div className="pal-run-section-head">
                  <h3 id="runner-notes-heading">Exercise note</h3>
                  {state.dirtyNoteExerciseIds.includes(currentExercise.id) ? (
                    <span
                      className={statusClass({ label: "Pending", tone: "pending" })}
                    >
                      Unsaved
                    </span>
                  ) : null}
                </div>
                <label
                  className="pal-run-field"
                  htmlFor="runner-exercise-note"
                >
                  <span>Note</span>
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
                  className="secondary-action"
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
                  className="pal-run-section"
                  aria-labelledby="runner-substitution-heading"
                >
                  <div className="pal-run-section-head">
                    <h3 id="runner-substitution-heading">
                      Swap exercise
                    </h3>
                    <span className="pal-run-section-note">
                      {state.substitutions[currentExercise.id]
                        ? "Substituted"
                        : "Optional"}
                    </span>
                  </div>
                  <p className="pal-run-muted">
                    Swap before your first set. Targets stay the same.
                  </p>
                  <button
                    className="secondary-action"
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
                    <ul className="pal-run-candidates">
                      {substitutionCandidates.map((candidate) => (
                        <li key={candidate.id}>
                          <button
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
                              {{ weight_reps: "Weight and reps", bodyweight_reps: "Reps", duration: "Time", distance_duration: "Distance and time" }[candidate.loggingKind]}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {substitutionExerciseId === currentExercise.id &&
                  !substitutionBusy &&
                  substitutionCandidates.length === 0 ? (
                    <p className="pal-run-muted">
                      No compatible replacements are available for this exercise.
                    </p>
                  ) : null}
                </section>
              ) : null}

              <button className="secondary-action pal-run-skip" type="button" disabled={closed || state.skippedExerciseIds.includes(currentExercise.id)} onClick={() => skipDialog.current?.showModal()}>Skip exercise</button>
            </details>
          </section>

          {renderCardio()}

          {localTabConflictGroups.length > 0 ? (
            <section
              aria-labelledby="runner-local-conflict-heading"
              className="pal-run-alert"
              role="alert"
            >
              <div className="pal-run-section-head">
                <h3
                  id="runner-local-conflict-heading"
                  ref={localConflictHeading}
                  tabIndex={-1}
                >
                  Pick which value to keep
                </h3>
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
              <p className="pal-run-muted">
                Another tab changed this workout. Choose the value you want to save.
              </p>
              {localTabConflictGroups.map((group) => {
                const targetLabel = conflictTargetLabel(
                  state,
                  group.operations[0]!,
                );
                return (
                  <fieldset
                    className="pal-run-conflict"
                    key={group.targetKey}
                  >
                    <legend>{targetLabel}</legend>
                    <div className="pal-run-conflict-choices">
                      {group.operations.map((operation) => {
                        const choiceLabel = conflictChoiceLabel(
                          operation,
                          unitSystem,
                        );
                        return (
                          <button
                            aria-label={`Keep ${choiceLabel}`}
                            className="secondary-action"
                            disabled={closed}
                            key={operation.idempotencyKey}
                            onClick={() =>
                              apply(
                                {
                                  type: "resolve_local_tab_conflict",
                                  idempotencyKey: operation.idempotencyKey,
                                },
                                `${choiceLabel} kept.`,
                              )
                            }
                            type="button"
                          >
                            <strong>Keep {choiceLabel}</strong>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                );
              })}
            </section>
          ) : null}

          {failedOperations.length > 0 ? (
            <section
              className="pal-run-alert"
              aria-labelledby="runner-recovery-heading"
            >
              <div className="pal-run-section-head">
                <h3 id="runner-recovery-heading">{"Couldn't save"}</h3>
                <span
                  className={statusClass({ label: "Failed", tone: "failed" })}
                >
                  {failedOperations.length} failed
                </span>
              </div>
              <ul className="pal-run-failed">
                {failedOperations.map((operation) => {
                  const retryable =
                    operation.retryable !== false &&
                    operation.failureKind !== "conflict" &&
                    operation.failureKind !== "permanent";
                  return (
                    <li key={operation.idempotencyKey}>
                      <strong>{readableOperationKind(operation.kind)}</strong>
                      {retryable ? (
                        <button
                          className="secondary-action"
                          disabled={closed}
                          onClick={() =>
                            apply(
                              {
                                type: "retry_operation",
                                idempotencyKey: operation.idempotencyKey,
                              },
                              "Retrying…",
                            )
                          }
                          type="button"
                        >
                          Try again
                        </button>
                      ) : (
                        <button className="secondary-action" type="button" onClick={() => apply({ type: "discard_failed_operation", idempotencyKey: operation.idempotencyKey }, "Change discarded.")}>Discard this change</button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      <footer className="pal-run-footer">
        <div className="pal-run-footer-actions">
          <button className="primary-action pal-run-finish" disabled={closed || state.status === "completing" || persistedState !== state || state.operations.some(({ status }) => status === "pending")} type="button" onClick={() => apply({ type: "complete_session" })}>Finish workout</button>
          <button ref={endButton} className="pal-text-button" disabled={closed || state.status === "abandoning"} type="button" onClick={() => endDialog.current?.showModal()}>End workout</button>
          {props.onNavigateAway ? <button className="pal-text-button" type="button" onClick={handleNavigateAway}>Leave for now</button> : null}
          <p className="pal-run-footer-status">{state.operations.some(({ status }) => status === "pending") ? "Saving…" : state.operations.every(({ status }) => status === "saved" || status === "superseded") ? "All changes saved." : ""}</p>
        </div>
        {actionError ? <p className="pal-field-error" role="status">{actionError}</p> : null}
      </footer>
      <dialog className="pal-sheet pal-run-dialog" ref={skipDialog} aria-labelledby="runner-skip-title" onClose={() => moreSummary.current?.focus()}>
        <h2 id="runner-skip-title">Skip {currentExerciseName}?</h2>
        <p>{"You can't log sets for it after skipping."}</p>
        <label className="pal-run-field" htmlFor="runner-skip-reason">
          <span>Reason (optional)</span>
          <textarea id="runner-skip-reason" maxLength={500} value={skipReasons[currentExercise.id] ?? ""} onChange={(event) => setSkipReasons((previous) => ({ ...previous, [currentExercise.id]: event.target.value }))} />
        </label>
        <div className="pal-actions">
          <button className="danger-action" type="button" onClick={() => { apply({ type: "skip_exercise", exerciseId: currentExercise.id, reason: skipReasons[currentExercise.id] ?? "" }, "Skipped."); skipDialog.current?.close(); }}>Skip exercise</button>
          <button className="secondary-action" type="button" onClick={() => skipDialog.current?.close()}>Cancel</button>
        </div>
      </dialog>
      <dialog className="pal-sheet pal-run-dialog" ref={endDialog} aria-labelledby="runner-end-title" onClose={() => endButton.current?.focus()}>
        <h2 id="runner-end-title">End this workout?</h2>
        <p>Sets you logged stay in your history.</p>
        <label className="pal-run-field" htmlFor="runner-abandon-reason">
          <span>Note (optional)</span>
          <textarea id="runner-abandon-reason" maxLength={500} value={abandonReason} onChange={(event) => setAbandonReason(event.target.value)} />
        </label>
        <div className="pal-actions">
          <button className="danger-action" type="button" onClick={() => { apply({ type: "abandon_session", reason: abandonReason.trim() }); endDialog.current?.close(); }}>End workout</button>
          <button className="secondary-action" type="button" onClick={() => endDialog.current?.close()}>Keep going</button>
        </div>
      </dialog>
    </section>
  );
}
