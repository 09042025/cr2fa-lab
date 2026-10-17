export const usd = (v: number | null | undefined, digits = 2) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? "—"
    : v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: v >= 1 ? digits : 6 });

export const usdCompact = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? "—"
    : v.toLocaleString("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 });

export const brl = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? "—"
    : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const brlCompact = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? "—"
    : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 2 });

export const pct = (v: number | null | undefined, digits = 2) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? "—"
    : `${v.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;

export const dateTime = (unix: number | null | undefined) =>
  unix ? new Date(unix * 1000).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }) : "—";

export const date = (unix: number | null | undefined) =>
  unix ? new Date(unix * 1000).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—";
