"use client";

import { useMemo, useRef, useState } from "react";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number, d = 1) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d })}%`;
const mlabel = (m: string) => `${MONTHS[Number(m.slice(5)) - 1]}/${m.slice(2, 4)}`;

/* ------------------------- Pizza 3D: carteira x Protocolo ------------------------- */

export interface PieSlice { key: string; name: string; color: string; value: number; target: number }

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, "0")).join("")}`;
}

/** Ícones simples (douradinhos) de cada bloco, desenhados em torno de (0,0) numa caixa de ~40px. */
function Icon({ k }: { k: string }) {
  const g = "#f7e4a6", d = "#7a5410";
  const common = { stroke: d, strokeWidth: 1, strokeLinejoin: "round" as const };
  switch (k) {
    case "cripto":
      return <g><circle r="17" fill="#f3c04a" {...common} /><circle r="13" fill="none" stroke="#b8860b" strokeWidth="1.5" /><text y="1" textAnchor="middle" dominantBaseline="middle" fontSize="20" fontWeight={800} fill="#8a5a05">₿</text></g>;
    case "fiis":
      return <g {...common}><rect x="-17" y="-6" width="12" height="22" fill="#e9d3a0" /><rect x="-7" y="-18" width="16" height="34" fill={g} /><rect x="10" y="-2" width="10" height="18" fill="#e9d3a0" />{[-13, -5, 3, 11].map((y) => <rect key={y} x="-4" y={y} width="3" height="3" fill="#f3a712" stroke="none" />)}{[-13, -5, 3, 11].map((y) => <rect key={"b" + y} x="3" y={y} width="3" height="3" fill="#f3a712" stroke="none" />)}</g>;
    case "acoes":
      return <g {...common}><rect x="-17" y="2" width="8" height="14" fill={g} /><rect x="-6" y="-5" width="8" height="21" fill={g} /><rect x="5" y="-12" width="8" height="28" fill={g} /><path d="M-18 -2 L-7 -10 L0 -5 L14 -18" fill="none" stroke="#f3a712" strokeWidth="3" strokeLinecap="round" /><path d="M8 -19 L16 -19 L16 -11" fill="none" stroke="#f3a712" strokeWidth="3" strokeLinecap="round" /></g>;
    case "renda_fixa":
      return <g {...common}><path d="M-19 -6 L0 -18 L19 -6 Z" fill={g} />{[-13, -4.5, 4.5, 13].map((x) => <rect key={x} x={x - 2.5} y="-4" width="5" height="16" fill="#e9d3a0" />)}<rect x="-20" y="13" width="40" height="5" fill={g} /></g>;
    default:
      return <g {...common}>{[8, 0, -8].map((y, i) => <rect key={y} x={-17 + i * 2} y={y - 6} width="30" height="11" rx="2" fill={i === 2 ? "#cfe3ff" : "#9fc1f2"} />)}<circle cx="-2" cy="-8" r="3.5" fill="#6d9be0" stroke="none" /></g>;
  }
}

