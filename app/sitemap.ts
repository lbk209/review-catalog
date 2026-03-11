import type { MetadataRoute } from "next";
import { all } from "@/db/db";

type SitemapEntityRow = {
  slug: string;
  type: string;
  updated_at: string;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const entities = await all<SitemapEntityRow>(
    `SELECT e.slug, t.name AS type, e.updated_at
     FROM entities e
     JOIN entity_types t ON e.type_id = t.id;`,
  );

  const homeEntry: MetadataRoute.Sitemap[number] = {
    url: new URL("/", baseUrl).toString(),
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1,
  };

  const entityEntries: MetadataRoute.Sitemap = entities.map((entity) => ({
    url: new URL(`/entities/${entity.type}/${entity.slug}`, baseUrl).toString(),
    lastModified: new Date(entity.updated_at),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [homeEntry, ...entityEntries];
}
