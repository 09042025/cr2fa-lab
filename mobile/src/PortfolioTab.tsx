import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";
import { send } from "./api";
import { ConfirmAct } from "./actions";
import { C } from "./theme";
import { useApi } from "./useApi";
import { Card, GoldButton, H2, Muted, Status } from "./ui";

interface Row { key: string; name: string; color: string; currentCents: number; currentPct: number; targetCents: number; diffCents: number }
interface Holding { id: number; block: string; label: string; valueCents: number; source: string; ticker: string | null; qty: number | null; avgPrice: number | null; price: number | null; resultPct: number | null }
interface Data {
  totalCents: number; rows: Row[]; holdings: Holding[];
  change30: { cents: number; pct: number } | null;
  income: { month: string; total: number }[]; income12: number; dyPct: number | null;
  evolution: { m: string; value: number }[]; marketValue: number; invested: number;
}

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const group = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const brl = (cents: number) => "R$ " + group((cents / 100).toFixed(2)).replace(/\.(\d\d)$/, ",$1");
const brlV = (v: number) => brl(Math.round(v * 100));
const pct = (v: number, d = 1) => v.toFixed(d).replace(".", ",") + "%";
const mlabel = (m: string) => `${MONTHS[Number(m.slice(5)) - 1]}\n${m.slice(2, 4)}`;
const input = { backgroundColor: C.ink, borderColor: C.line, borderWidth: 1, borderRadius: 10, color: C.white, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 } as const;
const num = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ borderRadius: 999, borderWidth: 1, borderColor: on ? C.gold : C.line, backgroundColor: on ? C.gold : "transparent", paddingHorizontal: 16, paddingVertical: 8 }}>
      <Text style={{ color: on ? C.ink : C.muted, fontWeight: "700", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

/** Linha com área, estilo "Evolução patrimonial". */
function Line({ points, labels, hide }: { points: number[]; labels: string[]; hide: boolean }) {
  const [w, setW] = useState(300);
  const H = 160, padB = 22;
  if (points.length < 2) return <Muted>Histórico de preços indisponível agora.</Muted>;
  const min = Math.min(...points), max = Math.max(...points), span = max - min || 1;
  const x = (i: number) => (i / (points.length - 1)) * w;
  const y = (v: number) => 8 + (1 - (v - min) / span) * (H - padB - 16);
  const d = points.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const up = points[points.length - 1] >= points[0];
  const c = up ? C.up : C.down;
  const step = Math.ceil(points.length / 6);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Svg width={w} height={H}>
        <Defs><LinearGradient id="g" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={c} stopOpacity="0.35" /><Stop offset="1" stopColor={c} stopOpacity="0" /></LinearGradient></Defs>
        <Path d={`${d} L${w},${H - padB} L0,${H - padB} Z`} fill="url(#g)" />
        <Path d={d} stroke={c} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
        {labels.map((l, i) => (i % step === 0 || i === labels.length - 1) ? <SvgText key={i} x={Math.min(w - 8, Math.max(8, x(i)))} y={H - 6} fill={C.muted} fontSize="10" textAnchor="middle">{l.replace("\n", " ")}</SvgText> : null)}
      </Svg>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Muted>Mín. {hide ? "••••" : brlV(min)}</Muted><Muted>Máx. {hide ? "••••" : brlV(max)}</Muted>
      </View>
    </View>
  );
}

function Bars({ income, hide }: { income: { month: string; total: number }[]; hide: boolean }) {
  const [w, setW] = useState(300);
  const H = 130, padB = 28;
  const max = Math.max(...income.map((i) => i.total), 1);
  const bw = w / income.length;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Svg width={w} height={H}>
        {income.map((m, i) => {
          const h = m.total ? Math.max(4, (m.total / max) * (H - padB - 6)) : 2;
          return (
            <View key={m.month}>
              <Rect x={i * bw + bw * 0.2} y={H - padB - h} width={bw * 0.6} height={h} rx={3} fill={m.total ? C.gold : C.line} />
              <SvgText x={i * bw + bw / 2} y={H - 14} fill={C.muted} fontSize="9" textAnchor="middle">{MONTHS[Number(m.month.slice(5)) - 1]}</SvgText>
              <SvgText x={i * bw + bw / 2} y={H - 3} fill={C.muted} fontSize="8" textAnchor="middle">{m.month.slice(2, 4)}</SvgText>
            </View>
          );
        })}
      </Svg>
      {!hide && <Muted>Maior mês: {brlV(max)}</Muted>}
    </View>
  );
}

