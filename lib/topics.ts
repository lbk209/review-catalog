import { all } from "../db/db";

export type EntityTopic = {
  id: number;
  slug: string;
  name: string;
  review_count: number;
};

export async function getEntityTopics(entityId: number): Promise<EntityTopic[]> {
  if (!Number.isInteger(entityId) || entityId <= 0) {
    return [];
  }

  return all<EntityTopic>(
    `SELECT
  t.id,
  t.slug,
  t.name,
  COUNT(*) AS review_count
FROM review_topics rt
JOIN topics t ON t.id = rt.topic_id
JOIN reviews r ON r.id = rt.review_id
WHERE r.entity_id = ?
GROUP BY t.id
ORDER BY review_count DESC
LIMIT 10;`,
    [entityId],
  );
}