function Pie({ slices, hover, setHover, label, caption }: { slices: { key: string; color: string; v: number }[]; hover: string | null; setHover: (k: string | null) => void; label: string; caption: string }) {
  const W = 280, H = 300, c = W / 2, cy = 140, r = 118, depth = 14;
  const id = caption.replace(/\W/g, "");
  const total = slices.reduce((a, s) => a + s.v, 0);
  let a = -Math.PI / 2;
  const geo = slices.filter((s) => s.v > 0).map((s) => {
    const a0 = a, a1 = a + (s.v / (total || 1)) * Math.PI * 2;
    a = a1;
    return { ...s, a0, a1, mid: (a0 + a1) / 2, share: s.v / (total || 1) };
  });
  const path = (g: { a0: number; a1: number; share: number }, ox: number, oy: number) => {
    const p = (ang: number) => `${c + ox + r * Math.cos(ang)} ${cy + oy + r * Math.sin(ang)}`;
    if (g.share > 0.9999) return `M ${c + ox - r} ${cy + oy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`;
    return `M ${c + ox} ${cy + oy} L ${p(g.a0)} A ${r} ${r} 0 ${g.a1 - g.a0 > Math.PI ? 1 : 0} 1 ${p(g.a1)} Z`;
  };
  const off = (g: { key: string; mid: number; share: number }) => { const e = g.share > 0.9999 ? 0 : hover === g.key ? 9 : 3; return [Math.cos(g.mid) * e, Math.sin(g.mid) * e] as const; };
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-[280px]" role="img" aria-label={label} style={{ filter: "drop-shadow(0 14px 14px rgba(0,0,0,.55))" }}>
        <defs>
          {geo.map((g) => (
            <radialGradient key={g.key} id={`pg-${id}-${g.key}`} cx="35%" cy="28%" r="85%">
              <stop offset="0%" stopColor={shade(g.color, 0.42)} /><stop offset="55%" stopColor={g.color} /><stop offset="100%" stopColor={shade(g.color, -0.38)} />
            </radialGradient>
          ))}
          <linearGradient id={`rim-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f3c04a" /><stop offset="60%" stopColor="#b8780b" /><stop offset="100%" stopColor="#6d4506" /></linearGradient>
          <linearGradient id={`gloss-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fff" stopOpacity="0.38" /><stop offset="50%" stopColor="#fff" stopOpacity="0.05" /><stop offset="100%" stopColor="#fff" stopOpacity="0" /></linearGradient>
        </defs>
        {total <= 0 ? (
          <><ellipse cx={c} cy={cy + depth} rx={r} ry={r} fill="#3a2a08" /><circle cx={c} cy={cy} r={r} fill="#131f3f" stroke="#24335f" /></>
        ) : (
          <>
            {geo.map((g) => { const [dx, dy] = off(g); return <path key={`d-${g.key}`} d={path(g, dx, dy + depth)} fill={`url(#rim-${id})`} stroke="#4a2f04" strokeWidth="1" strokeLinejoin="round" />; })}
            {geo.map((g) => {
              const [dx, dy] = off(g);
              const ix = c + dx + Math.cos(g.mid) * r * 0.6, iy = cy + dy + Math.sin(g.mid) * r * 0.6;
              return (
                <g key={g.key} onMouseEnter={() => setHover(g.key)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer", transition: "opacity .15s" }} opacity={hover && hover !== g.key ? 0.6 : 1}>
                  <path d={path(g, dx, dy)} fill={`url(#pg-${id}-${g.key})`} stroke={shade(g.color, 0.55)} strokeWidth="1.4" strokeLinejoin="round" />
                  <path d={path(g, dx, dy)} fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="0.8" transform="translate(0.6 0.8)" />
                  {g.share > 0.07 && <g transform={`translate(${ix} ${iy}) scale(${Math.min(1.15, 0.55 + g.share * 2.2)})`}><Icon k={g.key} /></g>}
                </g>
              );
            })}
            <ellipse cx={c} cy={cy - r * 0.42} rx={r * 0.92} ry={r * 0.5} fill={`url(#gloss-${id})`} pointerEvents="none" />
          </>
        )}
      </svg>
      <figcaption className="-mt-1 text-center text-sm font-semibold text-gold-soft">{caption}</figcaption>
    </figure>
  );
}

export function ProtocolDashboard({ slices, totalCents }: { slices: PieSlice[]; totalCents: number }) {
  const [hover, setHover] = useState<string | null>(null);
  const total = totalCents / 100;
  const rows = slices.map((s) => ({ ...s, pct: total > 0 ? (s.value / total) * 100 : 0 }));
  return (
    <section className="card mb-6 p-4">
      <h2 className="mb-1 font-semibold">Carteira x Protocolo</h2>
      <p className="mb-3 text-sm text-muted">À esquerda, como está a sua carteira. À direita, o alvo do Protocolo CR2FA (20% em cada bloco).</p>
      <div className="grid items-center gap-4 [&>*]:min-w-0 grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)]">
        <div><Pie slices={rows.map((s) => ({ key: s.key, color: s.color, v: s.value }))} caption="Sua carteira" hover={hover} setHover={setHover} label="Distribuição atual da carteira" /></div>
        <div><Pie slices={rows.map((s) => ({ key: s.key, color: s.color, v: s.target }))} caption="Protocolo" hover={hover} setHover={setHover} label="Alvo do Protocolo: 20% em cada bloco" /></div>
        <table className="data col-span-2 w-full text-xs lg:col-span-1 [&_td]:px-2 [&_td]:py-1.5 [&_th]:px-2 [&_th]:text-[10px]">
          <thead><tr><th>Bloco</th><th className="num">Atual</th><th className="num">Alvo</th><th className="num">Diferença</th></tr></thead>
          <tbody>
            {rows.map((s) => {
              const diff = s.pct - s.target;
              return (
                <tr key={s.key} onMouseEnter={() => setHover(s.key)} onMouseLeave={() => setHover(null)} className={hover === s.key ? "bg-panel-2" : ""}>
                  <td><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.name}</td>
                  <td className="num">{pct(s.pct)}</td>
                  <td className="num">{pct(s.target, 0)}</td>
                  <td className={`num font-semibold ${Math.abs(diff) < 0.5 ? "" : diff > 0 ? "text-down" : "text-up"}`}>{diff > 0 ? "+" : ""}{pct(diff)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">Diferença em verde = abaixo do alvo (espaço para aportar); em vermelho = acima do alvo. A tabela de rebalanceamento abaixo mostra os valores em reais.</p>
    </section>
  );
}

/* ------------------------- Dividendos por mês (clicável) ------------------------- */

export interface IncomeMonthView { month: string; total: number; items: { ticker: string; date: string; perShare: number; qty: number; total: number }[] }

export function IncomeByMonth({ months }: { months: IncomeMonthView[] }) {
  const first = months.findIndex((m) => m.total > 0);
  const [sel, setSel] = useState(first >= 0 ? first : 0);
  const max = Math.max(...months.map((m) => m.total), 1);
  const total = months.reduce((a, m) => a + m.total, 0);
  const cur = months[sel];
  return (
    <section className="card mb-6 p-4">
      <h2 className="mb-1 font-semibold">Dividendos por mês</h2>
      <p className="mb-3 text-sm text-muted">
        Projeção dos próximos 12 meses: repete o que cada ativo pagou nos últimos 12 meses, multiplicado pela quantidade que você tem hoje. Total estimado: <strong className="text-white">{brl(total)}</strong> (média de {brl(total / 12)} por mês). Clique em um mês para ver de qual ativo vem.
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {months.map((m, i) => (
          <button type="button" key={m.month} onClick={() => setSel(i)} aria-pressed={i === sel}
            className={`rounded-lg border p-2 text-center text-xs transition ${i === sel ? "border-gold bg-gold/10" : "border-line bg-panel-2 hover:border-gold/50"}`}>
            <p className="font-semibold">{mlabel(m.month)}</p>
            <div className="mx-auto my-1 flex h-10 items-end"><div className="w-6 rounded-t bg-gold/70" style={{ height: `${Math.max(m.total ? 8 : 2, (m.total / max) * 40)}px` }} /></div>
            <p>{m.total ? brl(m.total) : "—"}</p>
          </button>
        ))}
      </div>
      {cur && (
        <div className="mt-4 rounded-lg border border-line bg-panel-2 p-3">
          <h3 className="mb-2 text-sm font-semibold">{mlabel(cur.month)}: {cur.total ? brl(cur.total) : "nenhum provento estimado"}</h3>
          {cur.items.length > 0 && (
            <table className="data w-full text-xs [&_td]:px-2 [&_td]:py-1.5 [&_th]:px-2">
              <thead><tr><th>Ativo</th><th>Data com (ano passado)</th><th className="num">Por cota/ação</th><th className="num">Quantidade</th><th className="num">Estimado</th></tr></thead>
              <tbody>
                {cur.items.map((x) => (
                  <tr key={`${x.ticker}-${x.date}`}>
                    <td className="font-semibold">{x.ticker}</td>
                    <td>{x.date.split("-").reverse().join("/")}</td>
                    <td className="num">{brl(x.perShare)}</td>
                    <td className="num">{x.qty.toLocaleString("pt-BR")}</td>
                    <td className="num font-semibold text-gold-soft">{brl(x.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      <p className="mt-2 text-xs text-muted">Estimativa baseada no histórico, não é promessa de pagamento. Considera só ações e FIIs com código e quantidade informados.</p>
    </section>
  );
}

/* ------------------------- Evolução interativa ------------------------- */

export interface EvoPoint { m: string; value: number }
const RANGES: { label: string; months: number | null }[] = [
  { label: "3 M", months: 3 }, { label: "6 M", months: 6 }, { label: "12 M", months: 12 },
  { label: "2 A", months: 24 }, { label: "3 A", months: 36 }, { label: "5 A", months: 60 }, { label: "Máx.", months: null },
];

export function EvolutionChart({ points, marketValue, invested }: { points: EvoPoint[]; marketValue: number; invested: number }) {
  // só oferece períodos que cabem nos dados que temos
  const ranges = RANGES.filter((r) => r.months === null || r.months <= points.length).filter((r, i, arr) => r.months === null ? arr.length > 1 : true);
  const [months, setMonths] = useState<number | null>(ranges.some((r) => r.months === 12) ? 12 : null);
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<SVGSVGElement>(null);
  const data = useMemo(() => (months ? points.slice(-months) : points), [points, months]);
  if (data.length < 2) return <p className="text-sm text-muted">Histórico de preços indisponível agora.</p>;

  const W = 800, H = 260, padL = 8, padR = 8, padT = 12, padB = 22;
  const vals = data.map((d) => d.value);
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const x = (i: number) => padL + (i / (data.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - min) / span) * (H - padT - padB);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const up = data[data.length - 1].value >= data[0].value;
  const color = up ? "#34d399" : "#f87171";
  const idx = hover ?? data.length - 1;
  const h = data[idx];
  const chg = ((h.value - data[0].value) / data[0].value) * 100;

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const f = (e.clientX - r.left) / r.width;
    setHover(Math.min(data.length - 1, Math.max(0, Math.round(f * (data.length - 1)))));
  }
  const step = Math.ceil(data.length / 7);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Período">
          {ranges.map((r) => (
            <button type="button" key={r.label} onClick={() => setMonths(r.months)} aria-pressed={months === r.months}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${months === r.months ? "border-gold bg-gold text-ink" : "border-line text-muted hover:text-white"}`}>{r.label}</button>
          ))}
        </div>
        <p className="text-xs text-muted">{data.length} meses de dados</p>
      </div>
      <div className="mb-1 flex flex-wrap items-baseline gap-x-4 text-sm">
        <span className="font-semibold">{mlabel(h.m)}: <span className="text-white">{brl(h.value)}</span></span>
        <span className={chg >= 0 ? "text-up" : "text-down"}>{chg >= 0 ? "▲" : "▼"} {pct(Math.abs(chg))} desde {mlabel(data[0].m)}</span>
        {invested > 0 && idx === data.length - 1 && <span className="text-muted">custo (preço médio): {brl(invested)}</span>}
      </div>
      <svg ref={box} viewBox={`0 0 ${W} ${H}`} className="h-auto w-full touch-none select-none" role="img" aria-label="Evolução da carteira"
        onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
        <defs><linearGradient id="evoGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.35" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="#24335f" strokeDasharray="4 6" />)}
        <path d={`${line} L${x(data.length - 1)},${H - padB} L${x(0)},${H - padB} Z`} fill="url(#evoGrad)" />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {hover !== null && <line x1={x(idx)} x2={x(idx)} y1={padT} y2={H - padB} stroke="#93a0c4" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />}
        {hover !== null && <circle cx={x(idx)} cy={y(h.value)} r="5" fill={color} stroke="#fff" strokeWidth="2" />}
        {data.map((d, i) => (i % step === 0 || i === data.length - 1) && (
          <text key={d.m} x={Math.min(W - 18, Math.max(18, x(i)))} y={H - 6} textAnchor="middle" fontSize="11" fill="#93a0c4">{mlabel(d.m)}</text>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-muted"><span>Mín. {brl(min)}</span><span>Máx. {brl(max)}</span></div>
      <p className="sr-only">Valor de mercado hoje {brl(marketValue)}</p>
    </div>
  );
}
