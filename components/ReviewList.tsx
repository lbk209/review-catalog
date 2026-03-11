"use client";

import { useReviewFilterContext } from "@/components/ReviewFilters";

export default function ReviewList() {
  const {
    reviews,
    nextCursor,
    isLoading,
    error,
    onLoadMore,
  } = useReviewFilterContext();

  return (
    <div>
      {error && <p>{error}</p>}
      {reviews.length === 0 ? (
        <p>No reviews yet.</p>
      ) : (
        <ul>
          {reviews.map((review) => (
            <li key={review.id}>
              {review.content}
            </li>
          ))}
        </ul>
      )}

      {nextCursor && (
        <div className="mt-4">
          <button
            type="button"
            onClick={onLoadMore}
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
