import { all } from "../db/db";

export type Review = {
  id: number;
  entity_id: number | null;
  rating: number;
  content: string;
  created_at: string;
};

export type ReviewsCursor = {
  created_at: string;
  id: number;
};

export type GetReviewsFilters = {
  entity_id?: number
  entity_ids?: number[]
  text_query?: string
  topic_id?: number
  cursor_created_at?: string
  cursor_id?: number
  limit?: number
};

export type GetReviewsByEntityIdOptions = {
  cursorCreatedAt?: string;
  cursorId?: number;
  limit?: number;
};

export type ReviewPage = {
  reviews: Review[];
  nextCursor: ReviewsCursor | null;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function sanitizeLimit(limit?: number): number {
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(limit, MAX_LIMIT);
}

type BuiltReviewQuery = {
  sql: string;
  params: Array<number | string>;
  limit: number;
};

export function buildReviewQuery(filters: GetReviewsFilters = {}): BuiltReviewQuery {
  let entityCondition: string | null = null;
  let textCondition: string | null = null;
  let cursorCondition: string | null = null;
  const params: Array<number | string> = [];

  const topicId =
    typeof filters.topic_id === "number"
    && Number.isInteger(filters.topic_id)
    && filters.topic_id > 0
      ? filters.topic_id
      : null;
  if (topicId !== null) {
    params.push(topicId);
  }

  const entityIds = [
    filters.entity_id,
    ...(Array.isArray(filters.entity_ids) ? filters.entity_ids : []),
  ].filter((id): id is number => Number.isInteger(id) && id > 0);
  const uniqueEntityIds = [...new Set(entityIds)];

  if (uniqueEntityIds.length === 1) {
    entityCondition = "r.entity_id = ?";
    params.push(uniqueEntityIds[0]);
  } else if (uniqueEntityIds.length > 1) {
    entityCondition = `r.entity_id IN (${uniqueEntityIds.map(() => "?").join(", ")})`;
    params.push(...uniqueEntityIds);
  }

  const textQuery = typeof filters.text_query === "string" ? filters.text_query.trim() : "";
  if (textQuery.length > 0) {
    textCondition = "r.content LIKE ? COLLATE NOCASE";
    params.push(`%${textQuery}%`);
  }

  const limit = sanitizeLimit(filters.limit);
  const hasCursor =
    typeof filters.cursor_created_at === "string"
    && filters.cursor_created_at.length > 0
    && typeof filters.cursor_id === "number"
    && Number.isInteger(filters.cursor_id)
    && filters.cursor_id > 0;

  if (hasCursor) {
    cursorCondition = `(
  r.created_at < ?
  OR (r.created_at = ? AND r.id < ?)
)`;
    params.push(
      filters.cursor_created_at as string,
      filters.cursor_created_at as string,
      filters.cursor_id as number,
    );
  }

  let sql = `SELECT r.*
FROM reviews r`;
  if (topicId !== null) {
    sql += `
JOIN review_topics rt
  ON rt.review_id = r.id
 AND rt.topic_id = ?`;
  }

  const whereClauses = [entityCondition, textCondition, cursorCondition].filter(
    (clause): clause is string => clause !== null,
  );
  if (whereClauses.length > 0) {
    sql += `
WHERE ${whereClauses.join(" AND ")}`;
  }

  sql += `
ORDER BY r.created_at DESC, r.id DESC
LIMIT ?;`;
  params.push(limit);

  return { sql, params, limit };
}

export async function getReviews(filters: GetReviewsFilters = {}): Promise<ReviewPage> {
  const { sql, params, limit } = buildReviewQuery(filters);

  const reviews = await all<Review>(sql, params);
  const lastRow = reviews.at(-1);
  const nextCursor =
    reviews.length === limit && lastRow
      ? {
          created_at: lastRow.created_at,
          id: lastRow.id,
        }
      : null;

  return {
    reviews,
    nextCursor,
  };
}

export async function getReviewsByEntityId(
  entityId: number,
  options: GetReviewsByEntityIdOptions = {},
  additionalEntityIds: number[] = [],
): Promise<ReviewPage> {
  const hasCursor =
    typeof options.cursorCreatedAt === "string"
    && options.cursorCreatedAt.length > 0
    && typeof options.cursorId === "number"
    && Number.isInteger(options.cursorId)
    && options.cursorId > 0;

  const sanitizedAdditionalEntityIds = Array.from(
    new Set(
      additionalEntityIds.filter(
        (id) => Number.isInteger(id) && id > 0 && id !== entityId,
      ),
    ),
  );

  const page = await getReviews({
    entity_id: entityId,
    entity_ids: sanitizedAdditionalEntityIds,
    cursor_created_at: hasCursor ? (options.cursorCreatedAt as string) : undefined,
    cursor_id: hasCursor ? (options.cursorId as number) : undefined,
    limit: options.limit,
  });

  return {
    reviews: page.reviews,
    nextCursor: page.nextCursor,
  };
}
