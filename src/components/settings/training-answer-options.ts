import type { DaysPerWeek, ExperienceLevel, TrainingGoal } from "@/domain/programs/generate-routine";

/** The training questions and their answers, worded the same way as onboarding. */
export const TRAINING_GOAL_OPTIONS: ReadonlyArray<readonly [TrainingGoal, string, string]> = [
  ["strength", "Get stronger", "Lift heavier over time."],
  ["muscle", "Build muscle", "Grow and shape your muscles."],
  ["general", "Feel fitter overall", "Move well and feel good."],
  ["fat_loss", "Lose fat", "Lift, plus a walk or run to finish."],
  ["sport", "Train for a sport or event", "Strength with extra core work."],
];

export const EXPERIENCE_OPTIONS: ReadonlyArray<readonly [ExperienceLevel, string, string]> = [
  ["new", "I'm new to this", "Under 6 months of lifting."],
  ["some", "Some", "6 months to 2 years."],
  ["lots", "Lots", "More than 2 years."],
];

export const DAYS_PER_WEEK_CHOICES: ReadonlyArray<readonly [DaysPerWeek, string, string]> = [
  [2, "2 days", ""],
  [3, "3 days", ""],
  [4, "4 days", ""],
  [5, "5 days", ""],
];
