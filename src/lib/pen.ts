/** Caneta do gráfico on-chain: traços guardados em coordenadas do gráfico (dia e preço), para acompanhar o zoom. */
export interface PenPoint { i: number; v: number }
export interface PenStroke { id: number; color: string; width: number; pts: PenPoint[] }

/** Distância de um ponto a um segmento (todos em pixels). */
export function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Menor distância (em pixels) de um ponto a um traço já convertido para pixels. */
export function distToStroke(px: number, py: number, pts: { x: number; y: number }[]): number {
  if (pts.length === 0) return Infinity;
  if (pts.length === 1) return Math.hypot(px - pts[0].x, py - pts[0].y);
  let m = Infinity;
  for (let k = 1; k < pts.length; k++) m = Math.min(m, distToSegment(px, py, pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y));
  return m;
}

const MAX_STROKES = 300;
const KEY = "niza-onchain-pen:v1";

export function loadStrokes(): PenStroke[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((s) => s && Array.isArray(s.pts) && typeof s.color === "string" && Number.isFinite(s.width)).slice(-MAX_STROKES);
  } catch { return []; }
}
export function saveStrokes(s: PenStroke[]) {
  try { window.localStorage.setItem(KEY, JSON.stringify(s.slice(-MAX_STROKES))); } catch { /* sem armazenamento: segue sem salvar */ }
}
