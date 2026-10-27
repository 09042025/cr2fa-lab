/** Nomes oficiais dos fundos são enormes ("... FUNDO DE INVESTIMENTO IMOBILIÁRIO RESPONSABILIDADE LIMITADA"): encurta para caber na tela. */
export function shortName(name: string): string {
  const short = name
    .replace(/\s*-?\s*(FUNDO DE INVESTIMENTO IMOBILI[ÁA]RIO|FUNDO DE INVESTIMENTO|FDO\.? INV\.? IMOB\.?)\b/gi, "")
    .replace(/\s*-?\s*RESPONSABILIDADE LIMITADA\b/gi, "")
    .replace(/\s*-\s*FII\b/gi, "")
    .replace(/\s+(DE\s+)?RESPONSABILIDADE\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s-]+$/, "")
    .trim();
  return short.length >= 3 ? short : name;
}
