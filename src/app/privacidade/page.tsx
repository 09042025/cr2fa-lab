import Link from "next/link";
import { Logo } from "@/components/ui";
import { PRIVACY, PRIVACY_CONTACT, PRIVACY_INTRO } from "@/lib/privacy";

export const metadata = { title: "Política de privacidade" };

/** Troca o e-mail de contato por um link, sem mexer no resto do texto. */
function withMail(text: string) {
  const parts = text.split(PRIVACY_CONTACT);
  return parts.flatMap((t, i) => (i === 0 ? [t] : [<a key={i} className="text-gold-soft underline" href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a>, t]));
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <div className="mb-6 flex justify-center"><Logo size="lg" /></div>
      <div className="card space-y-4 p-6 text-sm leading-relaxed text-muted">
        <h1 className="font-display text-2xl font-bold text-gold-soft">Política de privacidade</h1>
        <p>{PRIVACY_INTRO}</p>
        {PRIVACY.map((b) => (
          <section key={b.h} className="space-y-3">
            <h2 className="font-semibold text-white">{b.h}</h2>
            {b.ul && <ul className="list-disc space-y-1 pl-5">{b.ul.map((i) => <li key={i.b}><strong className="text-white">{i.b}:</strong> {i.t}</li>)}</ul>}
            {b.p?.map((t) => <p key={t}>{withMail(t)}</p>)}
          </section>
        ))}
        <p className="pt-2"><Link href="/" className="text-gold-soft underline">Voltar ao início</Link></p>
      </div>
    </main>
  );
}
