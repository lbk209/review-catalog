import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { get } from "@/db/db";
import ReviewSearchBox from "@/components/ReviewSearchBox";
import { getEntityByTypeAndSlug } from "@/lib/entities";
import { getReviewsByEntityId } from "@/lib/reviews";
import { getEntityReviewTopics } from "@/lib/reviewAnalysis";

type PageProps = {
  params: Promise<{
    type: string;
    slug: string;
  }>;
};

async function resolveEntityByTypeAndSlug(type: string, slug: string) {
  const normalizedType = decodeURIComponent(type).trim();
  const normalizedSlug = decodeURIComponent(slug).trim();

  if (!normalizedType || !normalizedSlug) {
    return null;
  }

  return getEntityByTypeAndSlug(normalizedType, normalizedSlug);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { type, slug } = await params;
  const entity = await resolveEntityByTypeAndSlug(type, slug);

  if (!entity) {
    return {};
  }

  return {
    title: `${entity.name} | Review Catalog`,
    description: entity.description ?? "",
  };
}

export default async function EntityPage({ params }: PageProps) {
  const { type, slug } = await params;
  const entity = await resolveEntityByTypeAndSlug(type, slug);
  if (!entity) {
    notFound();
  }

  const [reviewPage, reviewCountRow] = await Promise.all([
    getReviewsByEntityId(entity.id, { limit: 10 }),
    get<{ count: number }>(
      `SELECT COUNT(*) AS count
FROM reviews
WHERE entity_id = ?;`,
      [entity.id],
    ),
  ]);
  const reviewCount = reviewCountRow?.count ?? 0;
  const reviewTopics = getEntityReviewTopics(entity.id, reviewPage.reviews);

  return (
    <main>
      <h1>{entity.name}</h1>
      <section className="mb-6 rounded-md border p-4">
        <h2>Entity Statistics</h2>
        <p>Review count: {reviewCount}</p>
      </section>
      <section className="mb-6 rounded-md border p-4">
        <h2>Entity Badges</h2>
        {reviewTopics.length === 0 ? (
          <p>No insights yet.</p>
        ) : (
          <ul>
            {reviewTopics.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
        )}
      </section>
      <section className="mb-6 rounded-md border p-4">
        <h2>Reviews</h2>
        <ReviewSearchBox
          entityId={entity.id}
          reviewTopics={reviewTopics}
          initialReviews={reviewPage.reviews}
          initialNextCursor={reviewPage.nextCursor}
          limit={10}
        />
      </section>
    </main>
  );
}
