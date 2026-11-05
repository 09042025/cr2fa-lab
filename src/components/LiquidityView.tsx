/** Distribuição de liquidez do pool com a faixa da posição destacada (dourado dentro, apagado fora). Somente leitura. */
export function LiquidityView({ bins, center, lo, hi, price, min, max, fmt }: {
  bins: number[]; center: number; lo: number; hi: number; price: number; min: number; max: number; fmt: (v: number) => string;
}) {
  const W = 800, H = 230, B = 22, T = 22;
  const llo = Math.log(lo), lhi = Math.log(hi);
  const fx = (v: number) => Math.min(1, Math.max(0, (Math.log(Math.max(v, 1e-300)) - llo) / (lhi - llo)));
  const bw = W / bins.length;
  const xin = fx(min) * W, xax = fx(max) * W, xp = fx(price) * W;
  const inRange = (k: number) => { const mid = Math.exp(llo + ((k + 0.5) / bins.length) * (lhi - llo)); return mid >= min && mid <= max; };
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 230 }} role="img" aria-label="Distribuição de liquidez">
        <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f2c14e" /><stop offset="100%" stopColor="#a87a10" /></linearGradient></defs>
        {bins.map((v, k) => <rect key={k} x={k * bw + 0.6} width={bw - 1.2} y={T + (1 - v) * (H - T - B)} height={Math.max(0, v * (H - T - B))} rx="1.5" fill={inRange(k) ? "url(#lg)" : "#2a3560"} />)}
        {[xin, xax].map((xx, n) => <g key={n}><line x1={xx} x2={xx} y1={T - 6} y2={H - B} stroke="#a78bfa" strokeDasharray="4 4" /><rect x={Math.min(W - 34, Math.max(0, xx - 17))} y={0} width="34" height="16" rx="3" fill="#7c3aed" /><text x={Math.min(W - 17, Math.max(17, xx))} y="11.5" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">{n ? "MÁX" : "MÍN"}</text></g>)}
        <line x1={xp} x2={xp} y1={T - 6} y2={H - B} stroke="#fff" strokeWidth="1.5" />
        <text x={Math.min(W - 40, Math.max(40, xp))} y={H - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">{fmt(price)}</text>
        <text x="2" y={H - 6} fontSize="10" fill="#8791b5">{fmt(lo)}</text>
        <text x={W - 2} y={H - 6} textAnchor="end" fontSize="10" fill="#8791b5">{fmt(hi)}</text>
      </svg>
      <p className="text-xs text-muted">Barras = liquidez de todo o pool por faixa de preço (escala logarítmica, de ⅓ a 3× o preço atual). Dourado = faixa da sua posição. Linha branca = preço atual. Faixa: {fmt(min)} a {fmt(max)}.</p>
    </div>
  );
}
