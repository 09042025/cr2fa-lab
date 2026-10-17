import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const globalForDb = globalThis as unknown as { __db?: Database.Database };

function open(): Database.Database {
  const file = process.env.DATABASE_PATH || "./data/cr2fa.db";
  if (file !== ":memory:") fs.mkdirSync(/* turbopackIgnore: true */ path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
      plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro')),
      plan_expires_at INTEGER,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      period TEXT NOT NULL CHECK (period IN ('monthly','yearly')),
      amount_cents INTEGER NOT NULL,
      method TEXT NOT NULL CHECK (method IN ('mercadopago','crypto')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','expired')),
      provider_ref TEXT,
      crypto_network TEXT,
      crypto_asset TEXT,
      crypto_amount TEXT,
      crypto_address TEXT,
      tx_hash TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      expires_at INTEGER,
      paid_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_tx ON orders(tx_hash) WHERE tx_hash IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_provider ON orders(provider_ref) WHERE provider_ref IS NOT NULL;

    CREATE TABLE IF NOT EXISTS holdings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      block TEXT NOT NULL CHECK (block IN ('cripto','fiis','acoes','renda_fixa','oportunidades')),
      label TEXT NOT NULL,
      value_cents INTEGER NOT NULL CHECK (value_cents >= 0),
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_holdings_user ON holdings(user_id);

    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      fetched_at INTEGER NOT NULL
    );
  `);
  // Origem da posição: 'manual' (digitada) ou 'b3' (importada da planilha da B3). Bancos antigos ganham a coluna aqui.
  const cols = db.prepare("PRAGMA table_info(holdings)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "source")) db.exec("ALTER TABLE holdings ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'");
}

export function db(): Database.Database {
  if (!globalForDb.__db) globalForDb.__db = open();
  return globalForDb.__db;
}

export type Role = "user" | "admin";
export type PlanName = "free" | "pro";

export interface UserRow {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  role: Role;
  plan: PlanName;
  plan_expires_at: number | null;
  must_change_password: number;
  created_at: number;
}

export interface OrderRow {
  id: string;
  user_id: number;
  period: "monthly" | "yearly";
  amount_cents: number;
  method: "mercadopago" | "crypto";
  status: "pending" | "paid" | "expired";
  provider_ref: string | null;
  crypto_network: string | null;
  crypto_asset: string | null;
  crypto_amount: string | null;
  crypto_address: string | null;
  tx_hash: string | null;
  created_at: number;
  expires_at: number | null;
  paid_at: number | null;
}

export function now(): number {
  return Math.floor(Date.now() / 1000);
}

/** Plano efetivo: Pro só vale enquanto não expirou. Admin sempre tem acesso Pro. */
export function effectivePlan(u: Pick<UserRow, "plan" | "plan_expires_at" | "role">): PlanName {
  if (u.role === "admin") return "pro";
  if (u.plan === "pro" && (u.plan_expires_at === null || u.plan_expires_at > now())) return "pro";
  return "free";
}
