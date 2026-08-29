"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  privateApiMutation,
  privateApiRead,
  PrivateApiClientError,
} from "@/client/private-api";
import { parseCustomExerciseMutationResponse } from "@/components/exercises/custom-exercise-response";
import {
  parseMovementChooserData,
  parsePersonalGuidanceMutationResponse,
  parsePersonalGuidanceReadResponse,
} from "@/components/exercises/movement-chooser-response";
import {
  filterMovementChooserCandidates,
  type MovementChooserCandidate,
  type MovementChooserData,
  type MovementChooserSourceFilter,
} from "@/domain/exercises/movement-chooser";
import type {
  MovementChooserAdapterProps,
  MovementChooserError,
  MovementSource,
} from "@/domain/exercises/movement-chooser-contract";

type LoadState =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "error"; message: string }>
  | Readonly<{ status: "ready"; data: MovementChooserData }>;

type GuidanceState =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "loading" }>
  | Readonly<{
      status: "ready";
      urls: readonly [string, string];
      savedUrls: readonly [string, string];
      message: string;
    }>;

type CreateDraft = Readonly<{
  name: string;
  loggingKind: "weight_reps" | "bodyweight_reps" | "duration" | "distance_duration";
  equipmentIds: readonly string[];
  instructions: string;
  guidanceUrls: readonly [string, string];
}>;

const EMPTY_GUIDANCE_URLS = ["", ""] as const;

const loggingKinds = [
  { value: "weight_reps", label: "Weight + repetitions" },
  { value: "bodyweight_reps", label: "Bodyweight repetitions" },
  { value: "duration", label: "Duration" },
  { value: "distance_duration", label: "Distance + duration" },
] as const;

function sourceKey(source: MovementSource): string {
  return `${source.kind}:${source.id}`;
}

function urlsForLinks(
  links: readonly Readonly<{ canonicalUrl: string }>[],
): readonly [string, string] {
  return [links[0]?.canonicalUrl ?? "", links[1]?.canonicalUrl ?? ""];
}

function sameUrls(
  left: readonly [string, string],
  right: readonly [string, string],
): boolean {
  return left[0] === right[0] && left[1] === right[1];
}

function chooserError(
  code: MovementChooserError["code"],
  message: string,
  retryable: boolean,
): MovementChooserError {
  return { code, message: message.slice(0, 240), retryable };
}

function safeErrorMessage(error: unknown, fallback: string): string {
  return error instanceof PrivateApiClientError ? error.message : fallback;
}

function emptyCreateDraft(
  availableEquipment: readonly string[],
): CreateDraft {
  return {
    name: "",
    loggingKind: "weight_reps",
    equipmentIds: availableEquipment.slice(0, 1),
    instructions: "",
    guidanceUrls: EMPTY_GUIDANCE_URLS,
  };
}

