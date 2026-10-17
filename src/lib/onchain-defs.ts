/**
 * Definições dos indicadores on-chain do Bitcoin (nomes, textos e formato).
 * Sem dependências de servidor: usado tanto pela API quanto pela tela.
 */

export const MAX_INDICATORS = 3;

export type Fmt = "ratio" | "usd" | "compact" | "pct" | "eh" | "trillion";
export type BaseKey = "supply" | "rc" | "hash" | "diff" | "addr" | "tx" | "tvol" | "sth" | "lth";
export type Group = "valuation" | "holders" | "price" | "network";

export interface IndicatorDef {
  id: string;
  name: string;
  group: Group;
  /** "price" usa o mesmo eixo do preço (em dólar); "own" ganha eixo próprio à direita. */
  axis: "price" | "own";
  scale: "linear" | "log";
  fmt: Fmt;
  lines: { label: string; dashed?: boolean }[];
  /** Linhas de referência horizontais (no eixo do indicador). */
  refs?: number[];
  /** Séries-base necessárias além do preço. */
  needs: BaseKey[];
  /** O que é e como ler. */
  desc: string;
}

export const GROUPS: { id: Group; label: string }[] = [
  { id: "valuation", label: "Valuation on-chain" },
  { id: "holders", label: "Detentores de curto e longo prazo (corte de 155 dias)" },
  { id: "price", label: "Médias e modelos de preço" },
  { id: "network", label: "Rede e mineração" },
];

