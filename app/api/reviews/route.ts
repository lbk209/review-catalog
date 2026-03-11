import { NextResponse } from "next/server";
import { all, get, query } from "@/db/db";
import { getReviews } from "@/lib/reviews";

type CreateReviewBody = {
  entity_id?: unknown;
  entity_name?: unknown;
  entityId?: unknown;
  entityName?: unknown;
  rating?: unknown;
  content?: unknown;
};

const MAX_LIMIT = 50;

function parsePositiveInteger(value: string | null): number | null {
  if (value === null || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const entityIdRaw = url.searchParams.get("entity_id");
  const qRaw = url.searchParams.get("q");
  const textQuery = qRaw?.trim() ?? "";
  const limitRaw = url.searchParams.get("limit");
  const cursorCreatedAtRaw = url.searchParams.get("cursor_created_at");
  const cursorIdRaw = url.searchParams.get("cursor_id");

  const entityIdParsed = parsePositiveInteger(entityIdRaw);
  if (entityIdRaw !== null && entityIdParsed === null) {
    return NextResponse.json({ error: "Invalid entity_id" }, { status: 400 });
  }

  const limitParsed = parsePositiveInteger(limitRaw);
  if (limitRaw !== null && limitParsed === null) {
    return NextResponse.json({ error: "Invalid limit" }, { status: 400 });
  }

  const hasCursorCreatedAt = cursorCreatedAtRaw !== null && cursorCreatedAtRaw.trim() !== "";
  const hasCursorId = cursorIdRaw !== null && cursorIdRaw.trim() !== "";
  if (hasCursorCreatedAt !== hasCursorId) {
    return NextResponse.json(
      { error: "cursor_created_at and cursor_id must be provided together" },
      { status: 400 },
    );
  }

  const cursorIdParsed = parsePositiveInteger(cursorIdRaw);
  if (hasCursorId && cursorIdParsed === null) {
    return NextResponse.json({ error: "Invalid cursor_id" }, { status: 400 });
  }
  if (hasCursorCreatedAt && Number.isNaN(Date.parse(cursorCreatedAtRaw as string))) {
    return NextResponse.json({ error: "Invalid cursor_created_at" }, { status: 400 });
  }

  const page = await getReviews({
    entity_id: entityIdParsed ?? undefined,
    text_query: textQuery.length > 0 ? textQuery : undefined,
    limit: limitParsed !== null ? Math.min(limitParsed, MAX_LIMIT) : undefined,
    cursor_created_at: hasCursorCreatedAt ? (cursorCreatedAtRaw as string) : undefined,
    cursor_id: hasCursorId ? (cursorIdParsed as number) : undefined,
  });

  return NextResponse.json(page, { status: 200 });
}

export async function POST(request: Request) {
  let body: CreateReviewBody;

  const reviewsSchema = await all<{
    cid: number;
    name: string;
    type: string;
    notnull: number;
    dflt_value: string | null;
    pk: number;
  }>(`PRAGMA table_info(reviews);`);
  console.log("DEBUG: PRAGMA table_info(reviews):", reviewsSchema);

  try {
    body = (await request.json()) as CreateReviewBody;
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const content = typeof body.content === "string" ? body.content.trim() : "";
  const rawEntityId = body.entity_id ?? body.entityId;
  const rawEntityName = body.entity_name ?? body.entityName;

  console.log("DEBUG: rawEntityId:", rawEntityId);
  console.log("DEBUG: typeof rawEntityId:", typeof rawEntityId);
  console.log("DEBUG: rating value:", body.rating);
  console.log("DEBUG: typeof rating:", typeof body.rating);
  console.log("DEBUG: content length:", content.length);

  if (content.length < 10) {
    console.log("DEBUG: Invalid content");
    return NextResponse.json({ error: "Invalid content" }, { status: 400 });
  }

  let rating: number | null = null;
  if (body.rating !== undefined && body.rating !== null) {
    if (typeof body.rating !== "number" || !Number.isFinite(body.rating)) {
      console.log("DEBUG: Invalid rating");
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
      console.log("DEBUG: Invalid rating");
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    rating = body.rating;
  }

  const parsedEntityId =
    typeof rawEntityId === "number" && Number.isInteger(rawEntityId) && rawEntityId > 0
      ? rawEntityId
      : null;
  const hasEntityId = rawEntityId !== undefined && rawEntityId !== null;
  const hasEntityName = rawEntityName !== undefined && rawEntityName !== null;

  if (!hasEntityId && !hasEntityName) {
    console.log("DEBUG: Missing entity reference");
    return NextResponse.json({ error: "Missing entity reference" }, { status: 400 });
  }

  if (hasEntityId && parsedEntityId === null) {
    console.log("DEBUG: Invalid entity_id");
    return NextResponse.json({ error: "Invalid entity_id" }, { status: 400 });
  }

  let entityId: number | null = null;
  let entityName: string | null = null;

  try {
    if (parsedEntityId !== null) {
      const entity = await get<{ id: number }>(
        `SELECT id
FROM entities
WHERE id = ?
LIMIT 1;`,
        [parsedEntityId],
      );

      if (!entity) {
        console.log("DEBUG: Invalid entity_id");
        return NextResponse.json({ error: "Invalid entity_id" }, { status: 400 });
      }

      entityId = parsedEntityId;
    } else {
      const normalizedEntityName =
        typeof rawEntityName === "string" ? rawEntityName.trim() : "";

      if (!normalizedEntityName) {
        console.log("DEBUG: Missing entity reference");
        return NextResponse.json({ error: "Missing entity reference" }, { status: 400 });
      }

      entityName = normalizedEntityName;
    }

    await query(
      `INSERT INTO reviews
(entity_id, raw_entity_name, rating, content)
VALUES (?, ?, ?, ?);`,
      [entityId, entityName, rating, content],
    );

    const inserted = await get<{ review_id: number }>(
      `SELECT last_insert_rowid() AS review_id;`,
    );

    if (!inserted) {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json(
      {
        review_id: inserted.review_id,
        entity_id: entityId,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("DEBUG: Review insert failed:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
