import { shortUrl, splitRich } from "@/lib/community";

/** Texto da comunidade: links clicáveis (abrem em nova aba) e menções @nome em dourado (a sua com destaque). */
export function RichText({ body, first }: { body: string; first?: string }) {
  return (
    <>
      {splitRich(body).map((t, i) =>
        t.type === "link" ? (
          <a key={i} href={t.href} target="_blank" rel="noopener noreferrer nofollow ugc" title={t.href} className="break-all text-gold-soft underline hover:text-white">{shortUrl(t.text)}</a>
        ) : t.type === "mention" ? (
          <span key={i} className={`rounded px-0.5 font-medium ${first && t.text.slice(1).toLowerCase() === first ? "bg-gold/25 text-gold-soft" : "text-gold-soft"}`}>{t.text}</span>
        ) : (
          <span key={i}>{t.text}</span>
        ),
      )}
    </>
  );
}
