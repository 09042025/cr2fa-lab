import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { usd } from "../src/format";
import { C } from "../src/theme";
import { useApi } from "../src/useApi";
import { Card, H2, Muted, ProGate, Screen, Status } from "../src/ui";

interface Pos { tokenId: string; owner: string; chain: string; pair: string; fee: number; priceLower: number; priceUpper: number; inRange: boolean; valueUsd: number; feesCollectedUsd: number; pnlUsd: number; roi: number; apr: number | null; ageDays: number }
interface Meta { chains: string[]; enabled: boolean }
interface Board { board?: { chain: string; pools: number; positions: Pos[] } }
interface One { data: null | { pair: string; fee: number; chain: string; positions: Pos[] } }
const sig = (v: number) => v.toLocaleString("pt-BR", { maximumSignificantDigits: 5 });
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
    <Card style={{ gap: 4 }} onPress={() => router.push({ pathname: "/saude-posicao", params: { address: p.owner, rede: p.chain, id: p.tokenId, proto: "uniswap-v3" } })}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: C.white, fontWeight: "800" }}>#{i + 1} · {pair ?? p.pair} · {p.fee / 10000}%</Text>
        <Text style={{ color: p.inRange ? C.up : C.down, fontWeight: "700" }}>{p.inRange ? "● dentro" : "○ fora"}</Text>
      </View>
      <Muted>{p.owner.slice(0, 6)}…{p.owner.slice(-4)} · faixa {sig(p.priceLower)} ↔ {sig(p.priceUpper)} · {Math.round(p.ageDays)} dias</Muted>
      <Text style={{ color: C.white }}>Valor <Text style={{ fontWeight: "700" }}>{usd(p.valueUsd)}</Text> · Taxas coletadas {usd(p.feesCollectedUsd)}</Text>
      <Text style={{ color: col(p.pnlUsd), fontWeight: "700" }}>PnL {usd(p.pnlUsd)} · ROI {pc(p.roi)} · APR {p.apr === null ? "—" : pc(p.apr)}</Text>
      <Text style={{ color: C.gold, fontWeight: "700" }}>Analisar posição →</Text>
    </Card>
  );
}

function BoardView({ rede, ordem, min, idade, faixa }: { rede: string; ordem: string; min: string; idade: string; faixa: boolean }) {
  const { data, error, loading, reload } = useApi<Board>(`/api/mobile/lp/top?rede=${rede}&ordem=${ordem}&min=${min}&idade=${idade}${faixa ? "&faixa=1" : ""}`);
  if (!data?.board) return <Status loading={loading} error={error} onRetry={reload} />;
  const b = data.board;
  return (
    <>
      <H2>{b.positions.length} posições em {b.chain}</H2>
      <Muted>{b.pools} pools analisadas. Toque em uma posição para ver a análise completa.</Muted>
      {b.positions.length === 0 && <Muted>Nenhuma posição com esses filtros. Baixe o valor ou a idade mínima.</Muted>}
      {b.positions.map((p, i) => <Row key={`${p.chain}-${p.tokenId}`} p={p} i={i} />)}
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

export default function PoolsPosition() {
  const params = useLocalSearchParams<{ rede?: string; pool?: string }>();
  const meta = useApi<Meta>("/api/mobile/lp/top");
  const chains = meta.data?.chains ?? [];
  const [rede, setRede] = useState(params.rede ?? "");
  const [ordem, setOrdem] = useState("apr");
  const [min, setMin] = useState("1000");
  const [idade, setIdade] = useState("7");
  const [faixa, setFaixa] = useState(false);
  const chain = rede || chains[0] || "";
  return (
    <Screen title="Pools Position" subtitle="Ranking das maiores posições. Somente visualização.">
      <ProGate feature="Pools Position">
        {params.pool ? <PoolView rede={chain} pool={params.pool} /> : (
          <>
            <Card style={{ gap: 10 }}>
              <Group title="Rede">{chains.map((c) => <Chip key={c} label={c} on={c === chain} onPress={() => setRede(c)} />)}</Group>
              <Group title="Ordenar por">{[["apr", "APR"], ["roi", "ROI"], ["pnl", "PnL"], ["valor", "Valor"]].map(([k, l]) => <Chip key={k} label={l} on={ordem === k} onPress={() => setOrdem(k)} />)}</Group>
              <Group title="Valor mínimo">{[["0", "Qualquer"], ["1000", "1 mil"], ["10000", "10 mil"], ["100000", "100 mil"]].map(([k, l]) => <Chip key={k} label={l} on={min === k} onPress={() => setMin(k)} />)}</Group>
              <Group title="Idade mínima">{[["0", "Qualquer"], ["7", "7 dias"], ["30", "30 dias"], ["90", "90 dias"], ["180", "180 dias"], ["365", "1 ano ou mais"]].map(([k, l]) => <Chip key={k} label={l} on={idade === k} onPress={() => setIdade(k)} />)}</Group>
              <Chip label={faixa ? "✓ Só dentro da faixa" : "Só dentro da faixa"} on={faixa} onPress={() => setFaixa(!faixa)} />
            </Card>
            {chain ? <BoardView key={`${chain}-${ordem}-${min}-${idade}-${faixa}`} rede={chain} ordem={ordem} min={min} idade={idade} faixa={faixa} /> : <Status loading={meta.loading} error={meta.error} onRetry={meta.reload} />}
          </>
        )}
      </ProGate>
    </Screen>
  );
}
