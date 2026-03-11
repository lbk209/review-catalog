PRAGMA foreign_keys=OFF;

ALTER TABLE review_topics RENAME TO review_topics_old;

CREATE TABLE review_topics (
  review_id INTEGER NOT NULL,
  topic_id INTEGER NOT NULL,
  PRIMARY KEY (review_id, topic_id),
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id)
);

INSERT INTO review_topics (review_id, topic_id)
SELECT review_id, topic_id
FROM review_topics_old;

DROP TABLE review_topics_old;

CREATE INDEX idx_review_topics_topic
ON review_topics(topic_id);

CREATE INDEX idx_review_topics_review
ON review_topics(review_id);

PRAGMA foreign_keys=ON;
