import path from "node:path";
import sqlite3 from "sqlite3";

type GlobalWithSqlite = typeof globalThis & {
  __reviewCatalogDb?: sqlite3.Database;
  __reviewCatalogDbReady?: Promise<void>;
};

const globalForSqlite = globalThis as GlobalWithSqlite;
const dbPath = path.join(process.cwd(), "db", "dev.db");

if (!globalForSqlite.__reviewCatalogDb) {
  globalForSqlite.__reviewCatalogDb = new sqlite3.Database(dbPath);
}
const db = globalForSqlite.__reviewCatalogDb;

const dbReady =
  globalForSqlite.__reviewCatalogDbReady ??
  new Promise<void>((resolve, reject) => {
    db.run("PRAGMA foreign_keys = ON;", (error) => {
      if (error) {
        reject(error);
        return;
      }

      db.run("PRAGMA busy_timeout = 5000;", (busyError) => {
        if (busyError) {
          reject(busyError);
          return;
        }

        resolve();
      });
    });
  });

if (!globalForSqlite.__reviewCatalogDbReady) {
  globalForSqlite.__reviewCatalogDbReady = dbReady;
}

export async function query(sql: string, params: any[] = []): Promise<void> {
  await dbReady;

  return new Promise<void>((resolve, reject) => {
    db.run(sql, params, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

export async function get<T>(
  sql: string,
  params: any[] = [],
): Promise<T | undefined> {
  await dbReady;

  return new Promise<T | undefined>((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(row as T | undefined);
    });
  });
}

export async function all<T>(sql: string, params: any[] = []): Promise<T[]> {
  await dbReady;

  return new Promise<T[]>((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows as T[]);
    });
  });
}
