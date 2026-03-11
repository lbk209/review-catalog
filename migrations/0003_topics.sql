PRAGMA foreign_keys = ON;

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
  FOREIGN KEY (review_id) REFERENCES reviews(id),
  FOREIGN KEY (topic_id) REFERENCES topics(id)
);

CREATE INDEX idx_review_topics_topic
ON review_topics(topic_id);

CREATE INDEX idx_review_topics_review
ON review_topics(review_id);
