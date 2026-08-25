export type ExerciseMetadata = Readonly<{
  movementFamily: string;
  primaryMuscles: readonly string[];
  aliases: readonly string[];
  instructions: readonly string[];
}>;

const movementMetadata = {
  "bench-press": [
    ["pecs", "triceps", "front deltoids"],
    [
      "Set a stable bench position with both feet planted.",
      "Lower the weight toward the mid-chest under control.",
      "Press along the same path and finish each repetition balanced.",
    ],
  ],
  "shoulder-press": [
    ["deltoids", "triceps"],
    [
      "Sit against an upright bench with both feet planted.",
      "Start with the weights near shoulder height and wrists stacked.",
      "Press overhead smoothly, then return to the start under control.",
    ],
  ],
  "incline-press": [
    ["upper pecs", "front deltoids", "triceps"],
    [
      "Set the bench to a modest incline and plant both feet.",
      "Lower the weights beside the upper chest without bouncing.",
      "Press along the same path and keep the shoulders supported.",
    ],
  ],
  "overhead-triceps-extension": [
    ["triceps"],
    [
      "Hold the dumbbell securely above the head.",
      "Keep the upper arms steady while lowering behind the head.",
      "Extend the elbows smoothly and stop before control changes.",
    ],
  ],
  "dead-bug": [
    ["core", "hip flexors"],
    [
      "Lie on the back with arms up and knees over the hips.",
      "Lower one arm and the opposite leg without rushing.",
      "Return to the start and alternate while the torso stays steady.",
    ],
  ],
  "front-plank": [
    ["core", "glutes", "shoulders"],
    [
      "Place the forearms under the shoulders and extend both legs.",
      "Form one long line from head through heels.",
      "Breathe steadily and end the hold before position changes.",
    ],
  ],
  "horizontal-row": [
    ["lats", "upper back", "biceps"],
    [
      "Set a stable torso position before starting the pull.",
      "Row the weight toward the ribs without using momentum.",
      "Lower to a controlled reach while keeping the setup steady.",
    ],
  ],
  "one-arm-row": [
    ["lats", "upper back", "biceps"],
    [
      "Support one hand on the bench and set a stable stance.",
      "Pull the dumbbell toward the hip while the torso stays quiet.",
      "Lower to a controlled reach, finish the side, then switch.",
    ],
  ],
  pullover: [
    ["lats", "pecs", "triceps"],
    [
      "Lie securely on the bench and hold the dumbbell above the chest.",
      "Move the weight in an arc with softly bent elbows.",
      "Reverse the arc under control at the end of the chosen range.",
    ],
  ],
  "biceps-curl": [
    ["biceps", "forearms"],
    [
      "Stand tall with a dumbbell at each side.",
      "Curl without swinging or driving the elbows forward.",
      "Lower each weight to the start under control.",
    ],
  ],
  "bird-dog": [
    ["core", "glutes", "upper back"],
    [
      "Start on hands and knees with hands under shoulders.",
      "Reach one arm and the opposite leg away from the body.",
      "Return without shifting the torso, then alternate sides.",
    ],
  ],
  "side-plank": [
    ["obliques", "glutes", "shoulders"],
    [
      "Place one forearm under the shoulder and set the feet.",
      "Lift the hips into a straight line from head to feet.",
      "Hold with steady breathing, then repeat on the other side.",
    ],
  ],
  squat: [
    ["quads", "glutes", "adductors"],
    [
      "Set a balanced stance with the whole foot planted.",
      "Descend between the hips while keeping the load controlled.",
      "Stand smoothly and finish each repetition balanced.",
    ],
  ],
  "romanian-deadlift": [
    ["hamstrings", "glutes", "upper back"],
    [
      "Start tall with the load close and knees softly bent.",
      "Push the hips back while keeping the weight near the legs.",
      "Reverse the hinge to stand without turning it into a squat.",
    ],
  ],
  lunge: [
    ["quads", "glutes", "adductors"],
    [
      "Stand tall with the dumbbells at the sides.",
      "Step back and lower with control over the front leg.",
      "Push through the front foot to return, then repeat or alternate.",
    ],
  ],
  "calf-raise": [
    ["calves"],
    [
      "Stand balanced with the weights at the sides.",
      "Rise onto the balls of the feet without rocking forward.",
      "Pause at the top and lower the heels slowly.",
    ],
  ],
  "shoulder-tap": [
    ["core", "shoulders", "triceps"],
    [
      "Start in a high plank with a stable foot position.",
      "Lift one hand to tap the opposite shoulder.",
      "Replace the hand and alternate while limiting torso rotation.",
    ],
  ],
  "reverse-crunch": [
    ["core", "hip flexors"],
    [
      "Lie on the back with knees bent and feet lifted.",
      "Bring the knees toward the torso with a small controlled curl.",
      "Lower until the pelvis returns without using momentum.",
    ],
  ],
  "bicycle-crunch": [
    ["core", "obliques", "hip flexors"],
    [
      "Lie on the back with hands lightly supporting the head.",
      "Rotate one shoulder toward the opposite bent knee.",
      "Alternate sides at a controlled pace without pulling the head.",
    ],
  ],
  "hollow-hold": [
    ["core", "hip flexors"],
    [
      "Lie on the back and lift the shoulders and bent legs.",
      "Reach farther only while the torso stays steady.",
      "Hold with even breathing and use a tucked shape when needed.",
    ],
  ],
  "split-squat": [
    ["quads", "glutes", "adductors"],
    [
      "Set the rear foot on the bench and stabilize the front foot.",
      "Lower through the front leg while keeping balance over the stance.",
      "Stand through the front foot, finish the side, then switch.",
    ],
  ],
  "hip-thrust": [
    ["glutes", "hamstrings"],
    [
      "Set the upper back against the bench and secure the load at the hips.",
      "Drive through the planted feet to lift the hips.",
      "Pause at a level top position, then lower under control.",
    ],
  ],
} as const satisfies Record<
  string,
  readonly [readonly string[], readonly [string, string, string]]
