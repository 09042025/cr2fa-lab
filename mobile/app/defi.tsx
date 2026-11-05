import { useEffect, useState } from "react";
import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { rate, usdCompact } from "../src/format";
import { C } from "../src/theme";
import { useApi } from "../src/useApi";
import { Card, H2, Muted, ProGate, Screen, Status } from "../src/ui";

interface Pool { id: string; symbol: string; project: string; chain: string; poolMeta: string | null; stablecoin: boolean; rwa: boolean; tvlUsd: number; volumeUsd1d: number | null; turnover: number | null; apyBase: number | null; apyReward: number | null; apy: number | null; apyMean30d: number | null; il7d: number | null }
interface Data { dexes: string[]; tipo: "liquidez" | "rendimento"; total: number; chains: string[]; pools: Pool[]; fetchedAt: number | null; stale: boolean }

const chip = (on: boolean) => ({ paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: on ? C.gold : C.line, backgroundColor: on ? C.gold : C.panel2 });
const Chip = ({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) => <Pressable onPress={onPress} style={chip(on)}><Text style={{ color: on ? C.ink : C.white, fontWeight: "700" }}>{label}</Text></Pressable>;
const Stat = ({ l, v, gold }: { l: string; v: string; gold?: boolean }) => <View style={{ minWidth: "30%" }}><Text style={{ color: C.muted, fontSize: 11 }}>{l}</Text><Text style={{ color: gold ? C.goldSoft : C.white, fontWeight: "700" }}>{v}</Text></View>;

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
  // Clicar de novo no mesmo critério inverte (do maior para o menor e vice-versa), como no site.
  const sort = (o: string) => { if (o === ordem) setDir(dir === "desc" ? "asc" : "desc"); else { setOrdem(o); setDir("desc"); } };
  const arrow = (o: string) => (o === ordem ? (dir === "desc" ? " ↓" : " ↑") : "");
  const input = { backgroundColor: C.ink, borderColor: C.line, borderWidth: 1, borderRadius: 10, color: C.white, paddingHorizontal: 12, paddingVertical: 9 } as const;
  return (
    <>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Chip label="Liquidez em DEX" on={isDex} onPress={() => { setTipo("liquidez"); setOrdem("tvl"); setRede(""); setDex(""); }} />
        <Chip label="Empréstimo e staking" on={!isDex} onPress={() => { setTipo("rendimento"); setOrdem("tvl"); setRede(""); setDex(""); }} />
      </View>
      <Muted>{isDex ? "Pares de ativos em corretoras descentralizadas (Uniswap, PancakeSwap, Aerodrome, Camelot, Curve, Raydium e outras). Quem fornece liquidez recebe parte das taxas de negociação." : "Empréstimo, staking e outros protocolos em que você deposita um ativo e recebe rendimento."}</Muted>
      <Card style={{ gap: 8 }}>
        <TextInput value={q} onChangeText={setQ} placeholder="Buscar (ex.: ETH-USDC, 0.05%)" placeholderTextColor={C.muted} style={input} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput value={min} onChangeText={setMin} keyboardType="numeric" placeholder="TVL mínimo (US$)" placeholderTextColor={C.muted} style={[input, { flex: 1 }]} />
          {isDex && <TextInput value={vol} onChangeText={setVol} keyboardType="numeric" placeholder="Volume 24h mín." placeholderTextColor={C.muted} style={[input, { flex: 1 }]} />}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: C.white }}>Só stablecoins</Text><Switch value={stable} onValueChange={setStable} trackColor={{ true: C.gold, false: C.line }} />
        </View>
        {data && data.chains.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            <Chip label="Todas as redes" on={rede === ""} onPress={() => setRede("")} />
            {data.chains.map((c) => <Chip key={c} label={c} on={rede === c} onPress={() => setRede(rede === c ? "" : c)} />)}
          </ScrollView>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          <Chip label="Todos os tipos" on={cat === ""} onPress={() => setCat("")} />
          {[["cripto", "Cripto"], ["rwa", "RWA"], ["stable", "Stablecoins"], ["outros", "Outros"]].map(([id, l]) => <Chip key={id} label={l} on={cat === id} onPress={() => setCat(cat === id ? "" : id)} />)}
        </ScrollView>
        {data && data.dexes.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            <Chip label={isDex ? "Todas as DEX" : "Todos os protocolos"} on={dex === ""} onPress={() => setDex("")} />
            {data.dexes.map((c) => <Chip key={c} label={c} on={dex === c} onPress={() => setDex(dex === c ? "" : c)} />)}
          </ScrollView>
        )}
        <Text style={{ color: C.muted, fontSize: 12 }}>Ordenar por (toque de novo para inverter: maior ↔ menor)</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          <Chip label={`TVL${arrow("tvl")}`} on={ordem === "tvl"} onPress={() => sort("tvl")} />
          {isDex && <Chip label={`Volume 24h${arrow("vol")}`} on={ordem === "vol"} onPress={() => sort("vol")} />}
          <Chip label={`APR${arrow("apy")}`} on={ordem === "apy"} onPress={() => sort("apy")} />
          {isDex && <Chip label={`APR taxas${arrow("taxas")}`} on={ordem === "taxas"} onPress={() => sort("taxas")} />}
          {isDex && <Chip label={`Giro${arrow("eficiencia")}`} on={ordem === "eficiencia"} onPress={() => sort("eficiencia")} />}
        </View>
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
