/** Zoom do eixo do tempo do gráfico on-chain. Índices são posições na série diária (0 … n-1). */
export const MIN_SPAN = 14;

/** Quanto a janela pode passar das pontas dos dados (espaço vazio, como no TradingView): 85% da largura da janela, então sempre sobra dado à vista. */
export const overshoot = (span: number) => Math.round(span * 0.85);
/** Início da janela dentro do permitido: pode sair das pontas dos dados até `overshoot`. */
export const clampStart = (a: number, span: number, n: number) => {
  const over = overshoot(span);
  return Math.max(-over, Math.min(n - 1 - span + over, a));
};

/**
 * Nova janela [a, b] depois de aproximar (factor < 1) ou afastar (factor > 1) o tempo, mantendo parado o ponto sob o cursor.
 * frac = posição do cursor dentro da janela (0 = esquerda, 1 = direita). Devolve null quando a janela passa a cobrir tudo (= voltar ao início).
 */
export function zoomWindow(i0: number, i1: number, n: number, factor: number, frac: number): [number, number] | null {
  const full = n - 1;
  if (full < MIN_SPAN) return null;
  const span = Math.max(1, i1 - i0);
  const next = Math.min(full, Math.max(MIN_SPAN, Math.round(span * factor)));
  if (next >= full) return null;
  const f = Math.min(1, Math.max(0, frac));
  const center = i0 + f * span;
  const a = clampStart(Math.round(center - f * next), next, n);
  return [a, a + next];
}
