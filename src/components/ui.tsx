import Link from "next/link";
import type { Cached } from "@/lib/market";
import { dateTime } from "@/lib/format";

export const APP_NAME = process.env.APP_NAME || "CR2FA Lab";

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2">
      <span
        className={`grid place-items-center rounded-lg bg-gradient-to-b from-gold-soft to-gold font-display font-bold text-[#1a1203] ${
          size === "lg" ? "h-10 w-10 text-lg" : "h-8 w-8 text-sm"
        }`}
        aria-hidden
      >
        C2
      </span>
      <span className={`font-display font-bold tracking-wide text-gold-soft ${size === "lg" ? "text-2xl" : "text-lg"}`}>{APP_NAME}</span>
    </Link>
  );
}

export function ProBadge() {
  return <span className="rounded-md bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-gold-soft">PRO</span>;
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-6">
      <h1 className="font-display text-2xl font-bold text-gold-soft md:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 max-w-3xl text-sm text-muted">{subtitle}</p>}
    </header>
  );
}

/** Aviso de origem/atualização dos dados. Mostra erro claro quando não há dados. */
export function DataStatus({ result, source }: { result: Cached<unknown>; source: string }) {
  if (result.data === null) {
    return (
      <div className="card border-down/40 p-4 text-sm text-down">
        Não foi possível carregar os dados de {source} agora. {result.error ? <span className="text-muted">({result.error})</span> : null} Tente novamente em alguns minutos.
      </div>
    );
  }
  return (
    <p className="mb-2 text-xs text-muted">
      Fonte: {source}. Atualizado em {dateTime(result.fetchedAt)}.
      {result.stale ? <span className="ml-1 text-gold-soft">Exibindo o último dado salvo, a fonte não respondeu.</span> : null}
    </p>
  );
}

export function Locked({ feature }: { feature: string }) {
  return (
    <div className="card flex flex-col items-start gap-3 p-6">
      <div className="flex items-center gap-2">
        <ProBadge />
        <h3 className="font-semibold">{feature}</h3>
      </div>
      <p className="text-sm text-muted">Este recurso faz parte do plano Pro. Assine para liberar a lista completa, filtros, exportação e o portfólio com rebalanceamento.</p>
      <Link href="/planos" className="btn btn-gold">
        Ver planos
      </Link>
    </div>
  );
}

export function Change({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <span className="text-muted">—</span>;
  const up = value >= 0;
  return (
    <span className={up ? "text-up" : "text-down"}>
      {up ? "▲" : "▼"} {Math.abs(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%
    </span>
  );
}

export function Disclaimer() {
  return (
    <p className="mt-8 text-xs leading-relaxed text-muted">
      Conteúdo educativo e informativo, baseado em dados públicos. Não é recomendação de investimento. Rentabilidade passada não garante resultado futuro, e ativos de
      renda variável e cripto podem gerar perdas, inclusive do valor total aplicado.
    </p>
  );
}
