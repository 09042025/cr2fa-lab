import { db } from "./db";

/** Configurações guardadas no banco do site (servidor). Úsadas quando uma variável de ambiente não chega ao servidor. */
function table() {
  db().exec("CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL)");
}
export function getSetting(key: string): string | null {
  try {
    table();
    const r = db().prepare("SELECT value FROM app_settings WHERE key = ?").get(key) as { value: string } | undefined;
    return r?.value ?? null;
  } catch { return null; }
}
export function setSetting(key: string, value: string | null) {
  table();
  if (value === null) db().prepare("DELETE FROM app_settings WHERE key = ?").run(key);
  else db().prepare("INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").run(key, value, Math.floor(Date.now() / 1000));
}
