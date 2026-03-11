"use client";

import { FormEvent, useMemo, useState } from "react";

type ReviewItem = {
  id: number;
  content: string;
};

type ReviewsCursor = {
  created_at: string;
  id: number;
};

type ReviewPageResponse = {
  reviews: ReviewItem[];
  nextCursor: ReviewsCursor | null;
};

type ReviewSearchBoxProps = {
  entityId: number;
  reviewTopics: string[];
  initialReviews: ReviewItem[];
  initialNextCursor: ReviewsCursor | null;
  limit?: number;
};

// TODO: Representative review selection currently runs on the client.
// When the topic/badge system is implemented, this logic should move
// back to the server so that the initial entity narrative is fully SSR.
function selectRepresentativeReviewIds(topics: string[], reviews: ReviewItem[]): Set<number> {
  const selectedIds = new Set<number>();

  for (const topic of topics) {
    const normalizedTopic = topic.toLowerCase();
    const matched = reviews.find((review) => {
      if (selectedIds.has(review.id)) {
        return false;
      }

      return review.content.toLowerCase().includes(normalizedTopic);
    });

    if (!matched) {
      continue;
    }

    selectedIds.add(matched.id);
  }

  return selectedIds;
}

export default function ReviewSearchBox({
  entityId,
  reviewTopics,
  initialReviews,
  initialNextCursor,
  limit = 10,
}: ReviewSearchBoxProps) {
  const [searchInput, setSearchInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);
  const [nextCursor, setNextCursor] = useState<ReviewsCursor | null>(initialNextCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const representativeReviewIds = useMemo(
    () => selectRepresentativeReviewIds(reviewTopics, reviews),
    [reviewTopics, reviews],
  );
  const orderedReviews = useMemo(() => {
    if (reviewTopics.length === 0 || reviews.length === 0) {
      return reviews;
    }

    const representative = reviews.filter((review) => representativeReviewIds.has(review.id));
    const rest = reviews.filter((review) => !representativeReviewIds.has(review.id));
    return [...representative, ...rest];
  }, [reviewTopics, reviews, representativeReviewIds]);

  async function fetchReviewPage(query: string, cursor: ReviewsCursor | null, append: boolean) {
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("entity_id", String(entityId));
      params.set("limit", String(limit));

      if (query.length > 0) {
        params.set("q", query);
      }

      if (cursor) {
        params.set("cursor_created_at", cursor.created_at);
        params.set("cursor_id", String(cursor.id));
      }

      const response = await fetch(`/api/reviews?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) {
        setError("Failed to load reviews.");
        return;
      }

      const page = (await response.json()) as ReviewPageResponse;
      setReviews((previous) => (append ? [...previous, ...page.reviews] : page.reviews));
      setNextCursor(page.nextCursor);
    } catch {
      setError("Failed to load reviews.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = searchInput.trim();
    setActiveQuery(nextQuery);
    await fetchReviewPage(nextQuery, null, false);
  }

  async function handleLoadMore() {
    if (!nextCursor || isLoading) {
      return;
    }

    await fetchReviewPage(activeQuery, nextCursor, true);
  }

  return (
    <div>
      <form onSubmit={handleSearchSubmit} className="mb-4">
        <input
          type="text"
          placeholder="Search reviews..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          className="w-full rounded-md border px-3 py-2"
        />
      </form>

      {error && <p>{error}</p>}

      {orderedReviews.length === 0 ? (
        <p>No reviews yet.</p>
      ) : (
        <ul>
          {orderedReviews.map((review) => {
            const matchedTopics = reviewTopics.filter((topic) =>
              review.content.toLowerCase().includes(topic.toLowerCase()),
            );
            const isRepresentative = representativeReviewIds.has(review.id);

            return (
              <li
                key={review.id}
                data-representative={isRepresentative ? "true" : undefined}
                data-topics={matchedTopics.join(" ")}
              >
                {review.content}
              </li>
            );
          })}
        </ul>
      )}

      {nextCursor && (
        <div className="mt-4">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoading}
            className="rounded-md border px-3 py-2"
          >
            {isLoading ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
