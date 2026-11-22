export type BlockKey = "cripto" | "fiis" | "acoes" | "renda_fixa" | "oportunidades";

export interface SubAllocation {
  label: string;
  pct: number; // percentual dentro do bloco
  /** Parte dolarizada (ativo em dólar ou stablecoin): conta para a meta de dolarização. */
  usd?: boolean;
  children?: SubAllocation[];
}

export interface Block {
  key: BlockKey;
  name: string;
  pct: number; // percentual da carteira
  color: string;
  subs: SubAllocation[];
}

/**
 * Protocolo CR2FA: cinco blocos de 20%, com diversificação em duas camadas.
 * Dolarização (proteção contra ficar preso a uma só moeda): cripto conta 100% como dólar; metade das ações é no exterior;
 * metade da renda fixa é em dólar; metade da reserva para oportunidades é em dólar ou stablecoins. Soma: 20 + 10 + 10 + 10 = 50% da carteira.
 */
export const BLOCKS: Block[] = [
  {
    key: "cripto",
    name: "Criptomoedas",
    pct: 20,
    color: "#d9a520",
    subs: [
      { label: "Bitcoin (BTC)", pct: 60, usd: true },
      { label: "Ethereum (ETH)", pct: 10, usd: true },
      { label: "Stablecoins rendendo (Aave ou Kamino)", pct: 30, usd: true },
    ],
  },
  {
    key: "fiis",
    name: "Fundos imobiliários",
    pct: 20,
    color: "#8b5cf6",
    subs: [
      { label: "Galpões logísticos", pct: 30 },
      { label: "Shopping centers", pct: 30 },
      { label: "Outros imóveis de tijolo", pct: 30 },
      { label: "Fundos de papel", pct: 10 },
    ],
  },
  {
    key: "acoes",
    name: "Ações",
    pct: 20,
    color: "#f97316",
    subs: [
      {
        label: "Ações brasileiras",
        pct: 50,
        children: [
          { label: "Energia", pct: 20 },
          { label: "Bancos", pct: 20 },
          { label: "Saneamento", pct: 20 },
          { label: "Telecom", pct: 20 },
          { label: "Seguros", pct: 20 },
        ],
      },
      { label: "Ações internacionais (em dólar)", pct: 50, usd: true },
    ],
  },
  {
    key: "renda_fixa",
    name: "Renda fixa",
    pct: 20,
    color: "#22c55e",
    subs: [
      { label: "Tesouro Selic", pct: 15 },
      { label: "CDBs", pct: 15 },
      { label: "LCI / LCA", pct: 20 },
      { label: "Renda fixa em dólar (Treasuries, T-bills ou fundos de renda fixa em dólar)", pct: 50, usd: true },
    ],
  },
  {
    key: "oportunidades",
    name: "Reserva para oportunidades",
    pct: 20,
    color: "#3b82f6",
    subs: [
      { label: "CDB com liquidez diária", pct: 25 },
      { label: "Tesouro Selic", pct: 25 },
      { label: "Dólar ou stablecoins (USDC, T-bills de curto prazo)", pct: 50, usd: true },
    ],
  },
];

export const EMERGENCY_RESERVE_MONTHS = 12;

/** Meta de dolarização: percentual da carteira (nos cinco blocos) em ativos em dólar. */
export const DOLLAR_TARGET_PCT = 50;

/** Parte do bloco (em % do bloco) que é dolarizada, somando as subdivisões marcadas com `usd`. */
export function blockDollarShare(block: Block): number {
  return block.subs.reduce((a, s) => a + (s.usd ? s.pct : 0), 0);
}

export interface AllocationLine {
  label: string;
  cents: number;
  depth: number;
  /** Linha em dólar (conta para a meta de dolarização). */
  usd?: boolean;
}

export interface BlockPlan {
  block: Block;
  totalCents: number;
  lines: AllocationLine[];
}

/** Distribui um valor em centavos preservando a soma exata (maior resto). */
export function splitCents(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const floors = raw.map(Math.floor);
  let rest = total - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (rest <= 0) break;
    floors[i] += 1;
    rest -= 1;
  }
  return floors;
}

export function planAllocation(totalCents: number): BlockPlan[] {
  const blockCents = splitCents(totalCents, BLOCKS.map((b) => b.pct));
  return BLOCKS.map((block, bi) => {
    const subCents = splitCents(blockCents[bi], block.subs.map((s) => s.pct));
    const lines: AllocationLine[] = [];
    block.subs.forEach((sub, si) => {
      lines.push({ label: sub.label, cents: subCents[si], depth: 0, usd: sub.usd });
      if (sub.children) {
        const childCents = splitCents(subCents[si], sub.children.map((c) => c.pct));
        sub.children.forEach((c, ci) => lines.push({ label: c.label, cents: childCents[ci], depth: 1 }));
      }
    });
    return { block, totalCents: blockCents[bi], lines };
  });
}

export interface RebalanceRow {
  block: Block;
  currentCents: number;
  currentPct: number;
  targetCents: number;
  diffCents: number; // positivo = comprar, negativo = vender
}

export function rebalance(current: Record<BlockKey, number>): RebalanceRow[] {
  const total = BLOCKS.reduce((acc, b) => acc + (current[b.key] || 0), 0);
  const targets = splitCents(total, BLOCKS.map((b) => b.pct));
  return BLOCKS.map((block, i) => {
    const cur = current[block.key] || 0;
    return {
      block,
      currentCents: cur,
      currentPct: total > 0 ? (cur / total) * 100 : 0,
      targetCents: targets[i],
      diffCents: targets[i] - cur,
    };
  });
}

