"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type EntityListItem = {
  id: number;
  type: string;
  slug: string;
  name: string;
};
type EntitySortField = "type" | "slug" | "name";
type EntitySortOrder = "asc" | "desc";

const ENTITY_TYPES = ["product", "service", "place", "brand"] as const;

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("entity");
  const [entityType, setEntityType] = useState<(typeof ENTITY_TYPES)[number]>("product");
  const [entitySlug, setEntitySlug] = useState("");
  const [entityName, setEntityName] = useState("");
  const [entityDescription, setEntityDescription] = useState("");
  const [entityMessage, setEntityMessage] = useState("");
  const [isEntitySubmitting, setIsEntitySubmitting] = useState(false);

  const [entities, setEntities] = useState<EntityListItem[]>([]);
  const [entityListMessage, setEntityListMessage] = useState("");
  const [entitySortField, setEntitySortField] = useState<EntitySortField | null>(null);
  const [entitySortOrder, setEntitySortOrder] = useState<EntitySortOrder>("asc");

  const [reviewEntityId, setReviewEntityId] = useState("");
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewContent, setReviewContent] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

  const loadEntities = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (entitySortField) {
        params.set("sort", entitySortField);
        params.set("order", entitySortOrder);
      }

      const queryString = params.toString();
      const response = await fetch(`/api/entities${queryString ? `?${queryString}` : ""}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        setEntityListMessage("Failed to load entities.");
        return;
      }

      const data = (await response.json()) as EntityListItem[];
      setEntities(data);
      setEntityListMessage("");
    } catch {
      setEntityListMessage("Failed to load entities.");
    }
  }, [entitySortField, entitySortOrder]);

  useEffect(() => {
    void loadEntities();
  }, [loadEntities]);

  function handleSort(field: EntitySortField) {
    if (entitySortField === field) {
      setEntitySortOrder((previousOrder) => (previousOrder === "asc" ? "desc" : "asc"));
      return;
    }

    setEntitySortField(field);
    setEntitySortOrder("asc");
  }

  function getSortIndicator(field: EntitySortField) {
    if (entitySortField !== field) {
      return "";
    }

    return entitySortOrder === "asc" ? " ▲" : " ▼";
  }

  async function handleCreateEntity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEntityMessage("");
    setIsEntitySubmitting(true);

    try {
      const response = await fetch("/api/entities", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: entityType,
          slug: entitySlug,
          name: entityName,
          description: entityDescription,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setEntityMessage(payload.error ?? "Failed to create entity.");
        return;
      }

      setEntityType("product");
      setEntitySlug("");
      setEntityName("");
      setEntityDescription("");
      setEntityMessage("Entity created.");
      await loadEntities();
    } catch {
      setEntityMessage("Failed to create entity.");
    } finally {
      setIsEntitySubmitting(false);
    }
  }

  async function handleCreateReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReviewMessage("");
    setIsReviewSubmitting(true);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          entityId: Number(reviewEntityId),
          rating: Number(reviewRating),
          content: reviewContent,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setReviewMessage(payload.error ?? "Failed to create review.");
        return;
      }

      setReviewEntityId("");
      setReviewRating("5");
      setReviewContent("");
      setReviewMessage("Review created.");
    } catch {
      setReviewMessage("Failed to create review.");
    } finally {
      setIsReviewSubmitting(false);
    }
  }

  return (
    <div className="admin-container">
      <div className="admin-tabs">
        <button
          className={`tab-button${activeTab === "entity" ? " active" : ""}`}
          type="button"
          onClick={() => setActiveTab("entity")}
        >
          Create Entity
        </button>
        <button
          className={`tab-button${activeTab === "list" ? " active" : ""}`}
          type="button"
          onClick={() => setActiveTab("list")}
        >
          Manage Entities
        </button>
        <button
          className={`tab-button${activeTab === "review" ? " active" : ""}`}
          type="button"
          onClick={() => setActiveTab("review")}
        >
          Create Review
        </button>
      </div>

      {activeTab === "entity" && (
        <section className="admin-card">
          <h2>Create Entity</h2>
          <form onSubmit={handleCreateEntity}>
            <div className="form-group">
              <label htmlFor="entity-type">Type</label>
              <select
                id="entity-type"
                value={entityType}
                onChange={(event) => setEntityType(event.target.value as (typeof ENTITY_TYPES)[number])}
              >
                {ENTITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="entity-slug">Slug</label>
              <input
                id="entity-slug"
                type="text"
                value={entitySlug}
                onChange={(event) => setEntitySlug(event.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="entity-name">Name</label>
              <input
                id="entity-name"
                type="text"
                value={entityName}
                onChange={(event) => setEntityName(event.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="entity-description">Description</label>
              <textarea
                id="entity-description"
                value={entityDescription}
                onChange={(event) => setEntityDescription(event.target.value)}
              />
            </div>
            <div className="form-actions">
              <button type="submit" disabled={isEntitySubmitting}>
                Create Entity
              </button>
            </div>
          </form>
          {entityMessage && <p>{entityMessage}</p>}
        </section>
      )}

      {activeTab === "list" && (
        <section className="admin-card">
          <h2>Entities</h2>
          {entityListMessage && <p>{entityListMessage}</p>}
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>
                  <button className="sort-button" type="button" onClick={() => handleSort("type")}>
                    Type{getSortIndicator("type")}
                  </button>
                </th>
                <th>
                  <button className="sort-button" type="button" onClick={() => handleSort("slug")}>
                    Slug{getSortIndicator("slug")}
                  </button>
                </th>
                <th>
                  <button className="sort-button" type="button" onClick={() => handleSort("name")}>
                    Name{getSortIndicator("name")}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {entities.map((entity) => (
                <tr key={entity.id}>
                  <td>{entity.id}</td>
                  <td>{entity.type}</td>
                  <td>{entity.slug}</td>
                  <td>{entity.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {activeTab === "review" && (
        <section className="admin-card">
          <h2>Create Review</h2>
          <form onSubmit={handleCreateReview}>
            <div className="form-group">
              <label htmlFor="review-entity-id">Entity ID</label>
              <input
                id="review-entity-id"
                type="number"
                value={reviewEntityId}
                onChange={(event) => setReviewEntityId(event.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="review-rating">Rating</label>
              <input
                id="review-rating"
                type="number"
                min={1}
                max={5}
                value={reviewRating}
                onChange={(event) => setReviewRating(event.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="review-content">Content</label>
              <textarea
                id="review-content"
                value={reviewContent}
                onChange={(event) => setReviewContent(event.target.value)}
              />
            </div>
            <div className="form-actions">
              <button type="submit" disabled={isReviewSubmitting}>
                Create Review
              </button>
            </div>
          </form>
          {reviewMessage && <p>{reviewMessage}</p>}
        </section>
      )}

      <style jsx>{`
        .admin-container {
          max-width: 900px;
          margin: 40px auto;
          padding: 0 20px;
        }

        .admin-tabs {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }

        .admin-card {
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 24px;
          margin-bottom: 32px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          margin-bottom: 16px;
        }

        input,
        select,
        textarea {
          padding: 8px 10px;
          border: 1px solid #ccc;
          border-radius: 4px;
          width: 100%;
          box-sizing: border-box;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
        }

        button {
          padding: 8px 16px;
          border-radius: 4px;
          border: none;
          background: #111;
          color: white;
          cursor: pointer;
        }

        button:disabled {
          background: #888;
          cursor: not-allowed;
        }

        .tab-button {
          background: transparent;
          border: none;
          padding: 8px 12px;
          cursor: pointer;
          font-weight: 500;
          color: #111;
        }

        .tab-button.active {
          border-bottom: 2px solid #111;
        }

        .sort-button {
          background: transparent;
          border: none;
          color: inherit;
          font: inherit;
          cursor: pointer;
          padding: 0;
          text-align: left;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th,
        td {
          border-bottom: 1px solid #eee;
          padding: 8px;
          text-align: left;
        }

        h2 {
          margin-bottom: 16px;
        }
      `}</style>
    </div>
  );
}