export const INDICATORS: IndicatorDef[] = [
  {
    id: "mvrv", name: "MVRV", group: "valuation", axis: "own", scale: "log", fmt: "ratio", refs: [1, 3.5], needs: ["supply", "rc"],
    lines: [{ label: "MVRV" }],
    desc: "Valor de mercado dividido pelo valor realizado (o custo médio de aquisição de todas as moedas, medido no último preço em que cada uma se moveu). Acima de 1 a rede está, em média, no lucro. Historicamente, valores acima de cerca de 3,5 coincidiram com topos de ciclo e valores perto ou abaixo de 1 com fundos. Esses níveis foram diminuindo a cada ciclo.",
  },
  {
    id: "mvrv_z", name: "MVRV Z-Score", group: "valuation", axis: "own", scale: "linear", fmt: "ratio", refs: [0, 7], needs: ["supply", "rc"],
    lines: [{ label: "MVRV Z-Score" }],
    desc: "Diferença entre valor de mercado e valor realizado, dividida pelo desvio padrão histórico do valor de mercado. Normaliza o MVRV pela volatilidade. Zonas históricas: acima de 7 nos topos de ciclos anteriores; perto de 0 ou abaixo nos fundos de bear market.",
  },
  {
    id: "nupl", name: "NUPL", group: "valuation", axis: "own", scale: "linear", fmt: "ratio", refs: [0, 0.75], needs: ["supply", "rc"],
    lines: [{ label: "NUPL" }],
    desc: "Lucro ou prejuízo líquido não realizado em proporção ao valor de mercado: 1 menos valor realizado dividido por valor de mercado. Abaixo de 0 a rede inteira está no prejuízo (capitulação). Acima de 0,75 é a zona de euforia.",
  },
  {
    id: "realized_price", name: "Preço realizado", group: "valuation", axis: "price", scale: "log", fmt: "usd", needs: ["supply", "rc"],
    lines: [{ label: "Preço realizado" }],
    desc: "Valor realizado dividido pela oferta em circulação: o preço médio de custo da rede. Fica no mesmo eixo do preço. Preço abaixo da linha significa que o investidor médio está no prejuízo, situação típica dos fundos de bear market.",
  },
  {
    id: "realized_cap", name: "Valor de mercado vs. realizado", group: "valuation", axis: "own", scale: "log", fmt: "usd", needs: ["supply", "rc"],
    lines: [{ label: "Valor de mercado" }, { label: "Valor realizado", dashed: true }],
    desc: "Valor de mercado (preço × moedas) comparado ao valor realizado (cada moeda avaliada no preço do último movimento). A distância entre as duas linhas é a base do MVRV e do NUPL.",
  },
  {
    id: "thermocap", name: "Thermocap Multiple", group: "valuation", axis: "own", scale: "log", fmt: "ratio", needs: ["supply"],
    lines: [{ label: "Valor de mercado ÷ Thermocap" }],
    desc: "Valor de mercado dividido pelo Thermocap, que é a soma de toda a emissão paga aos mineradores, em dólar, desde o início. Mede quanto o mercado paga acima do que a segurança da rede já custou em emissão.",
  },
  {
    id: "puell", name: "Puell Multiple", group: "valuation", axis: "own", scale: "log", fmt: "ratio", refs: [0.5, 4], needs: ["supply"],
    lines: [{ label: "Puell Multiple" }],
    desc: "Emissão diária de moedas em dólar dividida pela média de 365 dias. Mostra a pressão de venda dos mineradores. Valores abaixo de 0,5 apareceram em fundos e estresse de mineração. Acima de 4 apareceu em topos de ciclo.",
  },
  {
    id: "nvt", name: "NVT (90 dias)", group: "valuation", axis: "own", scale: "log", fmt: "ratio", needs: ["supply", "tvol"],
    lines: [{ label: "NVT" }],
    desc: "Valor de mercado dividido pela média de 90 dias do valor transferido ajustado na rede, em dólar. É o equivalente do P/L do Bitcoin: valores altos indicam preço alto em relação ao uso da rede.",
  },
  {
    id: "sth_realized_price", name: "Preço realizado STH", group: "holders", axis: "price", scale: "log", fmt: "usd", needs: ["sth"],
    lines: [{ label: "Preço realizado STH" }],
    desc: "Preço médio de aquisição das moedas que se moveram nos últimos 155 dias, ou seja, dos detentores de curto prazo (STH). Fica no eixo do preço. Preço acima da linha: o comprador recente está no lucro, e a linha costuma funcionar como suporte em altas. Preço abaixo: o comprador recente está no prejuízo, e a linha costuma virar resistência. Dados gratuitos cobrem só os últimos 4 anos.",
  },
  {
    id: "lth_realized_price", name: "Preço realizado LTH", group: "holders", axis: "price", scale: "log", fmt: "usd", needs: ["lth"],
    lines: [{ label: "Preço realizado LTH" }],
    desc: "Preço médio de aquisição das moedas paradas há mais de 155 dias, os detentores de longo prazo (LTH). Fica no eixo do preço e sobe devagar, porque essas moedas raramente se movem. Nos fundos de ciclos anteriores o preço chegou perto dessa linha ou abaixo dela. Dados gratuitos cobrem só os últimos 4 anos.",
  },
  {
    id: "sth_mvrv", name: "MVRV STH", group: "holders", axis: "own", scale: "linear", fmt: "ratio", refs: [1], needs: ["sth"],
    lines: [{ label: "Preço ÷ preço realizado STH" }],
    desc: "Preço dividido pelo preço realizado dos detentores de curto prazo. Acima de 1 eles estão no lucro, abaixo de 1 estão no prejuízo. Picos altos mostram lucro curto prazo elevado e risco de realização. Dados gratuitos cobrem só os últimos 4 anos.",
  },
  {
    id: "lth_mvrv", name: "MVRV LTH", group: "holders", axis: "own", scale: "log", fmt: "ratio", refs: [1], needs: ["lth"],
    lines: [{ label: "Preço ÷ preço realizado LTH" }],
    desc: "Preço dividido pelo preço realizado dos detentores de longo prazo. Mede o lucro acumulado de quem segura há mais tempo: quanto maior, maior o incentivo para esses detentores venderem. Dados gratuitos cobrem só os últimos 4 anos.",
  },
  {
    id: "wma200", name: "Média móvel de 200 semanas", group: "price", axis: "price", scale: "log", fmt: "usd", needs: [],
    lines: [{ label: "MM 200 semanas" }],
    desc: "Média do preço diário nos últimos 1.400 dias (cerca de 200 semanas). Nos fundos de bear market anteriores, o preço tocou ou ficou abaixo dessa linha.",
  },
  {
    id: "dma200", name: "Média móvel de 200 dias", group: "price", axis: "price", scale: "log", fmt: "usd", needs: [],
    lines: [{ label: "MM 200 dias" }],
    desc: "Média simples do preço nos últimos 200 dias. Referência de tendência de médio prazo: preço acima dela indica tendência de alta.",
  },
  {
    id: "mayer", name: "Mayer Multiple", group: "price", axis: "own", scale: "linear", fmt: "ratio", refs: [1, 2.4], needs: [],
    lines: [{ label: "Preço ÷ MM 200 dias" }],
    desc: "Preço dividido pela média móvel de 200 dias. Abaixo de 1 o preço está abaixo da média. Acima de 2,4 foi considerado sobreaquecido nos ciclos anteriores.",
  },
  {
    id: "pi_cycle", name: "Pi Cycle Top", group: "price", axis: "price", scale: "log", fmt: "usd", needs: [],
    lines: [{ label: "MM 111 dias" }, { label: "MM 350 dias × 2", dashed: true }],
    desc: "A média de 111 dias cruzando acima de 2 vezes a média de 350 dias. Esse cruzamento ocorreu poucos dias antes dos topos de 2013, 2017 e 2021. É um padrão histórico de poucas amostras, não uma garantia.",
  },
  {
    id: "power_law", name: "Lei de potência", group: "price", axis: "price", scale: "log", fmt: "usd", needs: [],
    lines: [{ label: "Valor justo (lei de potência)" }],
    desc: "Ajuste estatístico do preço contra o tempo desde o bloco gênese (3 de janeiro de 2009), em escala log-log: preço = 10^(-17,016) × dias^5,845. Descreve a tendência de longo prazo e não prevê o preço. Parâmetros de Giovanni Santostasi.",
  },
  {
    id: "drawdown", name: "Queda desde a máxima", group: "price", axis: "own", scale: "linear", fmt: "pct", refs: [-50], needs: [],
    lines: [{ label: "Distância da máxima histórica" }],
    desc: "Quanto o preço está abaixo da sua máxima histórica anterior, em porcentagem. Mostra a profundidade e a duração das correções em cada ciclo.",
  },
  {
    id: "hashrate", name: "Hash rate", group: "network", axis: "own", scale: "log", fmt: "eh", needs: ["hash"],
    lines: [{ label: "Hash rate" }],
    desc: "Poder computacional total da rede, em exa-hashes por segundo. Mede a segurança da rede e o investimento dos mineradores.",
  },
  {
    id: "hash_ribbons", name: "Hash Ribbons", group: "network", axis: "own", scale: "log", fmt: "eh", needs: ["hash"],
    lines: [{ label: "Hash rate, média 30 dias" }, { label: "Hash rate, média 60 dias", dashed: true }],
    desc: "Médias de 30 e 60 dias do hash rate. Quando a de 30 dias cai abaixo da de 60, mineradores estão desligando máquinas (capitulação). O retorno da de 30 dias acima da de 60 sinalizou o fim dessa pressão em fundos anteriores.",
  },
  {
    id: "difficulty", name: "Dificuldade de mineração", group: "network", axis: "own", scale: "log", fmt: "trillion", needs: ["diff"],
    lines: [{ label: "Dificuldade (T)" }],
    desc: "Dificuldade para encontrar um bloco, ajustada a cada 2.016 blocos para manter 10 minutos por bloco. Acompanha o hash rate com defasagem.",
  },
  {
    id: "active_addr", name: "Endereços ativos (média 30 dias)", group: "network", axis: "own", scale: "log", fmt: "compact", needs: ["addr"],
    lines: [{ label: "Endereços ativos" }],
    desc: "Média de 30 dias de endereços únicos que enviaram ou receberam bitcoin por dia. Aproxima o uso e a adoção da rede.",
  },
  {
    id: "tx_count", name: "Transações (média 30 dias)", group: "network", axis: "own", scale: "log", fmt: "compact", needs: ["tx"],
    lines: [{ label: "Transações por dia" }],
    desc: "Média de 30 dias de transações confirmadas por dia. Mostra a atividade econômica na rede.",
  },
];

