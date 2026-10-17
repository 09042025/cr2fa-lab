/** Cálculos de escala, marcas de eixo e amostragem para o gráfico on-chain. Funções puras. */

type Series = (number | null)[];

/** Menor e maior valor válido de várias séries entre as posições i0 e i1. Em escala log ignora valores <= 0. */
export function extent(arrs: Series[], i0: number, i1: number, log: boolean): [number, number] | null {
  let min = Infinity;
  let max = -Infinity;
  for (const a of arrs) {
    for (let i = Math.max(0, i0); i <= Math.min(a.length - 1, i1); i++) {
      const v = a[i];
      if (v === null || v === undefined || !Number.isFinite(v) || (log && v <= 0)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  return min <= max ? [min, max] : null;
}

/** Folga de 5% em cada ponta (em escala log, na proporção do logaritmo). */
export function padExtent([min, max]: [number, number], log: boolean, frac = 0.05): [number, number] {
  if (min === max) return log ? [min / 1.5, max * 1.5] : [min - 1, max + 1];
  if (log) {
    const lo = Math.log10(min);
    const hi = Math.log10(max);
    const p = (hi - lo) * frac;
    return [Math.pow(10, lo - p), Math.pow(10, hi + p)];
  }
  const p = (max - min) * frac;
  return [min - p, max + p];
}

/** Marcas "redondas" (1, 2, 5 × 10^k) para uma escala linear, perto de `target` marcas. */
export function linearTicks(min: number, max: number, target = 6): number[] {
  if (!(max > min)) return [min];
  const raw = (max - min) / target;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / pow;
  const step = (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * pow;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(Number(v.toPrecision(12)));
  return out;
}

/** Marcas para escala log: usa só potências de 10 quando a faixa é grande e acrescenta 2 e 5 quando é curta. */
export function logTicks(min: number, max: number): number[] {
  if (!(min > 0) || !(max > min)) return [];
  const sets = [[1], [1, 3], [1, 2, 5], [1, 2, 3, 4, 5, 6, 7, 8, 9]];
  const build = (mantissas: number[]) => {
    const out: number[] = [];
    for (let k = Math.floor(Math.log10(min)); k <= Math.ceil(Math.log10(max)); k++) {
      for (const m of mantissas) {
        const v = m * Math.pow(10, k);
        if (v >= min && v <= max) out.push(Number(v.toPrecision(12)));
      }
    }
    return out;
  };
  let last: number[] = [];
  for (const s of sets) {
    const t = build(s);
    last = t;
    if (t.length >= 4 && t.length <= 10) return t;
    if (t.length > 10) break;
  }
  // Se passou do limite, volta ao conjunto anterior mais grosso; se ficou curto demais, usa o mais fino.
  const idx = sets.findIndex((s) => build(s).length > 10);
  return idx > 0 ? build(sets[idx - 1]) : last;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const DAY_MS = 86_400_000;

/** Marcas de data (início de mês) entre dois dias (dias desde 1970), com no máximo `maxLabels` marcas. */
export function dateTicks(d0: number, d1: number, maxLabels = 8): { day: number; label: string }[] {
  const a = new Date(d0 * DAY_MS);
  const b = new Date(d1 * DAY_MS);
  const m0 = a.getUTCFullYear() * 12 + a.getUTCMonth();
  const m1 = b.getUTCFullYear() * 12 + b.getUTCMonth();
  for (const step of [1, 2, 3, 6, 12, 24, 60, 120]) {
    const out: { day: number; label: string }[] = [];
    for (let m = Math.ceil(m0 / step) * step; m <= m1; m += step) {
      const y = Math.floor(m / 12);
      const mo = m % 12;
      const day = Math.floor(Date.UTC(y, mo, 1) / DAY_MS);
      if (day < d0 || day > d1) continue;
      out.push({ day, label: step >= 12 ? String(y) : `${MESES[mo]}/${String(y).slice(2)}` });
    }
    if (out.length <= maxLabels) return out;
  }
  return [];
}

/**
 * Posições a desenhar numa linha, entre i0 e i1, para ~`buckets` blocos. Em cada bloco mantém o primeiro, o mínimo,
 * o máximo e o último ponto, para não perder picos ao reduzir os dados.
 */
export function sampleIndices(values: Series, i0: number, i1: number, buckets: number): number[] {
  const lo = Math.max(0, i0);
  const hi = Math.min(values.length - 1, i1);
  const count = hi - lo + 1;
  if (count <= 0) return [];
  const size = Math.max(1, Math.ceil(count / Math.max(1, buckets)));
  const out: number[] = [];
  for (let s = lo; s <= hi; s += size) {
    const e = Math.min(hi, s + size - 1);
    let first = -1;
    let last = -1;
    let minI = -1;
    let maxI = -1;
    for (let i = s; i <= e; i++) {
      const v = values[i];
      if (v === null || v === undefined || !Number.isFinite(v)) continue;
      if (first < 0) first = i;
      last = i;
      if (minI < 0 || v < (values[minI] as number)) minI = i;
      if (maxI < 0 || v > (values[maxI] as number)) maxI = i;
    }
    if (first >= 0) out.push(...new Set([first, minI, maxI, last].sort((x, y) => x - y)));
  }
  return out;
}

/** Monta o atributo `d` de um path SVG. Interrompe a linha onde há buracos nos dados. */
export function linePath(idx: number[], x: (i: number) => number, y: (v: number) => number | null, values: Series, gap: number): string {
  let d = "";
  let prev = -Infinity;
  for (const i of idx) {
    const v = values[i];
    if (v === null || v === undefined) continue;
    const py = y(v);
    if (py === null) { prev = -Infinity; continue; }
    d += `${i - prev > gap ? "M" : "L"}${x(i).toFixed(1)},${py.toFixed(1)}`;
    prev = i;
  }
  return d.startsWith("L") ? `M${d.slice(1)}` : d;
}
