import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { rate, usdCompact } from "../src/format";
import { C } from "../src/theme";
import { useApi } from "../src/useApi";
import { Card, H2, Muted, ProGate, Screen, Status } from "../src/ui";

interface Pool { id: string; symbol: string; project: string; chain: string; poolMeta: string | null; stablecoin: boolean; rwa: boolean; tvlUsd: number; volumeUsd1d: number | null; turnover: number | null; apyBase: number | null; apyReward: number | null; apy: number | null; apyMean30d: number | null; il7d: number | null }
interface Data { dexes?: string[]; tipo: "liquidez" | "rendimento"; total: number; chains: string[]; pools: Pool[]; fetchedAt: number | null; stale: boolean }

const chip = (on: boolean) => ({ paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: on ? C.gold : C.line, backgroundColor: on ? C.gold : C.panel2 });
const Chip = ({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) => <Pressable onPress={onPress} style={chip(on)}><Text style={{ color: on ? C.ink : C.white, fontWeight: "700" }}>{label}</Text></Pressable>;
const Stat = ({ l, v, gold }: { l: string; v: string; gold?: boolean }) => <View style={{ minWidth: "30%" }}><Text style={{ color: C.muted, fontSize: 11 }}>{l}</Text><Text style={{ color: gold ? C.goldSoft : C.white, fontWeight: "700" }}>{v}</Text></View>;

/** Caixa de seleção (lista que abre por cima), como os filtros do site. */
function Select({ label, value, options, onChange }: { label: string; value: string; options: { v: string; l: string }[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const cur = options.find((o) => o.v === value)?.l ?? options[0]?.l ?? "";
  return (
    <View style={{ flex: 1, minWidth: "45%" }}>
      <Text style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>{label}</Text>
      <Pressable onPress={() => setOpen(true)} style={{ backgroundColor: C.ink, borderColor: C.line, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", justifyContent: "space-between", gap: 6 }}>
        <Text style={{ color: C.white, flexShrink: 1 }} numberOfLines={1}>{cur}</Text><Text style={{ color: C.muted }}>▾</Text>
      </Pressable>
      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 24 }}>
          <View style={{ backgroundColor: C.panel, borderColor: C.line, borderWidth: 1, borderRadius: 14, maxHeight: "70%" }}>
            <Text style={{ color: C.goldSoft, fontWeight: "700", padding: 14, paddingBottom: 6 }}>{label}</Text>
            <ScrollView>
              {options.map((o) => (
                <Pressable key={o.v} onPress={() => { onChange(o.v); setOpen(false); }} style={{ paddingHorizontal: 14, paddingVertical: 12, backgroundColor: o.v === value ? C.panel2 : "transparent" }}>
                  <Text style={{ color: o.v === value ? C.goldSoft : C.white, fontWeight: o.v === value ? "700" : "400" }}>{o.l}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function Hub() {
  const [tipo, setTipo] = useState<"liquidez" | "rendimento">("liquidez");
  const [ordem, setOrdem] = useState("tvl");
  const [dir, setDir] = useState<"desc" | "asc">("desc");
  const [q, setQ] = useState("");
  const [qs, setQs] = useState("");
  const [min, setMin] = useState("1000000");
  const [vol, setVol] = useState("500000");
  const [cat, setCat] = useState("");
  const [dex, setDex] = useState("");
  const [rede, setRede] = useState("");
  const [stable, setStable] = useState(false);
  useEffect(() => { const t = setTimeout(() => setQs(q.trim()), 500); return () => clearTimeout(t); }, [q]);
  const isDex = tipo === "liquidez";
  const params = new URLSearchParams({ tipo, ordem, dir });
  if (qs) params.set("q", qs);
  if (min) params.set("min", min);
  if (isDex && vol) params.set("vol", vol);
  if (rede) params.set("rede", rede);
  if (stable) params.set("stable", "1");
  if (cat) params.set("categoria", cat);
  if (dex) params.set("dex", dex);
  const { data, error, loading, reload } = useApi<Data>(`/api/mobile/defi?${params}`);
  const input = { backgroundColor: C.ink, borderColor: C.line, borderWidth: 1, borderRadius: 10, color: C.white, paddingHorizontal: 12, paddingVertical: 9 } as const;
  return (
    <>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Chip label="Liquidez em DEX" on={isDex} onPress={() => { setTipo("liquidez"); setOrdem("tvl"); setRede(""); setDex(""); }} />
        <Chip label="Empréstimo e staking" on={!isDex} onPress={() => { setTipo("rendimento"); setOrdem("tvl"); setRede(""); setDex(""); }} />
      </View>
      <Muted>{isDex ? "Pares de ativos em corretoras descentralizadas (Uniswap, PancakeSwap, Aerodrome, Camelot, Curve, Raydium e outras). Quem fornece liquidez recebe parte das taxas de negociação." : "Empréstimo, staking e outros protocolos em que você deposita um ativo e recebe rendimento."}</Muted>
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <Select label="Rede" value={rede} onChange={setRede} options={[{ v: "", l: "Todas" }, ...(data?.chains ?? []).map((c) => ({ v: c, l: c }))]} />
          <Select label={isDex ? "DEX" : "Protocolo"} value={dex} onChange={setDex} options={[{ v: "", l: "Todos" }, ...(data?.dexes ?? []).map((c) => ({ v: c, l: c }))]} />
          <Select label="Tipo de pool" value={cat} onChange={setCat} options={[{ v: "", l: "Todos" }, { v: "cripto", l: "Cripto" }, { v: "rwa", l: "RWA (ativos do mundo real)" }, { v: "stable", l: "Stablecoins" }, { v: "outros", l: "Outros" }]} />
          <Select label="Ordenar por" value={ordem} onChange={setOrdem} options={[{ v: "tvl", l: "TVL" }, ...(isDex ? [{ v: "vol", l: "Volume 24h" }] : []), { v: "apy", l: "APR total" }, ...(isDex ? [{ v: "taxas", l: "APR taxas" }, { v: "eficiencia", l: "Giro (volume ÷ TVL)" }] : [])]} />
          <Select label="Sentido" value={dir} onChange={(v) => setDir(v as "desc" | "asc")} options={[{ v: "desc", l: "Maior para o menor" }, { v: "asc", l: "Menor para o maior" }]} />
        </View>
        <View>
          <Text style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>Buscar</Text>
          <TextInput value={q} onChangeText={setQ} placeholder="ex.: ETH-USDC, 0.05%" placeholderTextColor={C.muted} style={input} />
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}><Text style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>TVL mínimo (US$)</Text><TextInput value={min} onChangeText={setMin} keyboardType="numeric" placeholder="1000000" placeholderTextColor={C.muted} style={input} /></View>
          {isDex && <View style={{ flex: 1 }}><Text style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>Volume 24h mínimo (US$)</Text><TextInput value={vol} onChangeText={setVol} keyboardType="numeric" placeholder="500000" placeholderTextColor={C.muted} style={input} /></View>}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: C.white }}>Só stablecoins</Text><Switch value={stable} onValueChange={setStable} trackColor={{ true: C.gold, false: C.line }} />
        </View>
        <Pressable onPress={() => { setQ(""); setQs(""); setMin("1000000"); setVol("500000"); setRede(""); setDex(""); setCat(""); setStable(false); setOrdem("tvl"); setDir("desc"); }} style={{ alignSelf: "flex-start", paddingVertical: 4 }}>
          <Text style={{ color: C.goldSoft, fontWeight: "700" }}>Limpar filtros</Text>
        </Pressable>
      </Card>
      <Status loading={loading && !data} error={error} onRetry={reload} />
      {data && <Muted>{data.total.toLocaleString("pt-BR")} pools com esses filtros{data.total > data.pools.length ? ` (mostrando os ${data.pools.length} primeiros)` : ""}.</Muted>}
      {data?.pools.map((p) => (
        <Card key={p.id} style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <H2>{p.symbol}{p.poolMeta ? `  ${p.poolMeta}` : ""}</H2>
              <Text style={{ color: C.muted, fontSize: 12 }}>{p.project} · {p.chain}{p.stablecoin ? " · stable" : ""}{p.rwa ? " · RWA" : ""}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}><Text style={{ color: C.goldSoft, fontSize: 18, fontWeight: "700" }}>{rate(p.apy)}</Text><Text style={{ color: C.muted, fontSize: 11 }}>{isDex ? "APR total" : "APY total"}</Text></View>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <Stat l="TVL" v={usdCompact(p.tvlUsd)} />
            {isDex && <Stat l="Volume 24h" v={p.volumeUsd1d === null ? "—" : usdCompact(p.volumeUsd1d)} />}
            {isDex && <Stat l="Giro" v={p.turnover === null ? "—" : `${p.turnover.toFixed(2).replace(".", ",")}x`} />}
            <Stat l={isDex ? "APR taxas" : "Base"} v={rate(p.apyBase)} />
            <Stat l="Recompensas" v={rate(p.apyReward)} />
            <Stat l="Média 30d" v={rate(p.apyMean30d)} />
            {isDex && <Stat l="Perda imperm. 7d" v={p.il7d === null ? "—" : rate(p.il7d)} />}
          </View>
        </Card>
      ))}
      <Muted>APR de taxas vem do volume negociado no pool; recompensas em token oscilam e podem acabar. APY alto costuma vir de recompensas. Conteúdo educativo, não é recomendação de investimento.</Muted>
    </>
  );
}

export default function Defi() {
  return (
    <Screen title="HUB DEFI" subtitle="Pools de liquidez e rendimento em dezenas de redes. No Protocolo, 30% do bloco de cripto fica em stablecoins rendendo.">
      <ProGate feature="HUB DEFI (exclusivo do plano Premium)"><Hub /></ProGate>
    </Screen>
  );
}
