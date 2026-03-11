"use client";

import { FormEvent, ReactNode, createContext, useContext, useRef, useState } from "react";

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

type TopicBadge = {
  id: number;
  slug: string;
  name: string;
  review_count: number;
};

type ReviewFiltersProviderProps = {
  entityId: number;
  topics: TopicBadge[];
  initialReviews: ReviewItem[];
  initialNextCursor: ReviewsCursor | null;
  limit?: number;
  children: ReactNode;
};

type ReviewFilterContextValue = {
  topics: TopicBadge[];
  reviews: ReviewItem[];
  nextCursor: ReviewsCursor | null;
  isLoading: boolean;
  error: string;
  onLoadMore: () => Promise<void>;
  searchInput: string;
  setSearchInput: (value: string) => void;
  activeTopicId: number | null;
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onTopicClick: (topicId: number | null) => Promise<void>;
};

const ReviewFilterContext = createContext<ReviewFilterContextValue | null>(null);

function useReviewFilterContext(): ReviewFilterContextValue {
  const context = useContext(ReviewFilterContext);
  if (!context) {
    throw new Error("Review filter components must be used inside ReviewFiltersProvider.");
  }

  return context;
}

export function ReviewFiltersProvider({
  entityId,
  topics,
  initialReviews,
  initialNextCursor,
  limit = 10,
  children,
}: ReviewFiltersProviderProps) {
  const [searchInput, setSearchInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [activeTopicId, setActiveTopicId] = useState<number | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);
  const [nextCursor, setNextCursor] = useState<ReviewsCursor | null>(initialNextCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);

  async function fetchReviewPage(
    query: string,
    cursor: ReviewsCursor | null,
    append: boolean,
    topicId: number | null,
  ) {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("entity_id", String(entityId));
      params.set("limit", String(limit));

      if (query.length > 0) {
        params.set("q", query);
      }
      if (topicId !== null) {
        params.set("topic_id", String(topicId));
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
      if (requestId !== requestIdRef.current) {
        return;
      }
      setReviews((previous) => (append ? [...previous, ...page.reviews] : page.reviews));
      setNextCursor(page.nextCursor);
    } catch {
      setError("Failed to load reviews.");
    } finally {
      setIsLoading(false);
    }
  }

  async function onSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = searchInput.trim();
    setActiveQuery(nextQuery);
    setNextCursor(null);
    await fetchReviewPage(nextQuery, null, false, activeTopicId);
  }

  async function onTopicClick(topicId: number | null) {
    if (isLoading) {
      return;
    }

    setActiveTopicId(topicId);
    setNextCursor(null);
    await fetchReviewPage(activeQuery, null, false, topicId);
  }

  async function onLoadMore() {
    if (!nextCursor || isLoading) {
      return;
    }

    await fetchReviewPage(activeQuery, nextCursor, true, activeTopicId);
  }

  const contextValue: ReviewFilterContextValue = {
    topics,
    reviews,
    nextCursor,
    isLoading,
    error,
    onLoadMore,
    searchInput,
    setSearchInput,
    activeTopicId,
    onSearchSubmit,
    onTopicClick,
  };

  return (
    <ReviewFilterContext.Provider value={contextValue}>
      {children}
    </ReviewFilterContext.Provider>
  );
}

export default function ReviewFilters() {
  const {
    topics,
    searchInput,
    setSearchInput,
    activeTopicId,
    onSearchSubmit,
    onTopicClick,
  } = useReviewFilterContext();

  return (
    <div>
      {topics.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            data-topic-id=""
            data-active={activeTopicId === null ? "true" : undefined}
            onClick={() => onTopicClick(null)}
            className="rounded-md border px-3 py-1"
          >
            All
          </button>
          {topics.map((topic) => (
            <button
              key={topic.id}
              type="button"
              data-topic-id={topic.id}
              data-active={activeTopicId === topic.id ? "true" : undefined}
              onClick={() => onTopicClick(topic.id)}
              className="rounded-md border px-3 py-1"
            >
              {topic.name} ({topic.review_count})
            </button>
          ))}
        </div>
      )}

      <form onSubmit={onSearchSubmit} className="mb-4">
        <input
          type="text"
          placeholder="Search reviews..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          className="w-full rounded-md border px-3 py-2"
        />
      </form>
    </div>
  );
}

export { useReviewFilterContext };
