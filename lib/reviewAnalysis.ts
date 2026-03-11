import type { Review } from "@/lib/reviews";

export function getEntityReviewTopics(entityId: number, reviews: Review[]): string[] {
  // Keep the parameter in the contract for future DB-backed implementations.
  void entityId;

  const frequency = new Map<string, number>();

  for (const review of reviews) {
    const tokens = review.content
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 2);

    for (const token of tokens) {
      frequency.set(token, (frequency.get(token) ?? 0) + 1);
    }
  }

  return [...frequency.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }

      return a[0].localeCompare(b[0]);
    })
    .slice(0, 5)
    .map(([token]) => token);
}
