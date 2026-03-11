PRAGMA foreign_keys = ON;

BEGIN;

ATTACH DATABASE 'migrations/entity-driven-app.sqlite' AS old_db;

CREATE TEMP TABLE entity_id_map (
  old_id INTEGER PRIMARY KEY,
  new_id INTEGER NOT NULL
);

INSERT INTO entities (
  type_id,
  slug,
  name,
  description,
  created_at,
  updated_at
)
SELECT
  et.id AS type_id,
  TRIM(n.slug) AS slug,
  TRIM(n.name) AS name,
  n.description,
  COALESCE(
    NULLIF(TRIM(n.created_at), ''),
    NULLIF(TRIM(n.updated_at), ''),
    CURRENT_TIMESTAMP
  ) AS created_at,
  COALESCE(
    NULLIF(TRIM(n.updated_at), ''),
    NULLIF(TRIM(n.created_at), ''),
    CURRENT_TIMESTAMP
  ) AS updated_at
FROM old_db.nodes AS n
JOIN entity_types AS et
  ON et.name = TRIM(n.type)
WHERE
  TRIM(n.name) <> ''
  AND TRIM(n.slug) <> ''
ON CONFLICT(type_id, slug) DO NOTHING;

INSERT INTO entity_id_map (old_id, new_id)
SELECT
  n.id AS old_id,
  e.id AS new_id
FROM old_db.nodes AS n
JOIN entity_types AS et
  ON et.name = TRIM(n.type)
JOIN entities AS e
  ON e.type_id = et.id
  AND e.slug = TRIM(n.slug);

INSERT INTO reviews (
  entity_id,
  raw_entity_name,
  content,
  rating,
  created_at
)
SELECT
  map.new_id AS entity_id,
  TRIM(r.entity_name) AS raw_entity_name,
  TRIM(r.content) AS content,
  NULL AS rating,
  r.created_at
FROM old_db.review AS r
JOIN entity_id_map AS map
  ON map.old_id = r.entity_id
JOIN entities AS e
  ON e.id = map.new_id
JOIN entity_types AS t
  ON t.id = e.type_id
WHERE
  r.entity_id IS NOT NULL
  AND t.is_reviewable = 1;

COMMIT;

SELECT COUNT(*) AS entities_count FROM entities;
SELECT COUNT(*) AS reviews_count FROM reviews;
SELECT COUNT(*) AS skipped_reviews_null_entity_id
FROM old_db.review
WHERE entity_id IS NULL;
SELECT COUNT(*) AS mapped_entities_count FROM entity_id_map;
SELECT COUNT(*) AS migrated_reviews_count
FROM old_db.review AS r
JOIN entity_id_map AS map
  ON map.old_id = r.entity_id
JOIN entities AS e
  ON e.id = map.new_id
JOIN entity_types AS t
  ON t.id = e.type_id
WHERE
  r.entity_id IS NOT NULL
  AND t.is_reviewable = 1;

DETACH DATABASE old_db;
