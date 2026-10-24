/** Medidor em meia-lua (0 a 100), como no Fear and Greed da CoinMarketCap. */
export function Gauge({ value, label }: { value: number; label: string }) {
  const v = Math.min(Math.max(value, 0), 100);
  const R = 80;
  const cx = 100;
  const cy = 95;
  const pt = (pct: number, r = R) => {
    const a = Math.PI * (1 - pct / 100);
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)] as const;
  };
  const seg = (from: number, to: number, color: string) => {
    const [x1, y1] = pt(from);
    const [x2, y2] = pt(to);
    return <path key={from} d={`M${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 0 1 ${x2.toFixed(1)},${y2.toFixed(1)}`} stroke={color} strokeWidth="12" fill="none" />;
  };
  const [nx, ny] = pt(v, R);
  return (
    <svg viewBox="0 0 200 120" className="mx-auto w-full max-w-[260px]" role="img" aria-label={`${label}: ${v}`}>
      {seg(0, 24, "#ef4444")}{seg(26, 44, "#f59e0b")}{seg(46, 54, "#9ca3af")}{seg(56, 74, "#84cc16")}{seg(76, 100, "#22c55e")}
      <circle cx={nx} cy={ny} r="7" fill="#fff" stroke="#0e1730" strokeWidth="3" />
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="34" fontWeight="700" fill="#fff">{Math.round(v)}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="12" fill="#93a0c4">{label}</text>
    </svg>
  );
}
