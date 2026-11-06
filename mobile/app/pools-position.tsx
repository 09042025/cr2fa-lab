import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { usd } from "../src/format";
import { C } from "../src/theme";
import { useApi } from "../src/useApi";
import { Card, GoldButton, H2, Muted, ProGate, Screen, Status } from "../src/ui";

interface Pos { tokenId: string; owner: string; priceLower: number; priceUpper: number; inRange: boolean; valueUsd: number; feesCollectedUsd: number; pnlUsd: number; roi: number; apr: number | null; ageDays: number }
interface R { chains: string[]; enabled: boolean; data: null | { pair: string; fee: number; chain: string; price: number; symbol0: string; symbol1: string; positions: Pos[] } }
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const sig = (v: number) => v.toLocaleString("pt-BR", { maximumSignificantDigits: 5 });
const pc = (v: number) => `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const col = (v: number) => (v >= 0 ? C.up : C.down);
const SORTS: [string, string, (p: Pos) => number][] = [["valor", "Valor", (p) => p.valueUsd], ["apr", "APR", (p) => p.apr ?? -1e9], ["roi", "ROI", (p) => p.roi], ["pnl", "PnL", (p) => p.pnlUsd]];
const Chip = ({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) => (
  <Pressable onPress={onPress} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: on ? C.gold : C.line, backgroundColor: on ? C.gold : C.panel2 }}>
    <Text style={{ color: on ? C.ink : C.white, fontWeight: "700", fontSize: 13 }}>{label}</Text>
  </Pressable>
);

function Result({ rede, pool, ordem }: { rede: string; pool: string; ordem: string }) {
  const router = useRouter();
  const { data, error, loading, reload } = useApi<R>(`/api/mobile/lp/top?rede=${rede}&pool=${pool}`);
  if (!data?.data) return <Status loading={loading} error={error} onRetry={reload} />;
  const d = data.data, sort = SORTS.find((x) => x[0] === ordem)![2];
  const rows = [...d.positions].sort((a, b) => sort(b) - sort(a)).slice(0, 30);
  return (
    <>
      <H2>{d.pair} · {d.fee / 10000}% · {d.chain}</H2>
      {rows.length === 0 && <Muted>Nenhuma posição aberta relevante (acima de US$ 2) neste pool.</Muted>}
      {rows.map((p, i) => (
        <Card key={p.tokenId} style={{ gap: 4 }} onPress={() => router.push({ pathname: "/saude", params: { carteira: p.owner } })}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: C.white, fontWeight: "800" }}>#{i + 1} · {p.owner.slice(0, 6)}…{p.owner.slice(-4)}</Text>
            <Text style={{ color: p.inRange ? C.up : C.down, fontWeight: "700" }}>{p.inRange ? "● dentro" : "○ fora"}</Text>
          </View>
          <Muted>Faixa {sig(p.priceLower)} ↔ {sig(p.priceUpper)} · {Math.round(p.ageDays)} dias</Muted>
          <Text style={{ color: C.white }}>Valor <Text style={{ fontWeight: "700" }}>{usd(p.valueUsd)}</Text> · Taxas coletadas {usd(p.feesCollectedUsd)}</Text>
          <Text style={{ color: col(p.pnlUsd), fontWeight: "700" }}>PnL {usd(p.pnlUsd)} · ROI {pc(p.roi)} · APR {p.apr === null ? "—" : pc(p.apr)}</Text>
        </Card>
      ))}
      <Muted>Toque em uma carteira para ver a saúde completa dela. Valores a preços de hoje, referência HOLD; taxas ainda não coletadas não entram no PnL.</Muted>
    </>
  );
}

export default function PoolsPosition() {
  const params = useLocalSearchParams<{ rede?: string; pool?: string }>();
  const meta = useApi<R>("/api/mobile/lp/top");
  const [rede, setRede] = useState(params.rede ?? "");
  const [text, setText] = useState(params.pool ?? "");
  const [pool, setPool] = useState(params.pool && ADDRESS.test(params.pool) ? params.pool : "");
  const [ordem, setOrdem] = useState("valor");
  const chains = meta.data?.chains ?? [];
  const chain = rede || chains[0] || "Ethereum";
  const bad = text.trim() !== "" && !ADDRESS.test(text.trim());
  return (
    <Screen title="Pools Position" subtitle="As maiores posições de um pool. Somente visualização.">
      <ProGate feature="Pools Position">
        <Card style={{ gap: 8 }}>
          <H2>Pool (Uniswap v3)</H2>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>{chains.map((c) => <Chip key={c} label={c} on={c === chain} onPress={() => setRede(c)} />)}</View>
          <TextInput value={text} onChangeText={setText} placeholder="Endereço do pool 0x..." placeholderTextColor={C.muted} autoCapitalize="none" autoCorrect={false}
            style={{ backgroundColor: C.ink, borderColor: C.line, borderWidth: 1, borderRadius: 10, color: C.white, paddingHorizontal: 12, paddingVertical: 10 }} />
          {bad && <Text style={{ color: C.down }}>Endereço inválido (0x + 40 caracteres).</Text>}
          <GoldButton label="Buscar" onPress={() => { if (ADDRESS.test(text.trim())) setPool(text.trim()); }} />
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>{SORTS.map(([k, l]) => <Chip key={k} label={l} on={ordem === k} onPress={() => setOrdem(k)} />)}</View>
        </Card>
        {pool ? <Result key={`${chain}-${pool}`} rede={chain} pool={pool} ordem={ordem} /> : null}
      </ProGate>
    </Screen>
  );
}
