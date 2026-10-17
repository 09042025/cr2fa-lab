export type BlockKey = "cripto" | "fiis" | "acoes" | "renda_fixa" | "oportunidades";

export interface SubAllocation {
  label: string;
  pct: number; // percentual dentro do bloco
  children?: SubAllocation[];
}

export interface Block {
  key: BlockKey;
  name: string;
  pct: number; // percentual da carteira
  color: string;
  subs: SubAllocation[];
}

/** Protocolo CR2FA: cinco blocos de 20%, com diversificação em duas camadas. */
export const BLOCKS: Block[] = [
  {
    key: "cripto",
    name: "Criptomoedas",
    pct: 20,
    color: "#d9a520",
    subs: [
      { label: "Bitcoin (BTC)", pct: 60 },
      { label: "Ethereum (ETH)", pct: 10 },
      { label: "Stablecoins rendendo (Aave ou Kamino)", pct: 30 },
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
      { label: "Ações internacionais", pct: 50 },
    ],
  },
  {
    key: "renda_fixa",
    name: "Renda fixa",
    pct: 20,
    color: "#22c55e",
    subs: [
      { label: "Tesouro Selic", pct: 30 },
      { label: "CDBs", pct: 30 },
      { label: "LCI / LCA", pct: 40 },
    ],
  },
  {
    key: "oportunidades",
    name: "Reserva para oportunidades",
    pct: 20,
    color: "#3b82f6",
    subs: [
      { label: "CDB com liquidez diária", pct: 50 },
      { label: "Tesouro Selic", pct: 50 },
    ],
  },
];

export const EMERGENCY_RESERVE_MONTHS = 12;

export interface AllocationLine {
  label: string;
  cents: number;
  depth: number;
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
      lines.push({ label: sub.label, cents: subCents[si], depth: 0 });
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
