/**
 * Desbloqueio rápido (opcional) neste aparelho: depois de abrir o cofre uma vez com as 24 palavras, o navegador pode
 * guardar as palavras CRIPTOGRAFADAS com uma chave que não sai do aparelho (não extraível). Nas próximas vezes pedimos
 * só algumas palavras como confirmação; 3 erros apagam o que foi guardado e voltam a exigir as 24.
 * Nada disso vai para o servidor. Fica só no armazenamento (IndexedDB) do navegador deste aparelho.
 */
const DB = "niza-irpf-device";
const STORE = "quick";
const KEY = "quick";
export const MAX_FAILS = 3;

interface Rec { key: CryptoKey; iv: Uint8Array; ct: ArrayBuffer; fails: number }

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((res, rej) => { const r = f(db.transaction(STORE, mode).objectStore(STORE)); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  } finally { db.close(); }
}

export const deviceSupported = () => typeof indexedDB !== "undefined" && typeof crypto !== "undefined" && !!crypto.subtle;

export async function hasDevicePhrase(): Promise<boolean> {
  if (!deviceSupported()) return false;
  try { return !!(await tx<Rec | undefined>("readonly", (s) => s.get(KEY))); } catch { return false; }
}

export async function saveDevicePhrase(phrase: string): Promise<void> {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, new TextEncoder().encode(phrase));
  await tx("readwrite", (s) => s.put({ key, iv, ct, fails: 0 } satisfies Rec, KEY));
}

export async function forgetDevice(): Promise<void> {
  if (!deviceSupported()) return;
  try { await tx("readwrite", (s) => s.delete(KEY)); } catch { /* nada guardado */ }
}

export type QuickResult = { ok: true; phrase: string } | { ok: false; left: number; wiped: boolean };

/** Confere as palavras pedidas (posição → palavra). O contador de erros é gravado ANTES de comparar. */
export async function quickUnlock(answers: Record<number, string>): Promise<QuickResult> {
  const rec = await tx<Rec | undefined>("readonly", (s) => s.get(KEY));
  if (!rec) return { ok: false, left: 0, wiped: true };
  const fails = rec.fails + 1;
  if (fails > MAX_FAILS) { await forgetDevice(); return { ok: false, left: 0, wiped: true }; }
  await tx("readwrite", (s) => s.put({ ...rec, fails }, KEY));
  const phrase = new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: rec.iv as BufferSource }, rec.key, rec.ct));
  const words = phrase.split(" ");
  const pos = Object.keys(answers).map(Number);
  const good = pos.length >= 3 && pos.every((n) => (answers[n] ?? "").trim().toLowerCase() === words[n - 1]);
  if (good) { await tx("readwrite", (s) => s.put({ ...rec, fails: 0 }, KEY)); return { ok: true, phrase }; }
  if (fails >= MAX_FAILS) { await forgetDevice(); return { ok: false, left: 0, wiped: true }; }
  return { ok: false, left: MAX_FAILS - fails, wiped: false };
}
