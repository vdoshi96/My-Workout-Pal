"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createWorkoutStartController,
  OwnedWorkoutContractError,
} from "@/client/owned-workout";
import {
  privateApiMutation,
  PrivateApiClientError,
} from "@/client/private-api";

type StartState = "ready" | "opening" | "failed";

function startErrorMessage(error: unknown): string {
  if (
    error instanceof PrivateApiClientError ||
    error instanceof OwnedWorkoutContractError
  ) {
    return error.message;
  }
  return "The workout could not be opened. Try again.";
}

export function StartWorkoutControl({
  dayId,
  eligible,
  programId,
}: Readonly<{
  dayId: string;
  eligible: boolean;
  programId: string;
}>) {
  const router = useRouter();
  const [state, setState] = useState<StartState>("ready");
  const [message, setMessage] = useState(
    eligible
      ? "A duplicate start safely resumes the existing workout."
      : "Verify your email, then sign in again before starting a saved workout.",
  );
  const controller = useMemo(
    () => createWorkoutStartController({
      createId: () => crypto.randomUUID(),
      mutate: privateApiMutation,
      navigate: (path) => router.push(path),
    }),
    [router],
  );

  async function handleStart() {
    if (!eligible || state === "opening") return;
    setState("opening");
    setMessage("Opening your saved workout…");
    try {
      const result = await controller.start({ programId, dayId });
      setMessage(
        result.resumed
          ? "Existing workout found. Opening it now…"
          : "Workout created. Opening it now…",
      );
    } catch (error) {
      setState("failed");
      setMessage(startErrorMessage(error));
    }
  }

  return (
    <div className="workout-start-control">
      <button
        aria-describedby="workout-start-status"
        className="primary-action"
        disabled={!eligible || state === "opening"}
        onClick={() => void handleStart()}
        type="button"
      >
        {state === "opening" ? "Opening workout…" : "Start or resume workout"}
      </button>
      <p aria-live="polite" id="workout-start-status" role="status">
        {message}
      </p>
    </div>
  );
}
