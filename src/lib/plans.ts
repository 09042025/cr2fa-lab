export type Period = "monthly" | "yearly";

export const PLAN_FEATURES = {
  free: [
    "Tabela de pools DeFi (top 15 por TVL)",
    "Cotações de cripto, ações e FIIs (lista reduzida)",
    "Taxas de renda fixa (Selic, CDI, IPCA)",
    "Calculadora de juros compostos",
    "Feed, Notícias e Lives Abertas",
  ],
  pro: [
    "Pools DeFi completos, com filtros por rede, ativo, TVL e APY",
    "Ações, FIIs e ETFs com lista completa e filtros por setor",
    "Comparador de renda fixa com imposto de renda (CDB, LCI/LCA, Selic)",
    "Protocolo CR2FA completo e Comunidade (chat, canais e Lives VIP)",
    "Portfólio com rebalanceamento automático pelo Protocolo CR2FA",
    "Exportação em CSV",
    "Suporte prioritário",
  ],
} as const;

export const FREE_LIMITS = {
  pools: 15,
  stocks: 6,
  fiis: 6,
  crypto: 10,
} as const;

export function priceCents(period: Period): number {
  const env = period === "monthly" ? process.env.PRO_PRICE_BRL_MONTHLY : process.env.PRO_PRICE_BRL_YEARLY;
  const fallback = period === "monthly" ? "49.90" : "499.90";
  const value = Number((env || fallback).replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) return Math.round(Number(fallback) * 100);
  return Math.round(value * 100);
}

export function periodSeconds(period: Period): number {
  return (period === "monthly" ? 31 : 366) * 24 * 60 * 60;
}

export function periodLabel(period: Period): string {
  return period === "monthly" ? "mensal" : "anual";
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
