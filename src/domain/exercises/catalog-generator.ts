import {
  EQUIPMENT_IDS,
  type EquipmentId,
} from "@/domain/equipment";

export type ExerciseRole =
  | "compound"
  | "accessory"
  | "core-reps"
  | "core-timed";

export type LoggingKind =
  | "weight_reps"
  | "bodyweight_reps"
  | "duration"
  | "distance_duration";

export type CatalogExercise = Readonly<{
  slug: string;
  name: string;
  role: ExerciseRole;
  loggingKind: LoggingKind;
  movementFamily: string;
  requiredEquipment: readonly EquipmentId[];
  primaryMuscles: readonly string[];
  aliases: readonly string[];
  instructions: readonly string[];
}>;

/**
 * The authored shape for one canonical movement. IDs are deliberately absent:
 * database seed identities remain derived from the stable slug.
 */
export type CatalogManifestRecord = Readonly<{
  slug: string;
  name: string;
  role: ExerciseRole;
  loggingKind: LoggingKind;
  requiredEquipment: readonly EquipmentId[];
  movementFamily: string;
  primaryMuscles: readonly string[];
  aliases: readonly string[];
  instructions: readonly [string, string, string];
}>;

/** One isolated category file can own an empty or populated record list. */
export type CatalogManifestCategory = Readonly<{
  category: string;
  records: readonly CatalogManifestRecord[];
}>;

export type CatalogManifestInput =
  | readonly CatalogManifestRecord[]
  | readonly CatalogManifestCategory[];

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const equipmentIds = new Set<string>(EQUIPMENT_IDS);
const roles = new Set<ExerciseRole>([
  "compound",
  "accessory",
  "core-reps",
  "core-timed",
]);
const loggingKinds = new Set<LoggingKind>([
  "weight_reps",
  "bodyweight_reps",
  "duration",
  "distance_duration",
]);

// Form cues may describe setup and controlled execution, but not promise an
// outcome or make a medical claim. Keep this list intentionally conservative.
const UNSUPPORTED_CLAIM_PATTERN =
  /\b(?:medical|rehab(?:ilitation|ilitate|ing)?|therap(?:y|eutic)|cure|cures|curing|diagnos(?:e|es|ed|is|ing)|heal(?:s|ed|ing)?|treat(?:s|ed|ing)?|injury[\s-]?proof|pain[\s-]?(?:free|relief|management)|prevent(?:s|ed|ing)?\s+(?:injur(?:y|ies)|pain)|reduce(?:s|d|ing)?\s+pain|build(?:s|ing)?\s+muscle|burn(?:s|ing)?\s+fat|lose(?:s|ing)?\s+weight|(?:increase|improve|decrease|reduce|boost|enhance|maximi[sz]e|optimi[sz]e)(?:s|d|ing)?\s+(?:strength|muscle|performance|posture|mobility|flexibility|endurance|balance|fitness|power)|guarantee(?:s|d|ing)?\s+results?)\b/iu;