export function MovementChooserAdapter({
  request,
  onSelect,
  onDismiss,
  onError,
}: MovementChooserAdapterProps) {
  const initialSelection =
    request.intent === "replace"
      ? sourceKey(request.currentSelection.source)
      : "";
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const onErrorRef = useRef(onError);
  const initialSelectionKey = useRef(initialSelection);
  const [attempt, setAttempt] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [createdCandidates, setCreatedCandidates] = useState<
    readonly MovementChooserCandidate[]
  >([]);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] =
    useState<MovementChooserSourceFilter>("all");
  const [selectedKey, setSelectedKey] = useState(initialSelection);
  const [guidance, setGuidance] = useState<GuidanceState>({ status: "idle" });
  const guidanceSaveKey = useRef<string | undefined>(undefined);
  const [guidanceBusy, setGuidanceBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateDraft>(() =>
    emptyCreateDraft([]),
  );
  const createSaveKey = useRef<string | undefined>(undefined);
  const createGuidanceKey = useRef<string | undefined>(undefined);
  const [createBusy, setCreateBusy] = useState(false);
  const [createMessage, setCreateMessage] = useState("");

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void privateApiRead<unknown>("/api/app/movement-chooser")
      .then(parseMovementChooserData)
      .then((data) => {
        if (cancelled) return;
        setLoadState({ status: "ready", data });
        setCreateDraft(emptyCreateDraft(data.availableEquipment));
        const initialCandidate =
          data.candidates.find(
            ({ selection }) =>
              sourceKey(selection.source) === initialSelectionKey.current,
          ) ?? data.candidates[0];
        setSelectedKey(
          initialCandidate ? sourceKey(initialCandidate.selection.source) : "",
        );
        setGuidance(
          initialCandidate?.hasApprovedGuidance
            ? { status: "idle" }
            : initialCandidate
              ? { status: "loading" }
              : { status: "idle" },
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = safeErrorMessage(
          error,
          "Movements could not be loaded. Try again.",
        );
        setLoadState({ status: "error", message });
        onErrorRef.current(
          chooserError(
            error instanceof PrivateApiClientError && error.status === 401
              ? "authentication_required"
              : "load_failed",
            message,
            !(error instanceof PrivateApiClientError) || error.status !== 401,
          ),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const candidates = useMemo(
    () =>
      loadState.status === "ready"
        ? [...createdCandidates, ...loadState.data.candidates]
        : createdCandidates,
    [createdCandidates, loadState],
  );
  const visibleCandidates = useMemo(
    () => filterMovementChooserCandidates(candidates, query, sourceFilter),
    [candidates, query, sourceFilter],
  );
  const selectedCandidate = useMemo(
    () =>
      candidates.find(
        ({ selection }) => sourceKey(selection.source) === selectedKey,
      ),
    [candidates, selectedKey],
  );
  const selectedSourceKey = selectedCandidate
    ? sourceKey(selectedCandidate.selection.source)
    : "";

  useEffect(() => {
    if (!selectedCandidate || selectedCandidate.hasApprovedGuidance) return;
    let cancelled = false;
    const source = selectedCandidate.selection.source;
    const params = new URLSearchParams({ kind: source.kind, id: source.id });
    void privateApiRead<unknown>(`/api/app/personal-guidance?${params}`)
      .then((value) => parsePersonalGuidanceReadResponse(value, source))
      .then((links) => {
        if (cancelled) return;
        const urls = urlsForLinks(links);
        setGuidance({ status: "ready", urls, savedUrls: urls, message: "" });
        guidanceSaveKey.current = undefined;
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = safeErrorMessage(
          error,
          "Personal guidance could not be loaded.",
        );
        setGuidance({
          status: "ready",
          urls: EMPTY_GUIDANCE_URLS,
          savedUrls: EMPTY_GUIDANCE_URLS,
          message,
        });
        onErrorRef.current(chooserError("guidance_failed", message, true));
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCandidate, selectedSourceKey]);

  function activateCandidate(candidate: MovementChooserCandidate) {
    const nextKey = sourceKey(candidate.selection.source);
    if (nextKey === selectedKey) return;
    setSelectedKey(nextKey);
    setGuidance(
      candidate.hasApprovedGuidance ? { status: "idle" } : { status: "loading" },
    );
  }

  function choose(candidate = selectedCandidate) {
    if (!candidate) {
      onError(chooserError("invalid_selection", "Choose a movement first.", false));
      return;
    }
    onSelect(candidate.selection);
  }

  function changeGuidance(index: 0 | 1, value: string) {
    guidanceSaveKey.current = undefined;
    setGuidance((current) => {
      if (current.status !== "ready") return current;
      const urls: [string, string] = [...current.urls];
      urls[index] = value;
      return { ...current, urls, message: "" };
    });
  }

  async function saveGuidance() {
    if (
      !selectedCandidate ||
      guidance.status !== "ready" ||
      selectedCandidate.hasApprovedGuidance ||
      guidanceBusy
    ) {
      return;
    }
    setGuidanceBusy(true);
    const idempotencyKey =
      guidanceSaveKey.current ?? globalThis.crypto.randomUUID();
    guidanceSaveKey.current = idempotencyKey;
    try {
      const source = selectedCandidate.selection.source;
      const raw = await privateApiMutation<unknown>(
        "/api/app/personal-guidance",
        {
          method: "PUT",
          body: {
            source,
            links: guidance.urls.filter((url) => url.trim().length > 0),
            idempotencyKey,
          },
        },
      );
      const result = parsePersonalGuidanceMutationResponse(raw, source);
      const urls = urlsForLinks(result.links);
      guidanceSaveKey.current = undefined;
      setGuidance({
        status: "ready",
        urls,
        savedUrls: urls,
        message: result.duplicate
          ? "The earlier guidance save is already stored."
          : urls.some(Boolean)
            ? "Your links are saved privately."
            : "Personal guidance removed.",
      });
    } catch (error) {
      const message = safeErrorMessage(
        error,
        "Personal guidance was not saved. Try again.",
      );
      setGuidance((current) =>
        current.status === "ready" ? { ...current, message } : current,
      );
      onError(chooserError("guidance_failed", message, true));
    } finally {
      setGuidanceBusy(false);
    }
  }

  function changeCreateDraft(next: CreateDraft) {
    createSaveKey.current = undefined;
    createGuidanceKey.current = undefined;
    setCreateMessage("");
    setCreateDraft(next);
  }

  function toggleCreateEquipment(equipmentId: string) {
    const selected = new Set(createDraft.equipmentIds);
    if (selected.has(equipmentId)) selected.delete(equipmentId);
    else selected.add(equipmentId);
    const available =
      loadState.status === "ready" ? loadState.data.availableEquipment : [];
    changeCreateDraft({
      ...createDraft,
      equipmentIds: available.filter((id) => selected.has(id)),
    });
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createBusy || loadState.status !== "ready") return;
    setCreateBusy(true);
    setCreateMessage("Creating your private movement…");
    const idempotencyKey = createSaveKey.current ?? globalThis.crypto.randomUUID();
    createSaveKey.current = idempotencyKey;
    const customDraft = {
      aliases: [],
      equipmentIds: createDraft.equipmentIds,
      instructions: createDraft.instructions,
      loggingKind: createDraft.loggingKind,
      name: createDraft.name,
      videoUrls: [],
    };
    try {
      const raw = await privateApiMutation<unknown>(
        "/api/app/custom-exercises",
        {
          method: "POST",
          body: { draft: customDraft, idempotencyKey },
        },
      );
      const result = parseCustomExerciseMutationResponse(raw, customDraft);
      createSaveKey.current = undefined;
      const candidate: MovementChooserCandidate = {
        selection: {
          source: { kind: "custom", id: result.exercise.id },
          name: result.exercise.name,
          loggingKind: result.exercise.loggingKind,
        },
        requiredEquipment: result.exercise.equipmentIds,
        searchText: result.exercise.aliases
          .flatMap(({ alias, normalizedAlias }) => [alias, normalizedAlias])
          .join(" "),
        hasApprovedGuidance: false,
      };
      setCreatedCandidates((current) => [
        candidate,
        ...current.filter(
          ({ selection }) =>
            sourceKey(selection.source) !== sourceKey(candidate.selection.source),
        ),
      ]);
      activateCandidate(candidate);

      const links = createDraft.guidanceUrls.filter(
        (url) => url.trim().length > 0,
      );
      if (links.length > 0) {
        const guidanceKey =
          createGuidanceKey.current ?? globalThis.crypto.randomUUID();
        createGuidanceKey.current = guidanceKey;
        try {
          const guidanceRaw = await privateApiMutation<unknown>(
            "/api/app/personal-guidance",
            {
              method: "PUT",
              body: {
                source: candidate.selection.source,
                links,
                idempotencyKey: guidanceKey,
              },
            },
          );
          parsePersonalGuidanceMutationResponse(
            guidanceRaw,
            candidate.selection.source,
          );
          createGuidanceKey.current = undefined;
        } catch (error) {
          const message = safeErrorMessage(
            error,
            "The movement was created, but its guidance was not saved. Retry the links before choosing it.",
          );
          setCreateMessage(message);
          setCreateOpen(false);
          onError(chooserError("guidance_failed", message, true));
          return;
        }
      }

      setCreateOpen(false);
      choose(candidate);
    } catch (error) {
      const message = safeErrorMessage(
        error,
        "The private movement was not created. Try again.",
      );
      setCreateMessage(message);
      onError(chooserError("create_failed", message, true));
    } finally {
      setCreateBusy(false);
    }
  }

  const guidanceDirty =
    guidance.status === "ready" && !sameUrls(guidance.urls, guidance.savedUrls);
  const canMutate = loadState.status === "ready" && loadState.data.canMutate;
  const intentLabel =
    request.intent === "replace"
      ? "Replace movement"
      : request.intent === "seed-day"
        ? "Choose the first movement"
        : "Add movement";

  return (
    <dialog
      aria-labelledby="movement-chooser-title"
      className="movement-chooser"
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      ref={dialogRef}
    >
      <header className="movement-chooser__header">
        <div>
          <span className="eyebrow">Library</span>
          <h2 id="movement-chooser-title">{intentLabel}</h2>
          <p>Compatible canonical movements and only your private movements.</p>
        </div>
        <button onClick={onDismiss} type="button" aria-label="Close movement chooser">
          Close
        </button>
      </header>

      {loadState.status === "loading" ? (
        <p role="status">Loading compatible movements…</p>
      ) : loadState.status === "error" ? (
        <section className="movement-chooser__error" role="alert">
          <p>{loadState.message}</p>
          <button
            onClick={() => {
              setLoadState({ status: "loading" });
              setAttempt((value) => value + 1);
            }}
            type="button"
          >
            Try again
          </button>
        </section>
      ) : (
        <div className="movement-chooser__body">
          <section className="movement-chooser__results" aria-label="Movement results">
            <label htmlFor="movement-chooser-search">Search movements</label>
            <input
              autoComplete="off"
              id="movement-chooser-search"
              maxLength={120}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, alias, equipment, or muscle"
              ref={searchRef}
              type="search"
              value={query}
            />
            <fieldset className="movement-chooser__filters">
              <legend>Movement source</legend>
              {(["all", "canonical", "private"] as const).map((value) => (
                <label key={value}>
                  <input
                    checked={sourceFilter === value}
                    name="movement-source-filter"
                    onChange={() => setSourceFilter(value)}
                    type="radio"
                  />
                  <span>{value === "all" ? "All" : value === "canonical" ? "Canonical" : "Mine"}</span>
                </label>
              ))}
            </fieldset>
            <p role="status">
              {visibleCandidates.length} compatible result{visibleCandidates.length === 1 ? "" : "s"}
            </p>
            {visibleCandidates.length === 0 ? (
              <div className="movement-chooser__empty">
                <p>No compatible movement matches this search.</p>
                <button onClick={() => setQuery("")} type="button">Clear search</button>
              </div>
            ) : (
              <ul className="movement-chooser__list">
                {visibleCandidates.map((candidate) => {
                  const key = sourceKey(candidate.selection.source);
                  return (
                    <li key={key}>
                      <button
                        aria-pressed={selectedKey === key}
                        onClick={() => activateCandidate(candidate)}
                        type="button"
                      >
                        <span>
                          <strong>{candidate.selection.name}</strong>
                          <small>
                            {candidate.selection.loggingKind.replaceAll("_", " ")} · {candidate.requiredEquipment.join(" + ")}
                          </small>
                        </span>
                        <span>{candidate.selection.source.kind === "catalog" ? "Canonical" : "Private"}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <button
              disabled={!canMutate}
              onClick={() => setCreateOpen(true)}
              type="button"
            >
              Create private movement
            </button>
            {!canMutate ? (
              <small>Verify your email before creating movements or saving links.</small>
            ) : null}
          </section>

          <section className="movement-chooser__detail" aria-live="polite">
            {selectedCandidate ? (
              <>
                <span className="eyebrow">
                  {selectedCandidate.selection.source.kind === "catalog" ? "Canonical" : "Private"}
                </span>
                <h3>{selectedCandidate.selection.name}</h3>
                <p>
                  {selectedCandidate.selection.loggingKind.replaceAll("_", " ")} · {selectedCandidate.requiredEquipment.join(" + ")}
                </p>
                {selectedCandidate.hasApprovedGuidance ? (
                  <div className="movement-chooser__guidance-status">
                    <strong>Approved catalog guidance available</strong>
                    <p>The workout will use its reviewed demonstration pair.</p>
                  </div>
                ) : guidance.status === "loading" ? (
                  <p role="status">Loading your private guidance…</p>
                ) : guidance.status === "ready" ? (
                  <fieldset disabled={!canMutate || guidanceBusy}>
                    <legend>Your private guidance</legend>
                    <p>Optional. HTTPS YouTube or article links are stored only for your account.</p>
                    {guidance.urls.map((url, index) => (
                      <label key={index} htmlFor={`movement-guidance-${index + 1}`}>
                        Your link {index + 1}
                        <input
                          id={`movement-guidance-${index + 1}`}
                          inputMode="url"
                          maxLength={2_048}
                          onChange={(event) => changeGuidance(index as 0 | 1, event.target.value)}
                          placeholder="https://…"
                          value={url}
                        />
                      </label>
                    ))}
                    <button disabled={!guidanceDirty} onClick={() => void saveGuidance()} type="button">
                      {guidanceBusy ? "Saving…" : "Save private links"}
                    </button>
                    {guidance.message ? <p role="status">{guidance.message}</p> : null}
                  </fieldset>
                ) : null}
                <button
                  className="primary-action"
                  disabled={guidanceDirty || guidanceBusy}
                  onClick={() => choose()}
                  type="button"
                >
                  Use this movement
                </button>
                {guidanceDirty ? <small>Save or restore your link changes before choosing.</small> : null}
              </>
            ) : (
              <p>Choose a result to review it.</p>
            )}
          </section>
        </div>
      )}

      {createOpen && loadState.status === "ready" ? (
        <section className="movement-chooser__inline-create" aria-labelledby="movement-create-title">
          <div>
            <span className="eyebrow">Owner-only</span>
            <h3 id="movement-create-title">Create private movement</h3>
          </div>
          <form onSubmit={(event) => void submitCreate(event)}>
            <label htmlFor="movement-create-name">Movement name</label>
            <input
              autoComplete="off"
              disabled={createBusy}
              id="movement-create-name"
              maxLength={180}
              onChange={(event) => changeCreateDraft({ ...createDraft, name: event.target.value })}
              required
              value={createDraft.name}
            />
            <label htmlFor="movement-create-logging">How results are logged</label>
            <select
              disabled={createBusy}
              id="movement-create-logging"
              onChange={(event) => changeCreateDraft({
                ...createDraft,
                loggingKind: event.target.value as CreateDraft["loggingKind"],
              })}
              value={createDraft.loggingKind}
            >
              {loggingKinds.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <fieldset disabled={createBusy}>
              <legend>Required equipment</legend>
              {loadState.data.availableEquipment.map((equipmentId) => (
                <label key={equipmentId}>
                  <input
                    checked={createDraft.equipmentIds.includes(equipmentId)}
                    onChange={() => toggleCreateEquipment(equipmentId)}
                    type="checkbox"
                  />
                  <span>{equipmentId}</span>
                </label>
              ))}
            </fieldset>
            <label htmlFor="movement-create-instructions">Instructions</label>
            <textarea
              disabled={createBusy}
              id="movement-create-instructions"
              maxLength={4_000}
              onChange={(event) => changeCreateDraft({ ...createDraft, instructions: event.target.value })}
              rows={4}
              value={createDraft.instructions}
            />
            <fieldset disabled={createBusy}>
              <legend>Private guidance</legend>
              {createDraft.guidanceUrls.map((url, index) => (
                <label key={index} htmlFor={`movement-create-guidance-${index + 1}`}>
                  Your link {index + 1}
                  <input
                    id={`movement-create-guidance-${index + 1}`}
                    inputMode="url"
                    maxLength={2_048}
                    onChange={(event) => {
                      const guidanceUrls: [string, string] = [...createDraft.guidanceUrls];
                      guidanceUrls[index] = event.target.value;
                      changeCreateDraft({ ...createDraft, guidanceUrls });
                    }}
                    placeholder="https://…"
                    value={url}
                  />
                </label>
              ))}
            </fieldset>
            {createMessage ? <p role="status">{createMessage}</p> : null}
            <div className="movement-chooser__inline-actions">
              <button disabled={createBusy} onClick={() => setCreateOpen(false)} type="button">
                Cancel
              </button>
              <button className="primary-action" disabled={createBusy || createDraft.equipmentIds.length === 0} type="submit">
                {createBusy ? "Creating…" : "Create and use"}
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </dialog>
  );
}

/** Short import alias for day-builder integrations. */
export const MovementChooser = MovementChooserAdapter;
