"use client";

import { DecorativeCompanion } from "@/components/ui/decorative-companion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { privateApiMutation, PrivateApiClientError } from "@/client/private-api";
import {
  parseCustomExerciseDeleteResponse,
  parseCustomExerciseMutationResponse,
} from "@/components/exercises/custom-exercise-response";
import { Icon } from "@/components/ui/icon";
import { EQUIPMENT_IDS, type EquipmentId } from "@/domain/equipment";
import type { CustomExerciseView } from "@/server/repositories/custom-exercises";

import { EQUIPMENT_LABELS, LOGGING_KIND_LABELS } from "@/components/exercises/labels";

type EditorMode = "create" | "edit";

type EditableExercise = Readonly<{
  aliases: string;
  equipmentIds: readonly EquipmentId[];
  instructions: string;
  loggingKind: string;
  name: string;
  videoUrls: readonly [string, string];
}>;

function editorValue(exercise?: CustomExerciseView): EditableExercise {
  return {
    aliases: exercise?.aliases.map(({ alias }) => alias).join("\n") ?? "",
    equipmentIds: exercise?.equipmentIds ?? ["dumbbells"],
    instructions: exercise?.instructions ?? "",
    loggingKind: exercise?.loggingKind ?? "weight_reps",
    name: exercise?.name ?? "",
    videoUrls: [
      exercise?.youtubeVideoIds[0]
        ? `https://www.youtube.com/watch?v=${exercise.youtubeVideoIds[0]}`
        : "",
      exercise?.youtubeVideoIds[1]
        ? `https://www.youtube.com/watch?v=${exercise.youtubeVideoIds[1]}`
        : "",
    ],
  };
}

function newOperationKey(): string {
  return globalThis.crypto.randomUUID();
}

function errorMessage(error: unknown): string {
  return error instanceof PrivateApiClientError
    ? error.message
    : "The exercise was not saved. Try again.";
}

