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

export function renewalEmail(name: string, daysLeft: number, expiresAt: Date, link: string, trial = false): { subject: string; html: string; text: string } {
  const app = process.env.APP_NAME || "NIZA INVEST";
  const first = name.trim().split(/\s+/)[0] || "";
  const hello = first ? `Olá, ${first}!` : "Olá!";
  const date = expiresAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const when = daysLeft <= 1 ? "vence amanhã" : `vence em ${daysLeft} dias`;
  if (trial) {
    const endsWhen = daysLeft <= 1 ? "termina amanhã" : `termina em ${daysLeft} dias`;
    return {
      subject: daysLeft <= 1 ? `Seu teste grátis do Premium termina amanhã - ${app}` : `Seu teste grátis do Premium termina em ${daysLeft} dias - ${app}`,
      text: `${hello}\n\nSeu teste grátis do Premium no ${app} ${endsWhen} (${date}). Para continuar com o acesso completo, assine pelo link:\n\n${link}\n\nO tempo que ainda resta do teste é mantido: ao assinar, o plano começa a contar depois dele. Se não assinar, sua conta volta para o plano Grátis, sem nenhuma cobrança.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1a1a1a">
<h2 style="color:#b8860b">${escapeHtml(app)}</h2>
<p>${escapeHtml(hello)}</p>
<p>Seu <strong>teste grátis do Premium</strong> ${escapeHtml(endsWhen)} (<strong>${escapeHtml(date)}</strong>). Para continuar com o acesso completo, assine pelo botão abaixo.</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#d4a82f;color:#111;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Assinar o Premium</a></p>
<p style="font-size:13px;color:#555">O tempo que ainda resta do teste é mantido: ao assinar, o plano começa a contar depois dele. Se não assinar, sua conta volta para o plano Grátis, sem nenhuma cobrança.</p>
</div>`,
    };
  }
  return {
    subject: daysLeft <= 1 ? `Seu plano Premium vence amanhã - ${app}` : `Seu plano Premium vence em ${daysLeft} dias - ${app}`,
    text: `${hello}\n\nSeu plano Premium no ${app} ${when} (${date}). Para continuar com o acesso completo, renove pelo link:\n\n${link}\n\nA renovação soma ao tempo que ainda resta, então você não perde nada ao antecipar. Se já renovou, ignore este e-mail.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1a1a1a">
<h2 style="color:#b8860b">${escapeHtml(app)}</h2>
<p>${escapeHtml(hello)}</p>
<p>Seu plano <strong>Premium</strong> ${escapeHtml(when)} (<strong>${escapeHtml(date)}</strong>). Para continuar com o acesso completo, renove pelo botão abaixo.</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#d4a82f;color:#111;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Renovar o Premium</a></p>
<p style="font-size:13px;color:#555">A renovação soma ao tempo que ainda resta, então você não perde nada ao antecipar. Se já renovou, ignore este e-mail.</p>
</div>`,
  };
}

export function inviteEmail(name: string, days: number, link: string, note: string): { subject: string; html: string; text: string } {
  const app = process.env.APP_NAME || "NIZA INVEST";
  const first = name.trim().split(/\s+/)[0] || "";
  const hello = first ? `Olá, ${first}!` : "Olá!";
  const periodo = days >= 365 && days % 365 === 0 ? `${days / 365} ${days === 365 ? "ano" : "anos"}` : `${days} dias`;
  return {
    subject: `Você recebeu um convite VIP do ${app}`,
    text: `${hello}\n\nVocê foi convidado(a) para o ${app} com acesso VIP ao plano Premium por ${periodo}, sem custo.${note ? `\n\n${note}` : ""}\n\nAbra o link para ativar (crie sua conta ou entre, e confirme):\n\n${link}\n\nO convite é pessoal e de uso único.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1a1a1a">
<h2 style="color:#b8860b">${escapeHtml(app)}</h2>
<p>${escapeHtml(hello)}</p>
<p>Você foi convidado(a) com <strong>acesso VIP ao plano Premium por ${escapeHtml(periodo)}</strong>, sem custo.</p>
${note ? `<p style="background:#faf5e4;border-radius:8px;padding:10px 14px">${escapeHtml(note)}</p>` : ""}
<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#d4a82f;color:#111;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Ativar meu acesso VIP</a></p>
<p style="font-size:13px;color:#555">Se o botão não abrir, copie este endereço no navegador:<br>${escapeHtml(link)}</p>
<p style="font-size:13px;color:#555">O convite é pessoal e de uso único.</p>
</div>`,
  };
}

export function meetingEmail(name: string, ev: { title: string; startsAt: number; endsAt: number; link: string; notes: string }, agendaUrl: string): { subject: string; html: string; text: string } {
  const app = process.env.APP_NAME || "NIZA INVEST";
  const first = name.trim().split(/\s+/)[0] || "";
  const hello = first ? `Olá, ${first}!` : "Olá!";
  const fmt = (t: number, o: Intl.DateTimeFormatOptions) => new Date(t * 1000).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", ...o });
  const date = fmt(ev.startsAt, { weekday: "long", day: "2-digit", month: "long" });
  const hour = `${fmt(ev.startsAt, { hour: "2-digit", minute: "2-digit" })} às ${fmt(ev.endsAt, { hour: "2-digit", minute: "2-digit" })} (Brasília)`;
  const cta = ev.link || agendaUrl;
  return {
    subject: `Agenda White Flame Society: ${ev.title} - ${date}`,
    text: `${hello}\n\nPróxima reunião da White Flame Society:\n\n${ev.title}\n${date}, ${hour}\n${ev.notes ? `\n${ev.notes}\n` : ""}\nEntrar: ${cta}\nAgenda completa: ${agendaUrl}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1a1a1a">
<h2 style="color:#b8860b">${escapeHtml(app)} · White Flame Society</h2>
<p>${escapeHtml(hello)}</p>
<p>Próxima reunião:</p>
<p style="font-size:18px;margin:0"><strong>${escapeHtml(ev.title)}</strong></p>
<p style="margin:4px 0 12px">${escapeHtml(date)}<br>${escapeHtml(hour)}</p>
${ev.notes ? `<p style="font-size:14px;color:#444;white-space:pre-wrap">${escapeHtml(ev.notes)}</p>` : ""}
<p><a href="${escapeHtml(cta)}" style="display:inline-block;background:#d4a82f;color:#111;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">${ev.link ? "Entrar na reunião" : "Ver a agenda"}</a></p>
<p style="font-size:13px;color:#555">Agenda completa: <a href="${escapeHtml(agendaUrl)}">${escapeHtml(agendaUrl)}</a><br>Você receberá este aviso todos os dias às 08:00 até a data da reunião.</p>
</div>`,
  };
}
