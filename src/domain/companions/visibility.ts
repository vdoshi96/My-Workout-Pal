export type RoutineEditorCompanionState = Readonly<{
  busy: boolean;
  canMutate: boolean;
  dirty: boolean;
  hasErrors: boolean;
  hasOpenReview: boolean;
  hasStatusMessage: boolean;
}>;

export function canShowRoutineEditorCompanion(
  state: RoutineEditorCompanionState,
): boolean {
  return (
    state.canMutate &&
    !state.busy &&
    !state.dirty &&
    !state.hasErrors &&
    !state.hasOpenReview &&
    !state.hasStatusMessage
  );
}

export type SettingsCompanionState = Readonly<{
  busy: boolean;
  deleteBusy: boolean;
  hasDeletionReview: boolean;
  hasStatusMessage: boolean;
  hasUnsubmittedInput: boolean;
  identityReady: boolean;
  verified: boolean;
}>;

export function canShowSettingsCompanion(
  state: SettingsCompanionState,
): boolean {
  return (
    state.verified &&
    state.identityReady &&
    !state.busy &&
    !state.deleteBusy &&
    !state.hasDeletionReview &&
    !state.hasStatusMessage &&
    !state.hasUnsubmittedInput
  );
}

export type WorkoutCompanionState = Readonly<{
  hasActiveLogging: boolean;
  hasBlockingNotice: boolean;
  hasGuidance: boolean;
  hasPendingOperation: boolean;
  online: boolean;
  recoveryReady: boolean;
  terminal: boolean;
  timerActive: boolean;
}>;

export function canShowWorkoutCompanion(
  state: WorkoutCompanionState,
): boolean {
  return (
    state.recoveryReady &&
    state.online &&
    !state.hasActiveLogging &&
    !state.hasBlockingNotice &&
    !state.hasGuidance &&
    !state.hasPendingOperation &&
    !state.terminal &&
    !state.timerActive
  );
}
