/** Destinos de compartilhamento (links oficiais de "compartilhar" de cada rede, sem SDKs nem scripts de terceiros). */
export interface ShareTarget { id: string; label: string; href: string }

export const MAX_SHARE_TEXT = 140;

export function shareText(body: string, author: string): string {
  const t = body.replace(/\s+/g, " ").trim();
  const cut = t.length > MAX_SHARE_TEXT ? `${t.slice(0, MAX_SHARE_TEXT - 1)}…` : t;
  return cut ? `${cut} — ${author} no NIZA INVEST` : `Publicação de ${author} no NIZA INVEST`;
}

export function shareTargets(url: string, text: string): ShareTarget[] {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  const both = encodeURIComponent(`${text} ${url}`);
  return [
    { id: "whatsapp", label: "WhatsApp", href: `https://api.whatsapp.com/send?text=${both}` },
    { id: "telegram", label: "Telegram", href: `https://t.me/share/url?url=${u}&text=${t}` },
    { id: "x", label: "X", href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { id: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { id: "linkedin", label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { id: "reddit", label: "Reddit", href: `https://www.reddit.com/submit?url=${u}&title=${t}` },
    { id: "messenger", label: "Messenger", href: `https://www.facebook.com/dialog/send?link=${u}&redirect_uri=${u}` },
    { id: "email", label: "E-mail", href: `mailto:?subject=${encodeURIComponent("NIZA INVEST")}&body=${both}` },
    { id: "sms", label: "SMS", href: `sms:?&body=${both}` },
  ];
}

export const postUrl = (origin: string, id: number) => `${origin}/painel/feed/post/${id}`;

/** 1234 → "1,2 mil"; 1 500 000 → "1,5 mi". */
export function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: n < 10_000 ? 1 : 0 })} mil`;
  return `${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
}
