import { NextResponse } from "next/server";
import { all, get, query } from "@/db/db";
import { getEntityTypeByName } from "@/lib/entities";

type CreateEntityBody = {
  type?: unknown;
  slug?: unknown;
  name?: unknown;
  description?: unknown;
};

export async function GET(request: Request) {
  const SORTABLE_COLUMNS = {
    type: "t.name",
    slug: "e.slug",
    name: "e.name",
  } as const;
  const url = new URL(request.url);
  const requestedSort = url.searchParams.get("sort");
  const requestedOrder = url.searchParams.get("order");
  const sortColumn =
    requestedSort && requestedSort in SORTABLE_COLUMNS
      ? SORTABLE_COLUMNS[requestedSort as keyof typeof SORTABLE_COLUMNS]
      : null;
  const sortOrder = requestedOrder === "desc" ? "DESC" : "ASC";
  const orderByClause = sortColumn ? `${sortColumn} ${sortOrder}` : "e.id DESC";

  const entities = await all<{
    id: number;
    type: string;
    slug: string;
    name: string;
  }>(
    `SELECT e.id, t.name AS type, e.slug, e.name
FROM entities e
JOIN entity_types t ON e.type_id = t.id
ORDER BY ${orderByClause};`,
  );

  return NextResponse.json(entities, { status: 200 });
}

export async function POST(request: Request) {
  let body: CreateEntityBody;

  try {
    body = (await request.json()) as CreateEntityBody;
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const type = typeof body.type === "string" ? body.type.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  let description: string | null = null;
  if (body.description !== undefined) {
    if (body.description === null) {
      description = null;
    } else if (typeof body.description === "string") {
      description = body.description;
    } else {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
  }

  if (!type || !slug || !name) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const entityType = await getEntityTypeByName(type);
  if (!entityType) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const existing = await get<{ id: number }>(
    `SELECT id
FROM entities
WHERE type_id = ?
AND slug = ?
LIMIT 1;`,
    [entityType.id, slug],
  );

  if (existing) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    await query(
      `INSERT INTO entities
(type_id, slug, name, description)
VALUES (?, ?, ?, ?);`,
      [entityType.id, slug, name, description],
    );
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const created = await get<{
    id: number;
    slug: string;
    name: string;
    description: string | null;
  }>(
    `SELECT id, slug, name, description
FROM entities
WHERE type_id = ?
AND slug = ?
LIMIT 1;`,
    [entityType.id, slug],
  );

  if (!created) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  return NextResponse.json(
    {
      id: created.id,
      type: entityType.name,
      slug: created.slug,
      name: created.name,
      description: created.description,
    },
    { status: 201 },
  );
}
