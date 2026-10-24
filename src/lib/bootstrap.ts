import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { db } from "./db";

function generatePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(18);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `${out}a7`;
}

/**
 * Garante que exista um administrador. Roda na inicialização do servidor.
 *
 * - Se já existe algum admin, não faz nada.
 * - Usa ADMIN_EMAIL (padrão admin@exemplo.com) e ADMIN_INITIAL_PASSWORD.
 * - Se ADMIN_INITIAL_PASSWORD estiver vazia, gera uma senha aleatória e a escreve
 *   UMA vez no log do servidor.
 * - A troca da senha é obrigatória no primeiro login.
 */
export function ensureAdmin(log: (msg: string) => void = console.log): { created: boolean; email?: string } {
  const d = db();
  const existing = d.prepare("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1").get();
  if (existing) return { created: false };

  // Tolera o e-mail copiado no formato "<nome@dominio.com>" (com os sinais < e >).
  const email = (process.env.ADMIN_EMAIL || "admin@exemplo.com").trim().replace(/^<|>$/g, "").trim().toLowerCase();
  const name = (process.env.ADMIN_NAME || "Administrador").trim();
  const configured = process.env.ADMIN_INITIAL_PASSWORD?.trim();

  if (configured && configured.length < 10) {
    log("[admin] ADMIN_INITIAL_PASSWORD precisa ter pelo menos 10 caracteres. Admin não foi criado.");
    return { created: false };
  }

  const password = configured || generatePassword();
  const hash = bcrypt.hashSync(password, 12);

  const sameEmail = d.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: number } | undefined;
  if (sameEmail) {
    d.prepare("UPDATE users SET role = 'admin', password_hash = ?, must_change_password = 1 WHERE id = ?").run(hash, sameEmail.id);
  } else {
    d.prepare("INSERT INTO users (email, name, password_hash, role, plan, must_change_password) VALUES (?, ?, ?, 'admin', 'pro', 1)").run(email, name, hash);
  }

  log(`[admin] Administrador criado: ${email}. A troca da senha é obrigatória no primeiro acesso.`);
  if (!configured) log(`[admin] Senha inicial (exibida só agora): ${password}`);
  return { created: true, email };
}