export function CustomExerciseEditor({
  canMutate,
  exercise,
  mode,
  referenced = false,
}: Readonly<{
  canMutate: boolean;
  exercise?: CustomExerciseView;
  mode: EditorMode;
  referenced?: boolean;
}>) {
  const router = useRouter();
  const [value, setValue] = useState(() => editorValue(exercise));
  const [baseline, setBaseline] = useState(() => JSON.stringify(editorValue(exercise)));
  const dirty = JSON.stringify(value) !== baseline;
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(exercise?.updatedAt);
  const [message, setMessage] = useState("");
  const saveKey = useRef<string | undefined>(undefined);
  const deleteKey = useRef<string | undefined>(undefined);
  const deleteConfirmButton = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (deleteOpen) deleteConfirmButton.current?.focus();
  }, [deleteOpen]);

  useEffect(() => {
    if (!dirty || busy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const protect = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (link.href !== window.location.href && !window.confirm("Discard your movement changes?")) { event.preventDefault(); event.stopImmediatePropagation(); }
    };
    window.addEventListener("beforeunload", warn); document.addEventListener("click", protect, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", protect, true); };
  }, [dirty, busy]);

  function changed(next: EditableExercise) {
    saveKey.current = undefined;
    setMessage("");
    setValue(next);
  }

  function toggleEquipment(id: EquipmentId) {
    const selected = new Set(value.equipmentIds);
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    changed({ ...value, equipmentIds: EQUIPMENT_IDS.filter((candidate) => selected.has(candidate)) });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canMutate || busy) return;
    setBusy(true);
    setMessage("Saving this private exercise…");
    const idempotencyKey = saveKey.current ?? newOperationKey();
    saveKey.current = idempotencyKey;
    const body = {
      draft: {
        aliases: value.aliases.split("\n").filter((alias) => alias.trim().length > 0),
        equipmentIds: value.equipmentIds,
        instructions: value.instructions,
        loggingKind: value.loggingKind,
        name: value.name,
        videoUrls: value.videoUrls.filter((url) => url.trim().length > 0),
      },
      idempotencyKey,
      ...(mode === "edit" && expectedUpdatedAt ? { expectedUpdatedAt } : {}),
    };
    try {
      const raw = await privateApiMutation<unknown>(
        mode === "edit" && exercise
          ? `/api/app/custom-exercises/${encodeURIComponent(exercise.id)}`
          : "/api/app/custom-exercises",
        { body, method: mode === "edit" ? "PATCH" : "POST" },
      );
      const result = parseCustomExerciseMutationResponse(
        raw,
        body.draft,
        mode === "edit" ? exercise?.id : undefined,
      );
      saveKey.current = undefined;
      setValue(editorValue(result.exercise));
      setBaseline(JSON.stringify(editorValue(result.exercise)));
      setExpectedUpdatedAt(result.exercise.updatedAt);
      setMessage(result.duplicate ? "Saved." : "Exercise saved.");
      if (mode === "create") {
        router.replace(`/app/library/custom/${result.exercise.id}`);
      }
      router.refresh();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!canMutate || busy || !exercise) return;
    setBusy(true);
    setMessage("Checking whether this exercise can be deleted…");
    const idempotencyKey = deleteKey.current ?? newOperationKey();
    deleteKey.current = idempotencyKey;
    try {
      const raw = await privateApiMutation<unknown>(`/api/app/custom-exercises/${encodeURIComponent(exercise.id)}`, {
        body: { idempotencyKey },
        method: "DELETE",
      });
      parseCustomExerciseDeleteResponse(raw, exercise.id);
      deleteKey.current = undefined;
      router.replace("/app/library/custom");
      router.refresh();
    } catch (error) {
      setDeleteOpen(false);
      setMessage(errorMessage(error));
      setBusy(false);
    }
  }

  return (
    <section className="custom-editor" aria-labelledby="custom-exercise-title">
      <header className="member-page-heading companion-heading">
        <div>
          <span className="eyebrow">Private exercise</span>
          <h1 id="custom-exercise-title">{mode === "create" ? "Create a movement" : "Edit movement"}</h1>

        </div>
        <Link className="back-link" href="/app/library/custom"><Icon name="arrow-left" /> Custom library</Link>
        <DecorativeCompanion variant="library" />
      </header>

      {!canMutate ? (
        <aside className="member-inline-notice" role="status">
          Verify your email and sign in again before saving a custom exercise.
        </aside>
      ) : null}

      <form className="custom-exercise-form" onSubmit={(event) => void submit(event)}>
        <label htmlFor="custom-name">Exercise name</label>
        <input
          autoComplete="off"
          disabled={!canMutate || busy}
          id="custom-name"
          maxLength={180}
          onChange={(event) => changed({ ...value, name: event.target.value })}
          required
          value={value.name}
        />

        <label htmlFor="custom-logging">How results are logged</label>
        <select
          disabled={!canMutate || busy || referenced}
          id="custom-logging"
          onChange={(event) => changed({ ...value, loggingKind: event.target.value })}
          value={value.loggingKind}
        >
          {Object.entries(LOGGING_KIND_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        {referenced ? <small>{"Can't be changed once it's in a routine or workout."}</small> : null}

        <fieldset disabled={!canMutate || busy}>
          <legend>Required equipment</legend>
          <div className="custom-equipment-grid">
            {EQUIPMENT_IDS.map((id) => (
              <label key={id}>
                <input
                  checked={value.equipmentIds.includes(id)}
                  onChange={() => toggleEquipment(id)}
                  type="checkbox"
                />
                <span>{EQUIPMENT_LABELS[id]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label htmlFor="custom-instructions">Instructions</label>
        <textarea
          disabled={!canMutate || busy}
          id="custom-instructions"
          maxLength={4_000}
          onChange={(event) => changed({ ...value, instructions: event.target.value })}
          rows={6}
          value={value.instructions}
        />

        <label htmlFor="custom-aliases">Search aliases</label>
        <textarea
          disabled={!canMutate || busy}
          id="custom-aliases"
          onChange={(event) => changed({ ...value, aliases: event.target.value })}
          placeholder="One alias per line"
          rows={4}
          value={value.aliases}
        />

        <fieldset disabled={!canMutate || busy}>
          <legend>YouTube demonstrations</legend>
          <p>Optional. Up to two YouTube links.</p>
          {value.videoUrls.map((url, index) => (
            <label htmlFor={`custom-video-${index + 1}`} key={index}>
              Video {index + 1}
              <input
                id={`custom-video-${index + 1}`}
                inputMode="url"
                onChange={(event) => {
                  const next = [...value.videoUrls] as [string, string];
                  next[index] = event.target.value;
                  changed({ ...value, videoUrls: next });
                }}
                placeholder="https://www.youtube.com/watch?v=…"
                type="url"
                value={url}
              />
            </label>
          ))}
        </fieldset>

        <div className="custom-form-actions">
          <button className="primary-action" disabled={!canMutate || busy} type="submit">
            <span>{busy ? "Working…" : mode === "create" ? "Create exercise" : "Save changes"}</span>
            <Icon name="arrow-right" />
          </button>
          <p aria-live="polite" role="status">{message}</p>
        </div>
      </form>

      {mode === "edit" && exercise ? (
        <section className="custom-danger-zone">
          <span className="eyebrow">Deletion</span>
          <h2>Remove this custom movement</h2>
          <p>You can delete this once no routine or workout uses it.</p>
          {deleteOpen ? (
            <div aria-labelledby="custom-delete-heading" className="custom-delete-confirm" role="alertdialog">
              <strong id="custom-delete-heading">Delete {exercise.name}?</strong>
              <p>This cannot be undone if the server confirms the exercise is unused.</p>
              <div>
                <button className="danger-action" disabled={busy} onClick={() => void remove()} ref={deleteConfirmButton} type="button">Delete exercise</button>
                <button disabled={busy} onClick={() => setDeleteOpen(false)} type="button">Cancel</button>
              </div>
            </div>
          ) : (
            <button className="danger-action" disabled={!canMutate || busy} onClick={() => setDeleteOpen(true)} type="button">Review deletion</button>
          )}
        </section>
      ) : null}
    </section>
  );
}
