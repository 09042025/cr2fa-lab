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
    "Protocolo CR2FA completo, White Flame Society (chat, canais e Lives VIP) e Simulador de Financiamentos",
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

export type Product = "premium" | "mentoria" | "diamond" | "black";
export const MENTORIA_SESSIONS = 12;

/** Mentoria com Niza (Diamond): pagamento único. Preço em MENTORIA_PRICE_BRL (padrão R$ 1.500,00). */
export function mentoriaPriceCents(): number {
  const v = Number((process.env.MENTORIA_PRICE_BRL || "1500").replace(",", "."));
  return Number.isFinite(v) && v > 0 ? Math.round(v * 100) : 150000;
}

export const DIAMOND_NAME = "Plano Diamond (Tudo do Premium + Mentoria)";
export const DIAMOND_FEATURES = [
  "Premium vitalício: todos os recursos do Premium, para sempre, sem renovação",
  `Mentoria com Niza incluída: ${MENTORIA_SESSIONS} aulas particulares de 1 hora (1 por mês), uma única vez`,
  "Aula 01 para avaliar o seu nível e montar o seu caminho de aprendizagem",
  "Avaliação da carteira pelo Protocolo CR2FA, cripto do zero e racional dos pools de liquidez",
] as const;

/** Plano Diamond: Premium vitalício + 1 mentoria. Preço em DIAMOND_PRICE_BRL (padrão R$ 3.000,00). */
export function diamondPriceCents(): number {
  const v = Number((process.env.DIAMOND_PRICE_BRL || "3000").replace(",", "."));
  return Number.isFinite(v) && v > 0 ? Math.round(v * 100) : 300000;
}

export const BLACK_NAME = "Diamond Black VIP";
export const BLACK_FEATURES = [
  "Tudo do Premium e tudo do Plano Diamond (inclui a Mentoria com Niza, 12 aulas)",
  "Encontros presenciais VIP periódicos para falar de negócios e fazer network",
  "Grupo seleto, por convite, com pessoas de alto nível em conhecimento e sucesso financeiro",
  "Foco em riqueza, empreendedorismo, negócios e investimentos",
  "Encontros começando em São Paulo, com expansão prevista para outras cidades do Brasil e do mundo",
] as const;

/** Diamond Black VIP: anuidade. Preço em BLACK_PRICE_BRL (padrão R$ 10.000,00 por ano). */
export function blackPriceCents(): number {
  const v = Number((process.env.BLACK_PRICE_BRL || "10000").replace(",", "."));
  return Number.isFinite(v) && v > 0 ? Math.round(v * 100) : 1000000;
}
