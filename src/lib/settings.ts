import { db } from "./db";

/** Configurações guardadas no banco do site (tabela app_settings já existente: key, value). */
export function getSetting(key: string): string | null {
  try {
    const r = db().prepare("SELECT value FROM app_settings WHERE key = ?").get(key) as { value: string } | undefined;
    return r?.value ?? null;
  } catch { return null; }
}
export function setSetting(key: string, value: string | null) {
  if (value === null) db().prepare("DELETE FROM app_settings WHERE key = ?").run(key);
  else db().prepare("INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
}
