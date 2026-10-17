/**
 * Cria (ou redefine, com --reset) o usuário admin inicial.
 *
 *   npm run seed            cria o admin se ainda não existir
 *   npm run seed -- --reset redefine a senha do admin existente
 *
 * Se ADMIN_INITIAL_PASSWORD estiver vazio, uma senha aleatória é gerada
 * e exibida UMA vez no terminal. A troca é obrigatória no primeiro login.
 */
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { db } from "../src/lib/db";

const email = (process.env.ADMIN_EMAIL || "admin@exemplo.com").trim().toLowerCase();
const name = (process.env.ADMIN_NAME || "Administrador").trim();
const reset = process.argv.includes("--reset");

function generatePassword(): string {
  // 20 caracteres, sem símbolos ambíguos, com letras e números garantidos
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(20);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out.slice(0, 18) + "a7";
}

const d = db();
const existing = d.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: number } | undefined;

if (existing && !reset) {
  console.log(`Admin ${email} já existe. Use "npm run seed -- --reset" para gerar uma nova senha inicial.`);
  process.exit(0);
}

const generated = !process.env.ADMIN_INITIAL_PASSWORD;
const password = process.env.ADMIN_INITIAL_PASSWORD || generatePassword();
const hash = bcrypt.hashSync(password, 12);

if (existing) {
  d.prepare("UPDATE users SET password_hash = ?, role = 'admin', must_change_password = 1, name = ? WHERE id = ?").run(hash, name, existing.id);
} else {
  d.prepare("INSERT INTO users (email, name, password_hash, role, plan, must_change_password) VALUES (?, ?, ?, 'admin', 'pro', 1)").run(email, name, hash);
}

console.log("");
console.log("==============================================");
console.log(existing ? " Senha do admin redefinida" : " Admin criado");
console.log("==============================================");
console.log(` E-mail: ${email}`);
if (generated) {
  console.log(` Senha inicial: ${password}`);
  console.log(" (exibida apenas agora; anote em local seguro)");
} else {
  console.log(" Senha inicial: valor de ADMIN_INITIAL_PASSWORD");
}
console.log(" No primeiro acesso o sistema exige a troca da senha.");
console.log("==============================================");
console.log("");
