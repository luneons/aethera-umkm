"use client";

import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import { SCHEMA_SQL, SEED_CATEGORIES, COLUMN_MIGRATIONS } from "./schema.sql";

const DB_NAME =
  process.env.NEXT_PUBLIC_DB_NAME?.replace(/\.db$/, "") || "aethera_umkm";
const IDB_NAME = "aethera-umkm-store";
const IDB_STORE = "sqlite";
const IDB_KEY = "database";

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;
let initPromise: Promise<Database> | null = null;
let wasmBinary: ArrayBuffer | null = null;

/**
 * Load the SQLite WASM binary ourselves and hand it to sql.js as `wasmBinary`.
 * This avoids `WebAssembly.instantiateStreaming`, which fails when the dev
 * server serves the .wasm with a non-"application/wasm" MIME type.
 */
async function getSqlJs(): Promise<SqlJsStatic> {
  if (SQL) return SQL;
  if (!wasmBinary) {
    const res = await fetch("/sql-wasm/sql-wasm.wasm");
    if (!res.ok) {
      throw new Error(`Gagal memuat sql-wasm.wasm (HTTP ${res.status})`);
    }
    wasmBinary = await res.arrayBuffer();
  }
  SQL = await initSqlJs({
    wasmBinary,
    locateFile: (file: string) => `/sql-wasm/${file}`,
  });
  return SQL;
}

/* ----------------------------- IndexedDB I/O ----------------------------- */

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const idb = req.result;
      if (!idb.objectStoreNames.contains(IDB_STORE)) {
        idb.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadFromIndexedDB(): Promise<Uint8Array | null> {
  try {
    const idb = await openIndexedDB();
    return await new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_KEY);
      req.onsuccess = () => {
        const val = req.result;
        resolve(val ? new Uint8Array(val) : null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function saveToIndexedDB(data: Uint8Array): Promise<void> {
  const idb = await openIndexedDB();
  await new Promise<void>((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    // Store a copy of the buffer to avoid detached-buffer issues.
    store.put(data.slice(0), IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ------------------------------ Migrations ------------------------------- */

function runMigrations(database: Database) {
  database.run(SCHEMA_SQL);

  // Apply additive column migrations (ignore "duplicate column" errors).
  for (const sql of COLUMN_MIGRATIONS) {
    try {
      database.run(sql);
    } catch {
      /* column already exists */
    }
  }

  // Seed default categories only when the table is empty.
  const res = database.exec("SELECT COUNT(*) AS c FROM categories");
  const count = res.length ? Number(res[0].values[0][0]) : 0;
  if (count === 0) {
    const stmt = database.prepare(
      "INSERT INTO categories (name, type, color, icon) VALUES (?, ?, ?, ?)"
    );
    for (const c of SEED_CATEGORIES) {
      stmt.run([c.name, c.type, c.color, c.icon]);
    }
    stmt.free();
  }
}

/* -------------------------------- Public --------------------------------- */

export async function getDB(): Promise<Database> {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const sql = await getSqlJs();
    const saved = await loadFromIndexedDB();
    db = saved ? new sql.Database(saved) : new sql.Database();
    runMigrations(db);
    if (!saved) await saveDB();
    return db;
  })();

  return initPromise;
}

/** Persist the in-memory database to IndexedDB. */
export async function saveDB(): Promise<void> {
  if (!db) return;
  const data = db.export();
  await saveToIndexedDB(data);
}

/** Run a query and return rows as objects. */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const database = await getDB();
  const stmt = database.prepare(sql);
  stmt.bind(params as never[]);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

/** Run a write statement, persist, and return the last inserted row id. */
export async function execute(
  sql: string,
  params: unknown[] = []
): Promise<number> {
  const database = await getDB();
  const stmt = database.prepare(sql);
  stmt.bind(params as never[]);
  stmt.step();
  stmt.free();
  const idRes = database.exec("SELECT last_insert_rowid() AS id");
  const lastId = idRes.length ? Number(idRes[0].values[0][0]) : 0;
  await saveDB();
  return lastId;
}

/** Replace the entire database from an exported byte array (restore). */
export async function importDatabase(data: Uint8Array): Promise<void> {
  // Validate SQLite magic bytes: first 16 bytes must be "SQLite format 3\000"
  const MAGIC = [83,81,76,105,116,101,32,102,111,114,109,97,116,32,51,0];
  if (data.length < 512) throw new Error("File backup tidak valid: terlalu kecil");
  for (let i = 0; i < MAGIC.length; i++) {
    if (data[i] !== MAGIC[i]) throw new Error("File backup tidak valid: bukan file SQLite");
  }

  const sql = await getSqlJs();
  // Validate by attempting to open and read a known table.
  const candidate = new sql.Database(data);
  try {
    candidate.exec("SELECT count(*) FROM sqlite_master");
  } catch {
    candidate.close();
    throw new Error("File backup tidak valid: tidak dapat dibaca");
  }
  if (db) db.close();
  db = candidate;
  runMigrations(db);
  await saveDB();
}

/** Export the database as bytes (for backup download). */
export async function exportDatabase(): Promise<Uint8Array> {
  const database = await getDB();
  return database.export();
}

/** Wipe all data and reinitialize an empty database. */
export async function resetDatabase(): Promise<void> {
  const sql = await getSqlJs();
  if (db) db.close();
  db = new sql.Database();
  runMigrations(db);
  await saveDB();
}

export { DB_NAME };