/** Valor futuro de aportes mensais com juros compostos (taxa anual efetiva). */
export function futureValue(monthly: number, annualRatePct: number, years: number, initial = 0): number {
  const i = Math.pow(1 + annualRatePct / 100, 1 / 12) - 1;
  const n = Math.round(years * 12);
  if (i === 0) return initial + monthly * n;
  return initial * Math.pow(1 + i, n) + monthly * ((Math.pow(1 + i, n) - 1) / i);
}

/** IPCA médio anual dos últimos 20 anos (2006 a 2025, média geométrica dos índices oficiais do IBGE): cerca de 5,5% ao ano. */
export const IPCA_MEDIO_20_ANOS = 5.5;

export interface ProjectionPoint { month: number; invested: number; nominal: number; real: number }

/** Valor futuro em meses, com valor inicial e aportes mensais (no fim de cada mês), e o mesmo valor descontada a inflação (poder de compra de hoje). */
export function projection(initial: number, monthly: number, annualRatePct: number, months: number, inflationPct: number): ProjectionPoint[] {
  const i = Math.pow(1 + annualRatePct / 100, 1 / 12) - 1;
  const inf = Math.pow(1 + inflationPct / 100, 1 / 12) - 1;
  const out: ProjectionPoint[] = [];
  let value = initial;
  for (let m = 0; m <= months; m++) {
    if (m > 0) value = value * (1 + i) + monthly;
    out.push({ month: m, invested: initial + monthly * m, nominal: value, real: value / Math.pow(1 + inf, m) });
  }
  return out;
}


/* ------------------------- Dolarização ------------------------- */

const USD_STABLES = new Set(["USDT", "USDC", "DAI", "USDE", "USDS", "FDUSD", "PYUSD", "TUSD", "USDP", "USDD", "GUSD", "RLUSD", "USD1"]);
/** Nome que indica ativo em dólar (renda fixa e reserva não têm código, então o nome da posição é o sinal). */
const USD_LABEL = /d[óo]lar|\busd|us\$|treasur|t-?bills?|t-?bonds?|stablecoin/i;
const FOREIGN_STOCK_LABEL = /exterior|internacional|\beua\b|\bUS\b/i;
/** ETFs da B3 que replicam índices de fora (valem em dólar). BDRs (ex.: AAPL34) são detectados pelo código. */
const INTL_ETFS = new Set(["IVVB11", "NASD11", "SPXI11", "WRLD11", "ACWI11", "EURP11", "USTK11", "XINA11", "BITH11", "ETHE11"]);

export interface DollarItem { block: BlockKey; label: string; ticker: string | null; cents: number }

/**
 * Diz se a posição está dolarizada, pelas regras do Protocolo:
 * cripto = sempre; ações = código dos EUA, BDR (final 32 a 39) ou ETF internacional, ou nome que indique exterior;
 * renda fixa = nome com "dólar", "USD" ou "Treasury"; reserva para oportunidades = posição com código de cripto (ex.: USDC) ou nome em dólar.
 */
export function isDollarHolding(h: { block: BlockKey; label: string; ticker: string | null }): boolean {
  const t = (h.ticker ?? "").toUpperCase();
  switch (h.block) {
    case "cripto":
      return true;
    case "acoes":
      if (t) return !/^[A-Z]{4}\d{1,2}$/.test(t) || /^[A-Z]{4}3[2-9]$/.test(t) || INTL_ETFS.has(t);
      return USD_LABEL.test(h.label) || FOREIGN_STOCK_LABEL.test(h.label);
    case "renda_fixa":
      return USD_LABEL.test(h.label);
    case "oportunidades":
      return !!t || USD_STABLES.has(h.label.trim().toUpperCase()) || USD_LABEL.test(h.label);
    default:
      return false;
  }
}

export interface DollarPart {
  key: BlockKey;
  label: string;
  cents: number;
  /** Percentual da carteira (nos cinco blocos) que esta parte representa. */
  pct: number;
  /** Quanto esta parte deveria pesar na carteira pelo Protocolo (ex.: 10). */
  targetPct: number;
}

export interface Dollarization {
  totalCents: number;
  dollarCents: number;
  pct: number;
  targetPct: number;
  /** Positivo = acima da meta; negativo = abaixo (falta dolarizar). */
  diffPct: number;
  /** Valor em reais que falta (positivo) ou sobra (negativo) para chegar na meta. */
  gapCents: number;
  parts: DollarPart[];
}

const DOLLAR_PART_LABEL: Partial<Record<BlockKey, string>> = {
  cripto: "Criptomoedas (100% dólar)",
  acoes: "Ações no exterior",
  renda_fixa: "Renda fixa em dólar",
  oportunidades: "Reserva em dólar ou stablecoins",
};

/** Mede quanto da carteira (soma dos cinco blocos) está dolarizado e compara com a meta de 50%. */
export function dollarization(items: DollarItem[]): Dollarization {
  const totalCents = items.reduce((a, h) => a + h.cents, 0);
  const parts: DollarPart[] = BLOCKS.filter((b) => blockDollarShare(b) > 0).map((b) => {
    const cents = items.filter((h) => h.block === b.key && isDollarHolding(h)).reduce((a, h) => a + h.cents, 0);
    return { key: b.key, label: DOLLAR_PART_LABEL[b.key] ?? b.name, cents, pct: totalCents > 0 ? (cents / totalCents) * 100 : 0, targetPct: (b.pct * blockDollarShare(b)) / 100 };
  });
  const dollarCents = parts.reduce((a, p) => a + p.cents, 0);
  const pct = totalCents > 0 ? (dollarCents / totalCents) * 100 : 0;
  return { totalCents, dollarCents, pct, targetPct: DOLLAR_TARGET_PCT, diffPct: pct - DOLLAR_TARGET_PCT, gapCents: Math.round((totalCents * DOLLAR_TARGET_PCT) / 100) - dollarCents, parts };
}
