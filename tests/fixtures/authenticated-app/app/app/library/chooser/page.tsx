"use client";

import { useState } from "react";

import { MovementChooserAdapter } from "@/components/exercises/movement-chooser";
import type {
  MovementChooserError,
  MovementSelection,
} from "@/domain/exercises/movement-chooser-contract";

export default function HarnessMovementChooserPage() {
  const [open, setOpen] = useState(true);
  const [selection, setSelection] = useState<MovementSelection | undefined>();
  const [error, setError] = useState<MovementChooserError | undefined>();

  return (
    <main className="member-library">
      <h1>Movement chooser harness</h1>
      {selection ? (
        <output aria-label="Chosen movement">
          {selection.source.kind}:{selection.source.id}:{selection.name}:{selection.loggingKind}
        </output>
      ) : null}
      {error ? <p role="alert">{error.code}: {error.message}</p> : null}
      <button onClick={() => setOpen(true)} type="button">Open movement chooser</button>
      {open ? (
        <MovementChooserAdapter
          onDismiss={() => setOpen(false)}
          onError={setError}
          onSelect={(next) => {
            setSelection(next);
            setOpen(false);
          }}
          request={{ intent: "add" }}
        />
      ) : null}
    </main>
  );
}
