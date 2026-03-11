import { get } from "../db/db";

export type Entity = {
  id: number;
  type_id: number;
  slug: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type EntityWithType = Entity & {
  type: string;
};

export type EntityType = {
  id: number;
  name: string;
  is_reviewable: number;
  created_at: string;
};

export type HistoricalEntityLookup = {
  id: number;
  slug: string;
  name: string;
  type: string;
};

export async function getEntityByTypeAndSlug(
  type: string,
  slug: string,
): Promise<EntityWithType | null> {
  const entity = await get<EntityWithType>(
    `SELECT e.*,
            t.name AS type
     FROM entities e
     JOIN entity_types t ON e.type_id = t.id
     WHERE t.name = ?
       AND e.slug = ?
     LIMIT 1;`,
    [type, slug],
  );

  return entity ?? null;
}

export async function getEntityTypeByName(type: string): Promise<EntityType | null> {
  const row = await get<EntityType>(
    `SELECT *
FROM entity_types
WHERE name = ?
LIMIT 1;`,
    [type],
  );

  return row ?? null;
}

export async function getEntityByOldSlug(oldSlug: string): Promise<HistoricalEntityLookup | null> {
  const row = await get<HistoricalEntityLookup>(
    `SELECT e.id,
            e.slug,
            e.name,
            t.name AS type
     FROM entity_slug_history h
     JOIN entities e ON e.id = h.entity_id
     JOIN entity_types t ON t.id = e.type_id
     WHERE h.old_slug = ?
     LIMIT 1;`,
    [oldSlug],
  );

  return row ?? null;
}
