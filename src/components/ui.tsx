import Image from "next/image";
import Link from "next/link";
import logoFull from "@/assets/logo-niza.webp";
import logoMark from "@/assets/logo-niza-mark.webp";
import type { Cached } from "@/lib/market";
import { dateTime } from "@/lib/format";

export const APP_NAME = process.env.APP_NAME || "NIZA INVEST";

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  if (size === "lg") {
    return (
      <Link href="/" aria-label={APP_NAME} className="inline-flex">
        <Image src={logoFull} alt={APP_NAME} height={112} unoptimized priority className="h-28 w-auto" />
      </Link>
    );
  }
  return (
    <Link href="/" aria-label={APP_NAME} className="inline-flex items-center gap-2.5">
      <Image src={logoMark} alt="" height={34} unoptimized className="h-[34px] w-auto" />
      <span translate="no" className="notranslate font-display text-[17px] font-bold tracking-[0.16em] text-gold-soft">
        NIZA <span className="font-medium text-gold">INVEST</span>
      </span>
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

export function Locked({ feature, text }: { feature: string; text?: string }) {
  return (
    <div className="card flex flex-col items-start gap-3 p-6">
      <div className="flex items-center gap-2">
        <ProBadge />
        <h3 className="font-semibold">{feature}</h3>
      </div>
      <p className="text-sm text-muted">{text ?? "Este recurso faz parte do plano Pro. Assine para liberar a lista completa, filtros, exportação e o portfólio com rebalanceamento."}</p>
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
