import "server-only";

import { randomInt, randomUUID } from "node:crypto";

const FIRST_ADJECTIVES = [
  "Big",
  "Bold",
  "Brave",
  "Brisk",
  "Bright",
  "Calm",
  "Clear",
  "Clever",
  "Earnest",
  "Fresh",
  "Gentle",
  "Keen",
  "Light",
  "Lively",
  "Lucky",
  "Nimble",
  "North",
  "Prime",
  "Quiet",
  "Sharp",
  "Steady",
  "Sunny",
  "Swift",
  "True",
  "Warm",
] as const;

const SECOND_ADJECTIVES = [
  "Amber",
  "Ash",
  "Blue",
  "Cedar",
  "Coral",
  "Copper",
  "Golden",
  "Green",
  "Indigo",
  "Ivory",
  "Juniper",
  "Maple",
  "Meadow",
  "Olive",
  "Pine",
  "Red",
  "River",
  "Rose",
  "Slate",
  "Silver",
  "Stone",
  "Violet",
  "White",
  "Wild",
] as const;

const ANIMALS = [
  "Badger",
  "Bear",
  "Crane",
  "Deer",
  "Falcon",
  "Finch",
  "Fox",
  "Hare",
  "Hawk",
  "Heron",
  "Kite",
  "Lark",
  "Lynx",
  "Marten",
  "Mink",
  "Moose",
  "Otter",
  "Owl",
  "Panda",
  "Raven",
  "Robin",
  "Seal",
  "Sparrow",
  "Tern",
  "Wolf",
  "Wren",
] as const;

type RandomIndex = (exclusiveMax: number) => number;

export const FRIENDLY_RESUME_SLUG_PATTERN = /^[A-Z][A-Za-z0-9]+$/;

export function createFriendlyResumeSlug(randomIndex: RandomIndex = randomInt) {
  return [
    pick(FIRST_ADJECTIVES, randomIndex),
    pick(SECOND_ADJECTIVES, randomIndex),
    pick(ANIMALS, randomIndex),
  ].join("");
}

export function createFriendlyResumeSlugFallback(baseSlug: string) {
  return `${baseSlug}${randomUUID().replace(/-/g, "").slice(0, 6)}`;
}

export function normalizeSlugForComparison(slug: string) {
  return slug.trim().toLowerCase();
}

function pick<T>(values: readonly T[], randomIndex: RandomIndex) {
  const index = randomIndex(values.length);

  if (!Number.isInteger(index) || index < 0 || index >= values.length) {
    throw new Error(`Random index ${index} is outside slug word list bounds.`);
  }

  return values[index];
}