export const INDICATOR_BY_ID: Record<string, IndicatorDef> = Object.fromEntries(INDICATORS.map((d) => [d.id, d]));

export const DEFAULT_IDS = ["realized_price", "mvrv_z"];

export const PRESETS: { label: string; ids: string[] }[] = [
  { label: "Topo de ciclo", ids: ["mvrv_z", "puell", "pi_cycle"] },
  { label: "Fundo de ciclo", ids: ["realized_price", "wma200", "mvrv"] },
  { label: "Detentores", ids: ["sth_realized_price", "lth_realized_price", "sth_mvrv"] },
  { label: "Mineradores", ids: ["hash_ribbons", "puell", "difficulty"] },
  { label: "Modelos de preço", ids: ["power_law", "wma200", "mayer"] },
];

/** Lê "a,b,c" e devolve só ids válidos, sem repetição, até o limite. */
export function parseIds(raw: string | null | undefined): string[] {
  const out: string[] = [];
  for (const part of (raw || "").split(",")) {
    const id = part.trim();
    if (Object.hasOwn(INDICATOR_BY_ID, id) && !out.includes(id)) out.push(id);
    if (out.length >= MAX_INDICATORS) break;
  }
  return out;
}

/** Datas de halving (UTC). */
export const HALVINGS = ["2012-11-28", "2016-07-09", "2020-05-11", "2024-04-20"];

