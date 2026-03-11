PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO topics (slug, name) VALUES
('taste','Taste'),
('price','Price'),
('delivery','Delivery'),
('packaging','Packaging'),
('service','Service');

DROP TABLE IF EXISTS temp.eligible_entities;
CREATE TEMP TABLE eligible_entities AS
SELECT e.id, e.slug
FROM entities e
JOIN entity_types t ON t.id = e.type_id
WHERE e.slug LIKE 'test-entity-%'
  AND t.is_reviewable = 1;

DROP TABLE IF EXISTS temp.generated_rows;
CREATE TEMP TABLE generated_rows (
  n INTEGER PRIMARY KEY,
  primary_slug TEXT NOT NULL,
  secondary_slug TEXT,
  rating INTEGER NOT NULL,
  content TEXT NOT NULL UNIQUE
);

WITH RECURSIVE seq(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 60
)
INSERT INTO generated_rows (n, primary_slug, secondary_slug, rating, content)
SELECT
  n,
  CASE ((n - 1) % 5)
    WHEN 0 THEN 'taste'
    WHEN 1 THEN 'price'
    WHEN 2 THEN 'delivery'
    WHEN 3 THEN 'packaging'
    ELSE 'service'
  END AS primary_slug,
  CASE
    WHEN (n % 10) IN (0, 3, 6) THEN
      CASE ((n - 1) % 5)
        WHEN 0 THEN 'price'
        WHEN 1 THEN 'taste'
        WHEN 2 THEN 'service'
        WHEN 3 THEN 'service'
        ELSE 'delivery'
      END
    ELSE NULL
  END AS secondary_slug,
  CASE ((n - 1) % 5)
    WHEN 0 THEN 5
    WHEN 1 THEN CASE WHEN (n % 2) = 0 THEN 4 ELSE 2 END
    WHEN 2 THEN CASE WHEN (n % 2) = 0 THEN 5 ELSE 3 END
    WHEN 3 THEN CASE WHEN (n % 2) = 0 THEN 4 ELSE 3 END
    ELSE 5
  END AS rating,
  CASE ((n - 1) % 5)
    WHEN 0 THEN
      '[synthetic-topic-seed-v2 #' || printf('%02d', n) || '] '
      || CASE WHEN (n % 2) = 0
           THEN 'The flavor was excellent and memorable.'
           ELSE 'Great taste, I would order again.'
         END
    WHEN 1 THEN
      '[synthetic-topic-seed-v2 #' || printf('%02d', n) || '] '
      || CASE WHEN (n % 2) = 0
           THEN 'The price felt reasonable for the quality.'
           ELSE 'Too expensive for what you get.'
         END
    WHEN 2 THEN
      '[synthetic-topic-seed-v2 #' || printf('%02d', n) || '] '
      || CASE WHEN (n % 2) = 0
           THEN 'Delivery arrived faster than expected.'
           ELSE 'Shipping took longer than expected.'
         END
    WHEN 3 THEN
      '[synthetic-topic-seed-v2 #' || printf('%02d', n) || '] '
      || CASE WHEN (n % 2) = 0
           THEN 'The packaging was secure and well designed.'
           ELSE 'The packaging could be improved.'
         END
    ELSE
      '[synthetic-topic-seed-v2 #' || printf('%02d', n) || '] '
      || CASE WHEN (n % 2) = 0
           THEN 'Customer service was helpful and responsive.'
           ELSE 'Support resolved the issue quickly.'
         END
  END AS content
FROM seq;

INSERT INTO reviews (entity_id, raw_entity_name, rating, content, created_at)
SELECT
  (SELECT id FROM eligible_entities ORDER BY random() LIMIT 1) AS entity_id,
  NULL AS raw_entity_name,
  g.rating,
  g.content,
  CURRENT_TIMESTAMP
FROM generated_rows g
WHERE EXISTS (SELECT 1 FROM eligible_entities)
  AND NOT EXISTS (
    SELECT 1
    FROM reviews r
    WHERE r.content = g.content
  );

INSERT OR IGNORE INTO review_topics (review_id, topic_id)
SELECT r.id, t.id
FROM reviews r
JOIN generated_rows g ON g.content = r.content
JOIN topics t ON t.slug = g.primary_slug;

INSERT OR IGNORE INTO review_topics (review_id, topic_id)
SELECT r.id, t.id
FROM reviews r
JOIN generated_rows g ON g.content = r.content
JOIN topics t ON t.slug = g.secondary_slug
WHERE g.secondary_slug IS NOT NULL;
