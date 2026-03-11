PRAGMA foreign_keys = ON;

CREATE TABLE reviews_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id INTEGER,
  raw_entity_name TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

INSERT INTO reviews_new (id, entity_id, raw_entity_name, rating, content, created_at)
SELECT id, entity_id, NULL, rating, content, created_at
FROM reviews;

DROP TABLE reviews;

ALTER TABLE reviews_new RENAME TO reviews;

CREATE INDEX idx_reviews_entity_id
ON reviews(entity_id);
