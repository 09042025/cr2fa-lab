import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { usd } from "../src/format";
import { C } from "../src/theme";
import { useApi } from "../src/useApi";
import { Card, GoldButton, H2, Muted, ProGate, Screen, Status } from "../src/ui";

interface Pos { tokenId: string; owner: string; chain: string; dex?: string; canAnalyze?: boolean; pair: string; fee: number; priceLower: number; priceUpper: number; inRange: boolean; valueUsd: number; feesCollectedUsd: number; pnlUsd: number; roi: number; apr: number | null; ageDays: number }
interface Opt { id: string; label: string; ready: boolean }
interface Meta { chains: string[]; enabled: boolean; meta?: { networks: Opt[]; exchanges: Opt[]; kinds: { id: string; label: string }[] } }
interface Board { board?: { pools: number; positions: Pos[]; pending: { chain: string; dex: string }[]; errors: { chain: string; dex: string; error: string }[] } }
interface One { data: null | { pair: string; fee: number; chain: string; positions: Pos[] } }
const sig = (v: number) => (v > 0 && v < 0.0001 ? v.toExponential(2).replace(".", ",") : v.toLocaleString("pt-BR", { maximumSignificantDigits: 5 }));
const pc = (v: number) => `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const col = (v: number) => (v >= 0 ? C.up : C.down);
const Chip = ({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) => (
  <Pressable onPress={onPress} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: on ? C.gold : C.line, backgroundColor: on ? C.gold : C.panel2 }}>
    <Text style={{ color: on ? C.ink : C.white, fontWeight: "700", fontSize: 13 }}>{label}</Text>
  </Pressable>
);
const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={{ gap: 6 }}><Muted>{title}</Muted><View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>{children}</View></View>
);

function Row({ p, i, pair }: { p: Pos; i: number; pair?: string }) {
  const router = useRouter();
  return (
    <Card style={{ gap: 4 }} onPress={p.canAnalyze === false ? undefined : () => router.push({ pathname: "/saude-posicao", params: { address: p.owner, rede: p.chain, id: p.tokenId, proto: p.dex ?? "uniswap-v3" } })}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: C.white, fontWeight: "800" }}>#{i + 1} · {pair ?? p.pair} · {p.fee / 10000}%</Text>
        <Text style={{ color: p.inRange ? C.up : C.down, fontWeight: "700" }}>{p.inRange ? "● dentro" : "○ fora"}</Text>
      </View>
      <Muted>{p.chain} · {p.dex ?? "uniswap-v3"} · {p.owner.slice(0, 6)}…{p.owner.slice(-4)} · faixa {sig(p.priceLower)} ↔ {sig(p.priceUpper)} · {Math.round(p.ageDays)} dias</Muted>
      <Text style={{ color: C.white }}>Valor <Text style={{ fontWeight: "700" }}>{usd(p.valueUsd)}</Text> · Taxas coletadas {usd(p.feesCollectedUsd)}</Text>
      <Text style={{ color: col(p.pnlUsd), fontWeight: "700" }}>PnL {usd(p.pnlUsd)} · ROI {pc(p.roi)} · APR {p.apr === null ? "—" : pc(p.apr)}</Text>
      {p.canAnalyze !== false && <Text style={{ color: C.gold, fontWeight: "700" }}>Analisar posição →</Text>}
    </Card>
  );
}

function BoardView({ qs }: { qs: string }) {
  const { data, error, loading, reload } = useApi<Board>(`/api/mobile/lp/top?${qs}`);
  if (!data?.board) return <Status loading={loading} error={error} onRetry={reload} />;
  const b = data.board;
  return (
    <>
      <H2>{b.positions.length} posições</H2>
      <Muted>{b.pools} pools analisadas. Toque em uma posição para ver a análise completa.</Muted>
      {b.pending.length > 0 && <Muted>Ainda sem fonte de dados: {b.pending.map((x) => `${x.chain} · ${x.dex}`).join(", ")}.</Muted>}
      {b.errors.length > 0 && <Muted>Falha ao ler: {b.errors.map((x) => `${x.chain} · ${x.dex}`).join(", ")}.</Muted>}
      {b.positions.length === 0 && <Muted>Nenhuma posição com esses filtros. Baixe o valor ou a idade mínima.</Muted>}
      {b.positions.map((p, i) => <Row key={`${p.chain}-${p.dex}-${p.tokenId}`} p={p} i={i} />)}
      <Muted>Valores a preços de hoje, referência HOLD. Taxas ainda não coletadas não entram no PnL desta lista; a análise completa inclui.</Muted>
    </>
  );
}

function PoolView({ rede, pool }: { rede: string; pool: string }) {
  const { data, error, loading, reload } = useApi<One>(`/api/mobile/lp/top?rede=${rede}&pool=${pool}`);
  if (!data?.data) return <Status loading={loading} error={error} onRetry={reload} />;
  const d = data.data;
  return (
    <>
      <H2>{d.pair} · {d.fee / 10000}% · {d.chain}</H2>
      {[...d.positions].sort((a, b) => b.valueUsd - a.valueUsd).slice(0, 30).map((p, i) => <Row key={p.tokenId} p={{ ...p, chain: d.chain, pair: d.pair, fee: d.fee }} i={i} />)}
    </>
  );
}

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

export default function PoolsPosition() {
  const params = useLocalSearchParams<{ rede?: string; pool?: string }>();
  const meta = useApi<Meta>("/api/mobile/lp/top");
  const m = meta.data?.meta;
  const [redes, setRedes] = useState<string[] | null>(null);
  const [dexes, setDexes] = useState<string[] | null>(null);
  const [t0, setT0] = useState("");
  const [t1, setT1] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [ordem, setOrdem] = useState("apr");
  const [min, setMin] = useState("1000");
  const [idade, setIdade] = useState("7");
  const [faixa, setFaixa] = useState(false);
  const [applied, setApplied] = useState("");
  const selR = redes ?? meta.data?.chains ?? [];
  const selD = dexes ?? (m ? m.exchanges.filter((e) => e.ready).map((e) => e.id) : []);
  const qs = `redes=${selR.join(",")}&dex=${selD.join(",")}&buscar=1&t0=${encodeURIComponent(t0.trim())}&t1=${encodeURIComponent(t1.trim())}&tipo=${tipo}&ordem=${ordem}&min=${min}&idade=${idade}${faixa ? "&faixa=1" : ""}`;
  const input = { borderWidth: 1, borderColor: C.line, borderRadius: 10, backgroundColor: C.panel2, color: C.white, paddingHorizontal: 12, paddingVertical: 9, flex: 1 } as const;
  return (
    <Screen title="Pools Position" subtitle="Ranking das maiores posições. Somente visualização.">
      <ProGate feature="Pools Position">
        {params.pool ? <PoolView rede={params.rede ?? "Ethereum"} pool={params.pool} /> : (
          <>
            <Card style={{ gap: 10 }}>
              <Group title="Redes">{(m?.networks ?? []).map((n) => <Chip key={n.id} label={n.ready ? n.label : `${n.label} (em breve)`} on={selR.includes(n.id)} onPress={() => setRedes(toggle(selR, n.id))} />)}</Group>
              <Group title="Exchanges">{(m?.exchanges ?? []).map((e) => <Chip key={e.id} label={e.ready ? e.label : `${e.label} (em breve)`} on={selD.includes(e.id)} onPress={() => setDexes(toggle(selD, e.id))} />)}</Group>
              <Group title="Par de tokens (ex.: ETH e USDC)">
                <View style={{ flexDirection: "row", gap: 8, width: "100%" }}>
                  <TextInput value={t0} onChangeText={setT0} placeholder="Token 1" placeholderTextColor={C.muted} autoCapitalize="characters" autoCorrect={false} style={input} />
                  <TextInput value={t1} onChangeText={setT1} placeholder="Token 2" placeholderTextColor={C.muted} autoCapitalize="characters" autoCorrect={false} style={input} />
                </View>
              </Group>
              <Group title="Tipo de pool">{(m?.kinds ?? []).map((k) => <Chip key={k.id} label={k.label} on={tipo === k.id} onPress={() => setTipo(k.id)} />)}</Group>
              <Group title="Ordenar por">{[["apr", "APR"], ["roi", "ROI"], ["pnl", "PnL"], ["valor", "Valor"]].map(([k, l]) => <Chip key={k} label={l} on={ordem === k} onPress={() => setOrdem(k)} />)}</Group>
              <Group title="Valor mínimo">{[["0", "Qualquer"], ["1000", "1 mil"], ["10000", "10 mil"], ["100000", "100 mil"]].map(([k, l]) => <Chip key={k} label={l} on={min === k} onPress={() => setMin(k)} />)}</Group>
              <Group title="Idade mínima">{[["0", "Qualquer"], ["7", "7 dias"], ["30", "30 dias"], ["90", "90 dias"], ["180", "180 dias"], ["365", "1 ano ou mais"]].map(([k, l]) => <Chip key={k} label={l} on={idade === k} onPress={() => setIdade(k)} />)}</Group>
              <Chip label={faixa ? "✓ Só dentro da faixa" : "Só dentro da faixa"} on={faixa} onPress={() => setFaixa(!faixa)} />
              <GoldButton label="Filtrar" onPress={() => setApplied(qs)} />
            </Card>
            {applied ? <BoardView key={applied} qs={applied} /> : m ? <Muted>Escolha os filtros e toque em Filtrar.</Muted> : <Status loading={meta.loading} error={meta.error} onRetry={meta.reload} />}
          </>
        )}
      </ProGate>
    </Screen>
  );
}
