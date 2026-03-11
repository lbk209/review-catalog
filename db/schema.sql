PRAGMA foreign_keys = ON;

CREATE TABLE entity_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_reviewable INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO entity_types (name, is_reviewable) VALUES
  ('product', 1),
  ('service', 1),
  ('place', 1),
  ('brand', 0);

CREATE TABLE entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type_id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (type_id, slug),
  FOREIGN KEY (type_id) REFERENCES entity_types(id)
);

CREATE TABLE relation_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO relation_types (name) VALUES
  ('belongs_to_brand'),
  ('owned_by'),
  ('located_in');

CREATE TABLE relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_entity_id INTEGER NOT NULL,
  to_entity_id INTEGER NOT NULL,
  relation_type_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (from_entity_id, to_entity_id, relation_type_id),
  FOREIGN KEY (from_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
  FOREIGN KEY (to_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
  FOREIGN KEY (relation_type_id) REFERENCES relation_types(id)
);

CREATE TABLE reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id INTEGER,
  raw_entity_name TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

CREATE TABLE topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE review_topics (
  review_id INTEGER NOT NULL,
  topic_id INTEGER NOT NULL,
  PRIMARY KEY (review_id, topic_id),
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id)
);

CREATE TABLE entity_slug_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id INTEGER NOT NULL,
  old_slug TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

CREATE INDEX idx_reviews_entity_id
ON reviews(entity_id);

CREATE INDEX idx_review_topics_topic
ON review_topics(topic_id);

CREATE INDEX idx_review_topics_review
ON review_topics(review_id);

CREATE INDEX idx_relations_from_entity
ON relations(from_entity_id);

CREATE INDEX idx_relations_to_entity
ON relations(to_entity_id);
