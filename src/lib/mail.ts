/**
 * Envio de e-mail pela API HTTP do Resend (https://resend.com), sem dependências extras.
 * Variáveis: RESEND_API_KEY e MAIL_FROM (ex.: "NIZA INVEST <contato@nizainvest.com.br>").
 */
export function mailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export async function sendMail(params: { to: string; subject: string; html: string; text: string }): Promise<void> {
  if (!mailEnabled()) throw new Error("E-mail não configurado (RESEND_API_KEY e MAIL_FROM).");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [params.to], subject: params.subject, html: params.html, text: params.text }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend respondeu ${res.status}: ${body.slice(0, 300)}`);
  }
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function resetEmail(name: string, link: string): { subject: string; html: string; text: string } {
  const app = process.env.APP_NAME || "NIZA INVEST";
  const first = name.trim().split(/\s+/)[0] || "";
  const hello = first ? `Olá, ${first}!` : "Olá!";
  return {
    subject: `Redefinir sua senha - ${app}`,
    text: `${hello}\n\nRecebemos um pedido para redefinir a sua senha no ${app}. Abra o link abaixo para criar uma nova senha (vale por 1 hora):\n\n${link}\n\nSe você não pediu isso, ignore este e-mail. Sua senha continua a mesma.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1a1a1a">
<h2 style="color:#b8860b">${escapeHtml(app)}</h2>
<p>${escapeHtml(hello)}</p>
<p>Recebemos um pedido para redefinir a sua senha. O link vale por <strong>1 hora</strong>.</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#d4a82f;color:#111;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Criar nova senha</a></p>
<p style="font-size:13px;color:#555">Se o botão não abrir, copie este endereço no navegador:<br>${escapeHtml(link)}</p>
<p style="font-size:13px;color:#555">Se você não pediu isso, ignore este e-mail. Sua senha continua a mesma.</p>
</div>`,
  };
}
