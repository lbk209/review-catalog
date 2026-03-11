import { NextResponse } from "next/server";
import { getEntityByTypeAndSlug, getEntityTypeByName } from "@/lib/entities";

type RouteContext = {
  params: Promise<{
    type: string;
    slug: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const type = params.type?.trim();
  const slug = params.slug?.trim();

  if (!type || !slug) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const entityType = await getEntityTypeByName(type);
  if (!entityType) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const entity = await getEntityByTypeAndSlug(entityType.name, slug);
  if (!entity) {
    return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      id: entity.id,
      type: entityType.name,
      slug: entity.slug,
      name: entity.name,
      description: entity.description,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    },
    { status: 200 },
  );
}
