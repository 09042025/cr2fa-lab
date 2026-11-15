/**
 * Cofre do IRPF: criptografia ponta a ponta feita só no navegador (WebCrypto).
 * - A chave nasce de 24 palavras (BIP-39, 256 bits de entropia, o mesmo padrão de carteiras cripto).
 * - O arquivo salvo usa AES-256-GCM (confidencialidade + integridade); sal e IV aleatórios a cada gravação.
 * - Nada daqui acessa a rede, e as 24 palavras nunca são guardadas em lugar nenhum.
 */
import { generateMnemonic, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

export const FILE_VERSION = 1;
export const KDF_ITERATIONS = 600_000;
const AAD = new TextEncoder().encode("NIZA-IRPF-COFRE-v1");

export interface VaultFile { v: number; kdf: "PBKDF2-SHA256"; iter: number; salt: string; iv: string; ct: string }

const b64 = (u: Uint8Array) => { let s = ""; for (const x of u) s += String.fromCharCode(x); return btoa(s); };
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export const newPhrase = () => generateMnemonic(wordlist, 256);
export const normalizePhrase = (p: string) => p.toLowerCase().normalize("NFKD").trim().split(/\s+/).filter(Boolean).join(" ");
export const isValidPhrase = (p: string) => { const n = normalizePhrase(p); return n.split(" ").length === 24 && validateMnemonic(n, wordlist); };

async function keyFrom(phrase: string, salt: Uint8Array, iter: number): Promise<CryptoKey> {
  const raw = await crypto.subtle.importKey("raw", new TextEncoder().encode(normalizePhrase(phrase)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: iter }, raw, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function encryptVault(phrase: string, data: unknown): Promise<VaultFile> {
  if (!isValidPhrase(phrase)) throw new Error("As 24 palavras não são válidas.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFrom(phrase, salt, KDF_ITERATIONS);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource, additionalData: AAD as BufferSource }, key, new TextEncoder().encode(JSON.stringify(data))));
  return { v: FILE_VERSION, kdf: "PBKDF2-SHA256", iter: KDF_ITERATIONS, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}

export async function decryptVault<T = unknown>(phrase: string, file: VaultFile): Promise<T> {
  if (!file || file.v !== FILE_VERSION || file.kdf !== "PBKDF2-SHA256" || typeof file.ct !== "string") throw new Error("Arquivo de cofre inválido.");
  if (!Number.isInteger(file.iter) || file.iter < 100_000 || file.iter > 5_000_000) throw new Error("Arquivo de cofre inválido.");
  if (!isValidPhrase(phrase)) throw new Error("As 24 palavras não são válidas.");
  const key = await keyFrom(phrase, unb64(file.salt), file.iter);
  try {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(file.iv) as BufferSource, additionalData: AAD as BufferSource }, key, unb64(file.ct) as BufferSource);
    return JSON.parse(new TextDecoder().decode(pt)) as T;
  } catch {
    throw new Error("Não foi possível abrir: palavras erradas ou arquivo alterado.");
  }
}

/** Três posições aleatórias (1–24) para o usuário provar que anotou as palavras. */
export function pickChecks(n = 3): number[] {
  const out = new Set<number>();
  while (out.size < n) out.add(1 + (crypto.getRandomValues(new Uint32Array(1))[0] % 24));
  return [...out].sort((a, b) => a - b);
}