const DAY_MS = 86_400_000;
export const epochDay = (iso: string): number => Math.floor(Date.parse(iso.length === 10 ? `${iso}T00:00:00Z` : iso) / DAY_MS);
export const dayToDate = (day: number): Date => new Date(day * DAY_MS);

const nf = (v: number, min: number, max: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: min, maximumFractionDigits: max });

/** Formata um valor. `axis` usa a forma curta (rótulos de eixo). */
export function formatValue(fmt: Fmt, v: number, axis = false): string {
  const a = Math.abs(v);
  switch (fmt) {
    case "ratio":
      return a >= 100 ? nf(v, 0, 0) : a >= 10 ? nf(v, 0, 1) : nf(v, 2, 2);
    case "pct":
      return `${nf(v, 0, axis ? 0 : 1)}%`;
    case "eh":
      return `${nf(v, 0, a >= 100 ? 0 : 1)} EH/s`;
    case "trillion":
      return `${nf(v, 0, a >= 100 ? 0 : 1)} T`;
    case "compact":
      return a >= 1e9 ? `${nf(v / 1e9, 0, 1)} bi` : a >= 1e6 ? `${nf(v / 1e6, 0, 1)} mi` : a >= 1e3 ? `${nf(v / 1e3, 0, axis ? 0 : 1)} mil` : nf(v, 0, 0);
    case "usd":
      if (a >= 1e12) return `$${nf(v / 1e12, 0, 1)} tri`;
      if (a >= 1e9) return `$${nf(v / 1e9, 0, 1)} bi`;
      if (a >= 1e6) return `$${nf(v / 1e6, 0, 1)} mi`;
      if (axis) return a >= 1e4 ? `$${nf(v / 1e3, 0, 0)} mil` : a >= 1e3 ? `$${nf(v / 1e3, 0, 1)} mil` : a >= 10 ? `$${nf(v, 0, 0)}` : a >= 1 ? `$${nf(v, 0, 2)}` : `$${nf(v, 2, 2)}`;
      return a >= 100 ? `$${nf(v, 0, 0)}` : `$${nf(v, 2, 2)}`;
  }
}
