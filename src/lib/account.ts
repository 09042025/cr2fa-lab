import { z } from "zod";
import { hashPassword, validatePasswordStrength, verifyPassword } from "./auth";
import { db, type UserRow } from "./db";

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome (mínimo de 2 letras).").max(80),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido.").max(120),
  currentPassword: z.string().max(200).optional(),
});

export type ProfileResult = { ok: true; emailChanged: boolean } | { ok: false; error: string; status: number };

/** Atualiza nome e e-mail. Trocar o e-mail exige a senha atual, porque ele é o login e o destino da recuperação de senha. */
export async function updateProfile(userId: number, input: z.infer<typeof profileSchema>): Promise<ProfileResult> {
  const d = db();
  const user = d.prepare("SELECT * FROM users WHERE id = ?").get(userId) as UserRow | undefined;
  if (!user) return { ok: false, error: "Usuário não encontrado.", status: 404 };

  const emailChanged = input.email !== user.email.toLowerCase();
  if (emailChanged) {
    if (!input.currentPassword) return { ok: false, error: "Para trocar o e-mail, informe a senha atual.", status: 400 };
    if (!(await verifyPassword(input.currentPassword, user.password_hash))) return { ok: false, error: "A senha atual está incorreta.", status: 401 };
    const taken = d.prepare("SELECT 1 FROM users WHERE email = ? AND id <> ?").get(input.email, userId);
    if (taken) return { ok: false, error: "Este e-mail já está em uso por outra conta.", status: 409 };
  }
  d.prepare("UPDATE users SET name = ?, email = ? WHERE id = ?").run(input.name, input.email, userId);
  return { ok: true, emailChanged };
}

export type DeleteResult = { ok: true; paidOrders: number } | { ok: false; error: string; status: number };

/**
 * Exclui uma conta (ação do administrador). Também vale para outro administrador (por exemplo, uma conta duplicada),
 * mas nunca a conta de quem está excluindo e nunca o último administrador.
 * Exige o e-mail da conta digitado de novo, para evitar exclusão por engano.
 * Os dados da conta (pedidos, posições da carteira, links de senha) são apagados junto.
 */
export function deleteUserAccount(targetId: number, confirmEmail: string, actingAdminId?: number): DeleteResult {
  const d = db();
  const user = d.prepare("SELECT * FROM users WHERE id = ?").get(targetId) as UserRow | undefined;
  if (!user) return { ok: false, error: "Usuário não encontrado.", status: 404 };
  if (actingAdminId !== undefined && user.id === actingAdminId) return { ok: false, error: "Você não pode excluir a sua própria conta.", status: 403 };
  if (user.role === "admin") {
    const otherAdmins = (d.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND id <> ?").get(targetId) as { n: number }).n;
    if (otherAdmins < 1) return { ok: false, error: "Este é o último administrador e não pode ser excluído.", status: 403 };
  }
  if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) return { ok: false, error: "O e-mail digitado não confere com o da conta. Nada foi excluído.", status: 400 };
  const paidOrders = (d.prepare("SELECT COUNT(*) AS n FROM orders WHERE user_id = ? AND status = 'paid'").get(targetId) as { n: number }).n;
  d.prepare("DELETE FROM users WHERE id = ?").run(targetId);
  return { ok: true, paidOrders };
}

export { hashPassword, validatePasswordStrength };