function fail(path: string, message: string): never {
  throw new TypeError(`Invalid catalog manifest at ${path}: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function assertNonblankString(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(path, "must be a nonblank string");
  }
}

function assertSafeCopy(value: string, path: string): void {
  if (UNSUPPORTED_CLAIM_PATTERN.test(value)) {
    fail(path, "contains a medical or outcome claim");
  }
}

function isCategoryManifest(value: unknown): value is CatalogManifestCategory {
  return isRecord(value) && ("category" in value || "records" in value);
}

function flattenInput(input: CatalogManifestInput): readonly CatalogManifestRecord[] {
  if (!Array.isArray(input)) {
    fail("root", "must be an array");
  }

  if (input.length === 0) return [];

  if (isCategoryManifest(input[0])) {
    const records: CatalogManifestRecord[] = [];
    const categories = new Set<string>();

    input.forEach((category, categoryIndex) => {
      const path = `categories[${categoryIndex}]`;
      if (!isCategoryManifest(category)) {
        fail(path, "cannot mix category manifests and records");
      }
      assertNonblankString(category.category, `${path}.category`);
      if (categories.has(category.category)) {
        fail(`${path}.category`, `duplicate category ${category.category}`);
      }
      categories.add(category.category);
      if (!Array.isArray(category.records)) {
        fail(`${path}.records`, "must be an array");
      }
      records.push(...category.records);
    });

    return records;
  }

  if (input.some(isCategoryManifest)) {
    fail("root", "cannot mix category manifests and records");
  }
  return input;
}

function validateRecord(
  value: unknown,
  path: string,
): asserts value is CatalogManifestRecord {
  if (!isRecord(value)) fail(path, "must be an object");

  assertNonblankString(value["slug"], `${path}.slug`);
  if (!SLUG_PATTERN.test(value["slug"])) {
    fail(`${path}.slug`, "must be a lowercase hyphenated slug");
  }
  assertNonblankString(value["name"], `${path}.name`);
  assertSafeCopy(value["name"], `${path}.name`);

  if (
    typeof value["role"] !== "string" ||
    !roles.has(value["role"] as ExerciseRole)
  ) {
    fail(`${path}.role`, "is not a supported exercise role");
  }
  if (
    typeof value["loggingKind"] !== "string" ||
    !loggingKinds.has(value["loggingKind"] as LoggingKind)
  ) {
    fail(`${path}.loggingKind`, "is not a supported logging kind");
  }

  if (
    !Array.isArray(value["requiredEquipment"]) ||
    value["requiredEquipment"].length === 0
  ) {
    fail(`${path}.requiredEquipment`, "must contain at least one equipment ID");
  }
  value["requiredEquipment"].forEach((equipment, equipmentIndex) => {
    if (typeof equipment !== "string" || !equipmentIds.has(equipment)) {
      fail(
        `${path}.requiredEquipment[${equipmentIndex}]`,
        "is not a supported equipment ID",
      );
    }
  });

  assertNonblankString(value["movementFamily"], `${path}.movementFamily`);
  if (!SLUG_PATTERN.test(value["movementFamily"])) {
    fail(
      `${path}.movementFamily`,
      "must be a lowercase hyphenated movement family",
    );
  }

  if (
    !Array.isArray(value["primaryMuscles"]) ||
    value["primaryMuscles"].length === 0
  ) {
    fail(`${path}.primaryMuscles`, "must contain at least one muscle");
  }
  value["primaryMuscles"].forEach((muscle, muscleIndex) => {
    assertNonblankString(muscle, `${path}.primaryMuscles[${muscleIndex}]`);
    assertSafeCopy(muscle, `${path}.primaryMuscles[${muscleIndex}]`);
  });

  if (!Array.isArray(value["aliases"]) || value["aliases"].length === 0) {
    fail(`${path}.aliases`, "must contain at least one alias");
  }
  const normalizedAliases = new Set<string>();
  value["aliases"].forEach((alias, aliasIndex) => {
    assertNonblankString(alias, `${path}.aliases[${aliasIndex}]`);
    assertSafeCopy(alias, `${path}.aliases[${aliasIndex}]`);
    const normalizedAlias = normalizeCatalogAlias(alias);
    if (normalizedAliases.has(normalizedAlias)) {
      fail(
        `${path}.aliases[${aliasIndex}]`,
        `duplicates normalized alias ${normalizedAlias}`,
      );
    }
    normalizedAliases.add(normalizedAlias);
  });

  if (
    !Array.isArray(value["instructions"]) ||
    value["instructions"].length !== 3
  ) {
    fail(`${path}.instructions`, "must contain exactly three instructions");
  }
  value["instructions"].forEach((instruction, instructionIndex) => {
    assertNonblankString(instruction, `${path}.instructions[${instructionIndex}]`);
    assertSafeCopy(instruction, `${path}.instructions[${instructionIndex}]`);
  });
}

/** Keep the seed's existing trim/lowercase normalization exactly. */
export function normalizeCatalogAlias(alias: string): string {
  return alias.trim().toLocaleLowerCase("en-US");
}

/**
 * Validate and flatten one or more category manifests without changing their
 * authored order. The returned records are still the caller's values; use
 * `generateCatalog` for the immutable runtime representation.
 */
export function validateCatalogManifests(
  input: CatalogManifestInput,
): readonly CatalogManifestRecord[] {
  const records = flattenInput(input);
  const slugs = new Set<string>();

  records.forEach((record, recordIndex) => {
    const path = `records[${recordIndex}]`;
    validateRecord(record, path);
    if (slugs.has(record.slug)) {
      fail(`${path}.slug`, `duplicate slug ${record.slug}`);
    }
    slugs.add(record.slug);
  });

  return records;
}

function freezeRecord(record: CatalogManifestRecord): CatalogExercise {
  return Object.freeze({
    slug: record.slug,
    name: record.name,
    role: record.role,
    loggingKind: record.loggingKind,
    requiredEquipment: Object.freeze([...record.requiredEquipment]),
    movementFamily: record.movementFamily,
    primaryMuscles: Object.freeze([...record.primaryMuscles]),
    aliases: Object.freeze([...record.aliases]),
    instructions: Object.freeze([...record.instructions]) as readonly [
      string,
      string,
      string,
    ],
  });
}

/** Generate a deterministic, deeply frozen catalog keyed by stable slug. */
export function generateCatalog(
  input: CatalogManifestInput,
): Readonly<Record<string, CatalogExercise>> {
  const records = validateCatalogManifests(input);
  return Object.freeze(
    Object.fromEntries(
      records.map((record) => [record.slug, freezeRecord(record)]),
    ) as Readonly<Record<string, CatalogExercise>>,
  );
}