/** Carteira (Premium), no formato da tela de carteira da B3: patrimônio, alocação, evolução e proventos. */
export function PortfolioTab() {
  const { data, error, loading, reload } = useApi<Data>("/api/mobile/portfolio");
  const [hide, setHide] = useState(false);
  const [view, setView] = useState<"classe" | "produto">("classe");
  const [all, setAll] = useState(false);
  const [range, setRange] = useState<3 | 6 | 12>(12);
  const [open, setOpen] = useState<{ id: number; mode: "buy" | "sell" | "set" } | null>(null);
  const [q, setQ] = useState(""); const [p, setP] = useState("");
  const [block, setBlock] = useState("acoes");
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [ticker, setTicker] = useState("");
  const [qty, setQty] = useState("");
  const [avg, setAvg] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const mask = (s: string) => (hide ? "R$ ••••" : s);

  async function add() {
    const v = value ? num(value) : 0;
    const t = ticker.trim().toUpperCase();
    if (!label.trim() && !t) return setMsg("Informe o nome ou o código.");
    if (!t && !(v >= 0)) return setMsg("Confira o valor (ex.: 1500,00).");
    const body = { block, label: (label.trim() || t), value: Number.isFinite(v) ? v : 0, ticker: t || undefined, qty: qty ? num(qty) : undefined, avgPrice: avg ? num(avg) : undefined };
    const e = await send("/api/portfolio", body);
    if (e) return setMsg(e);
    setLabel(""); setValue(""); setTicker(""); setQty(""); setAvg(""); setMsg(null); void reload();
  }
  async function remove(id: number) {
    const e = await send("/api/portfolio?id=" + id, undefined, "DELETE");
    if (e) setMsg(e); else void reload();
  }
  async function act() {
    if (!open) return;
    const e = await send("/api/portfolio", { id: open.id, action: open.mode, qty: num(q), price: open.mode === "sell" ? undefined : num(p) }, "PATCH");
    if (e) return setMsg(e);
    setOpen(null); setQ(""); setP(""); setMsg(null); void reload();
  }

  const d = data;
  const evo = d ? d.evolution.slice(-range) : [];
  const cards = !d ? [] : view === "classe"
    ? d.rows.filter((r) => r.currentCents > 0).map((r) => ({ id: r.key, name: r.name, cents: r.currentCents, pct: r.currentPct, color: r.color }))
    : [...d.holdings].sort((a, b) => b.valueCents - a.valueCents).map((h) => ({ id: String(h.id), name: h.label, cents: h.valueCents, pct: d.totalCents ? (h.valueCents / d.totalCents) * 100 : 0, color: d.rows.find((r) => r.key === h.block)?.color ?? C.gold }));
  const shown = all ? cards : cards.slice(0, 3);

  return (
    <>
      <Status loading={loading && !d} error={error} onRetry={reload} />
      {d && (
        <>
          <Card style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: C.white, fontSize: 20 }}>Minha carteira</Text>
              <Pressable onPress={() => setHide(!hide)} hitSlop={10}><Text style={{ color: C.goldSoft, fontWeight: "700" }}>{hide ? "Exibir" : "Ocultar"}</Text></Pressable>
            </View>
            <Muted>Atualizado em {new Date().toLocaleDateString("pt-BR")}</Muted>
            <Text style={{ color: C.white, fontSize: 32, fontWeight: "700", marginTop: 6 }}>{mask(brl(d.totalCents))}</Text>
            {d.change30 && (
              <Text style={{ color: d.change30.cents >= 0 ? C.up : C.down, fontWeight: "600" }}>
                {d.change30.cents >= 0 ? "▲" : "▼"} {hide ? "R$ ••••" : brl(Math.abs(d.change30.cents))} ({hide ? "••••" : pct(Math.abs(d.change30.pct))}) em 30 dias
              </Text>
            )}
            {d.invested > 0 && <Muted>Custo (preço médio): {mask(brlV(d.invested))} · Resultado: {hide ? "••••" : pct(((d.marketValue - d.invested) / d.invested) * 100)}</Muted>}
          </Card>

          <Card style={{ gap: 12 }}>
            <H2>Alocação</H2>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Chip label="Classe" on={view === "classe"} onPress={() => setView("classe")} />
              <Chip label="Produto" on={view === "produto"} onPress={() => setView("produto")} />
            </View>
            {shown.length === 0 && <Muted>Nenhuma posição registrada.</Muted>}
            {shown.map((c) => (
              <View key={c.id} style={{ backgroundColor: C.panel2, borderLeftWidth: 5, borderLeftColor: c.color, borderRadius: 12, padding: 14, gap: 4 }}>
                <Text style={{ color: C.white, fontSize: 16, fontWeight: "600" }}>{c.name}</Text>
                <Text style={{ color: C.muted }}>{hide ? "••••" : pct(c.pct)} da carteira</Text>
                <Text style={{ color: C.goldSoft, fontSize: 20, fontWeight: "700" }}>{mask(brl(c.cents))}</Text>
              </View>
            ))}
            {cards.length > 3 && <GoldButton ghost label={all ? "Mostrar menos" : "Acessar todos os produtos"} onPress={() => setAll(!all)} />}
            {view === "classe" && d.rows.some((r) => r.diffCents !== 0) && d.totalCents > 0 && (
              <View style={{ gap: 4, marginTop: 4 }}>
                <Text style={{ color: C.white, fontWeight: "600" }}>Rebalanceamento (meta 20% por bloco)</Text>
                {d.rows.map((r) => <Text key={r.key} style={{ color: r.diffCents > 0 ? C.up : r.diffCents < 0 ? C.down : C.muted, fontSize: 13 }}>{r.name}: {r.diffCents > 0 ? "comprar " : r.diffCents < 0 ? "vender " : "em dia "}{r.diffCents !== 0 ? mask(brl(Math.abs(r.diffCents))) : ""}</Text>)}
                <Muted>Antes de vender, considere impostos e custos da operação.</Muted>
              </View>
            )}
          </Card>

          <Card style={{ gap: 12 }}>
            <H2>Evolução patrimonial</H2>
            <Text style={{ color: C.white, fontSize: 24, fontWeight: "700" }}>{mask(brlV(d.marketValue))}</Text>
            <Line points={evo.map((e) => e.value)} labels={evo.map((e) => mlabel(e.m))} hide={hide} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Chip label="3 M" on={range === 3} onPress={() => setRange(3)} />
              <Chip label="6 M" on={range === 6} onPress={() => setRange(6)} />
              <Chip label="12 M" on={range === 12} onPress={() => setRange(12)} />
            </View>
            <Muted>Como a carteira de hoje (mesmas quantidades) se comportou, com o fechamento mensal das cotações.</Muted>
          </Card>

          <Card style={{ gap: 10 }}>
            <H2>Proventos</H2>
            <Text style={{ color: C.white, fontSize: 24, fontWeight: "700" }}>{mask(brlV(d.income12))}</Text>
            <Muted>Estimativa para os próximos 12 meses{d.dyPct !== null ? ` · Dividend yield da carteira ${hide ? "••••" : pct(d.dyPct)}` : ""}{d.income12 > 0 ? ` · média ${hide ? "R$ ••••" : brlV(d.income12 / 12)}/mês` : ""}</Muted>
            {d.income12 > 0 ? <Bars income={d.income} hide={hide} /> : <Muted>Adicione ações ou FIIs com código e quantidade para ver os dividendos por mês.</Muted>}
            <Muted>Repete o que cada ativo pagou nos últimos 12 meses vezes a sua quantidade. É estimativa, não promessa de pagamento.</Muted>
          </Card>

          <Card style={{ gap: 12 }}>
            <H2>Posições</H2>
            <Muted>Preço médio como na B3: a compra recalcula a média; a venda não muda o preço médio.</Muted>
            {d.holdings.length === 0 && <Muted>Nenhuma posição registrada.</Muted>}
            {d.holdings.map((h) => (
              <View key={h.id} style={{ gap: 4, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: C.white, fontWeight: "600", flexShrink: 1 }}>{h.label}{h.source === "b3" ? "  · B3" : ""}</Text>
                  <Text style={{ color: C.white, fontWeight: "600" }}>{mask(brl(h.valueCents))}</Text>
                </View>
                {h.ticker && h.qty ? (
                  <Text style={{ color: C.muted, fontSize: 13 }}>
                    {h.qty.toLocaleString("pt-BR")} un. · PM {h.avgPrice ? brlV(h.avgPrice) : "informe em Ajustar"} · atual {h.price ? brlV(h.price) : "—"}
                    {h.resultPct !== null ? <Text style={{ color: h.resultPct >= 0 ? C.up : C.down }}>{`  ${h.resultPct >= 0 ? "▲" : "▼"} ${pct(Math.abs(h.resultPct))}`}</Text> : null}
                  </Text>
                ) : <Text style={{ color: C.muted, fontSize: 13 }}>{d.rows.find((r) => r.key === h.block)?.name}</Text>}
                <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
                  {h.ticker && h.qty ? (["buy", "sell", "set"] as const).map((m) => (
                    <Pressable key={m} onPress={() => { setOpen(open?.id === h.id && open.mode === m ? null : { id: h.id, mode: m }); setQ(""); setP(""); setMsg(null); }}>
                      <Text style={{ color: m === "buy" ? C.up : m === "sell" ? C.down : C.muted, fontSize: 13, textDecorationLine: "underline" }}>{m === "buy" ? "Compra" : m === "sell" ? "Venda" : "Ajustar"}</Text>
                    </Pressable>
                  )) : null}
                  <ConfirmAct label="Apagar" ask="Apagar esta posição?" onConfirm={() => remove(h.id)} />
                </View>
                {open?.id === h.id && (
                  <View style={{ gap: 8, marginTop: 4 }}>
                    <TextInput value={q} onChangeText={setQ} placeholder={open.mode === "set" ? "Quantidade total" : "Quantidade"} placeholderTextColor={C.muted} style={input} keyboardType="decimal-pad" />
                    {open.mode !== "sell" && <TextInput value={p} onChangeText={setP} placeholder={open.mode === "set" ? "Preço médio (R$)" : "Preço pago (R$)"} placeholderTextColor={C.muted} style={input} keyboardType="decimal-pad" />}
                    <GoldButton label="Confirmar" onPress={act} />
                  </View>
                )}
              </View>
            ))}
            {msg && <Text style={{ color: C.down }}>{msg}</Text>}
          </Card>

          <Card style={{ gap: 10 }}>
            <H2>Adicionar posição</H2>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {d.rows.map((r) => (
                <Pressable key={r.key} onPress={() => setBlock(r.key)} style={{ borderRadius: 999, borderWidth: 1, borderColor: block === r.key ? C.gold : C.line, paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Text style={{ color: block === r.key ? C.goldSoft : C.muted, fontSize: 13 }}>{r.name}</Text>
                </Pressable>
              ))}
            </View>
            {(block === "acoes" || block === "fiis") && <>
              <TextInput value={ticker} onChangeText={setTicker} placeholder="Código (ex.: BBAS3)" placeholderTextColor={C.muted} style={input} autoCapitalize="characters" maxLength={7} />
              <TextInput value={qty} onChangeText={setQty} placeholder="Quantidade" placeholderTextColor={C.muted} style={input} keyboardType="decimal-pad" />
              <TextInput value={avg} onChangeText={setAvg} placeholder="Preço médio (R$)" placeholderTextColor={C.muted} style={input} keyboardType="decimal-pad" />
            </>}
            {!(block === "acoes" || block === "fiis") && <>
              <TextInput value={label} onChangeText={setLabel} placeholder="Nome (ex.: Bitcoin, CDB C6)" placeholderTextColor={C.muted} style={input} maxLength={60} />
              <TextInput value={value} onChangeText={setValue} placeholder="Valor em R$ (ex.: 1500,00)" placeholderTextColor={C.muted} style={input} keyboardType="decimal-pad" />
            </>}
            <GoldButton label="Adicionar" onPress={add} />
          </Card>
        </>
      )}
    </>
  );
}
