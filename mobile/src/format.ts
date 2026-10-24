const num = (v: number, d: number) => {
  const [i, f] = Math.abs(v).toFixed(d).split(".");
  return `${v < 0 ? "-" : ""}${i.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}${f ? "," + f : ""}`;
};

/** Preço em dólar no padrão brasileiro: US$ 67.123,45 (moedas baratas mostram mais casas). */
export function usd(v: number): string {
  return `US$ ${num(v, v >= 1 ? 2 : v >= 0.01 ? 4 : 6)}`;
}

export const pct = (v: number | null): string => (v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${num(Math.abs(v), 2)}%`);

export function ago(t: number): string {
  const m = Math.max(0, Math.floor((Date.now() / 1000 - t) / 60));
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}