>;

type MovementFamily = keyof typeof movementMetadata;

const exerciseMetadata = {
  "dumbbell-bench-press": [
    "bench-press",
    ["DB bench press", "dumbbell chest press"],
  ],
  "seated-dumbbell-shoulder-press": [
    "shoulder-press",
    ["seated DB press", "dumbbell overhead press"],
  ],
  "incline-dumbbell-press": [
    "incline-press",
    ["incline DB bench", "incline chest press"],
  ],
  "overhead-dumbbell-triceps-extension": [
    "overhead-triceps-extension",
    ["DB overhead extension", "dumbbell French press"],
  ],
  "dead-bug": ["dead-bug", ["alternating dead bug", "opposite arm leg lower"]],
  "front-plank": ["front-plank", ["prone plank", "plank hold"]],
  "barbell-bent-over-row": ["horizontal-row", ["barbell row", "bent row"]],
  "one-arm-dumbbell-row": [
    "one-arm-row",
    ["single-arm dumbbell row", "one-arm DB row"],
  ],
  "dumbbell-pullover": ["pullover", ["DB pullover", "bench pullover"]],
  "dumbbell-curl": [
    "biceps-curl",
    ["DB biceps curl", "alternating dumbbell curl"],
  ],
  "bird-dog": ["bird-dog", ["quadruped reach", "opposite arm leg reach"]],
  "side-plank": ["side-plank", ["lateral plank", "side plank hold"]],
  "chest-supported-dumbbell-row": [
    "horizontal-row",
    ["incline bench dumbbell row", "chest-supported DB row"],
  ],
  "goblet-squat": ["squat", ["dumbbell goblet squat", "cup squat"]],
  "dumbbell-romanian-deadlift": [
    "romanian-deadlift",
    ["dumbbell RDL", "DB Romanian deadlift"],
  ],
  "reverse-lunge": ["lunge", ["backward lunge", "dumbbell reverse lunge"]],
  "standing-calf-raise": [
    "calf-raise",
    ["dumbbell calf raise", "standing heel raise"],
  ],
  "plank-shoulder-tap": [
    "shoulder-tap",
    ["high plank shoulder tap", "plank taps"],
  ],
  "reverse-crunch": [
    "reverse-crunch",
    ["lying reverse crunch", "knee tuck crunch"],
  ],
  "barbell-bench-press": ["bench-press", ["bench press", "flat barbell bench"]],
  "bicycle-crunch": [
    "bicycle-crunch",
    ["bicycle abs", "alternating elbow knee crunch"],
  ],
  "hollow-hold": ["hollow-hold", ["hollow body hold", "dish hold"]],
  "barbell-back-squat": ["squat", ["back squat", "rack squat"]],
  "barbell-romanian-deadlift": [
    "romanian-deadlift",
    ["barbell RDL", "Romanian deadlift"],
  ],
  "bulgarian-split-squat": [
    "split-squat",
    ["rear-foot-elevated split squat", "RFESS"],
  ],
  "barbell-hip-thrust": [
    "hip-thrust",
    ["barbell glute bridge", "bench hip thrust"],
  ],
  "dumbbell-hip-thrust": [
    "hip-thrust",
    ["weighted glute bridge", "dumbbell glute bridge"],
  ],
} as const satisfies Record<
  string,
  readonly [MovementFamily, readonly string[]]
>;

export function getExerciseMetadata(slug: string): ExerciseMetadata {
  const exercise = exerciseMetadata[slug as keyof typeof exerciseMetadata];
  if (!exercise) throw new Error(`Missing exercise metadata: ${slug}`);
  const [movementFamily, aliases] = exercise;
  const [primaryMuscles, instructions] = movementMetadata[movementFamily];
  return Object.freeze({
    movementFamily,
    primaryMuscles: Object.freeze([...primaryMuscles]),
    aliases: Object.freeze([...aliases]),
    instructions: Object.freeze([...instructions]),
  });
}
