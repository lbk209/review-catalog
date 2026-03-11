import { NextResponse } from "next/server";
import { get, query } from "@/db/db";

type UpdateEntityBody = {
  name?: unknown;
  description?: unknown;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const params = await context.params;
  const idRaw = params.id?.trim();
  const id = idRaw ? Number.parseInt(idRaw, 10) : Number.NaN;

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  let body: UpdateEntityBody;
  try {
    body = (await request.json()) as UpdateEntityBody;
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const hasName = Object.prototype.hasOwnProperty.call(body, "name");
  const hasDescription = Object.prototype.hasOwnProperty.call(body, "description");

  if (!hasName && !hasDescription) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const nameValue = body.name;
  if (hasName && typeof nameValue !== "string") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const nextName = hasName && typeof nameValue === "string" ? nameValue.trim() : undefined;
  if (hasName && !nextName) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (
    hasDescription
    && !(typeof body.description === "string" || body.description === null)
  ) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const existing = await get<{ id: number; name: string; description: string | null }>(
    `SELECT id, name, description
FROM entities
WHERE id = ?
LIMIT 1;`,
    [id],
  );

  if (!existing) {
    return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  }

  const finalName = hasName ? nextName ?? existing.name : existing.name;
  const finalDescription = hasDescription
    ? (body.description as string | null)
    : existing.description;

  await query(
    `UPDATE entities
SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
WHERE id = ?;`,
    [finalName, finalDescription, id],
  );

  const updated = await get<{ id: number; name: string; description: string | null }>(
    `SELECT id, name, description
FROM entities
WHERE id = ?
LIMIT 1;`,
    [id],
  );

  if (!updated) {
    return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      id: updated.id,
      name: updated.name,
      description: updated.description,
    },
    { status: 200 },
  );
}
