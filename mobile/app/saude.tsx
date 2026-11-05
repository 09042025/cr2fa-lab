import { useState } from "react";
import { useRouter } from "expo-router";
import { Text, TextInput, View } from "react-native";
import { rate, usd, usdCompact } from "../src/format";
import { C } from "../src/theme";
import { useApi } from "../src/useApi";
import { Card, GoldButton, H2, Muted, ProGate, Screen, Status } from "../src/ui";

interface P {
  chain: string; tokenId: string; pair: string; symbol0: string; symbol1: string; fee: number;
  price: number; priceLower: number; priceUpper: number; health: "ok" | "attention" | "out"; pos: number;
  amount0: number; amount1: number; valueUsd: number | null; fees0: number; fees1: number; feesUsd: number | null;
  poolTvlUsd: number | null; poolApr: number | null; estDayUsd: number | null; estApr: number | null; link: string;
}
interface R { address: string; chains: { chain: string; positions: P[]; error?: string }[] }
const sig = (v: number) => v.toLocaleString("pt-BR", { maximumSignificantDigits: 5 });
const HEALTH = { ok: ["Saudável", C.up], attention: ["Atenção: perto da borda", C.gold], out: ["Fora da faixa: sem taxas", C.down] } as const;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

function Result({ address }: { address: string }) {
  const router = useRouter();
  const { data, error, loading, reload } = useApi<R>(`/api/mobile/lp?address=${address}`);
  if (!data) return <Status loading={loading} error={error} onRetry={reload} />;
  const all = data.chains.flatMap((c) => c.positions);
  const total = all.reduce((a, p) => a + (p.valueUsd ?? 0), 0);
  const fees = all.reduce((a, p) => a + (p.feesUsd ?? 0), 0);
  const failed = data.chains.filter((c) => c.error).map((c) => c.chain);
  return (
    <>
      <Card style={{ gap: 4 }}>
        <Muted>{all.length} posições abertas</Muted>
        <Text style={{ color: C.white, fontSize: 22, fontWeight: "800" }}>{usd(total)}</Text>
        <Text style={{ color: C.up }}>Taxas a coletar: {usd(fees)}</Text>
      </Card>
      {failed.length > 0 && <Muted>Algumas redes não responderam agora: {failed.join(", ")}. Tente de novo.</Muted>}
      {all.length === 0 && <Muted>Nenhuma posição aberta na Uniswap v3 (Ethereum, Base, Arbitrum, Polygon, Optimism) para este endereço.</Muted>}
      {all.map((p) => {
        const [label, color] = HEALTH[p.health];
        return (
          <Card key={`${p.chain}-${p.tokenId}`} style={{ gap: 8 }} onPress={() => router.push({ pathname: "/saude-posicao", params: { address, rede: p.chain, id: p.tokenId } })}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: C.white, fontWeight: "800", fontSize: 16 }}>{p.pair} · {p.fee / 10000}%</Text>
              <Text style={{ color, fontWeight: "700", fontSize: 12 }}>{label}</Text>
            </View>
            <Muted>Uniswap v3 · {p.chain} · #{p.tokenId}</Muted>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: C.line, marginTop: 4 }}>
              <View style={{ position: "absolute", top: -3, width: 4, height: 14, borderRadius: 2, backgroundColor: C.white, left: `${Math.min(98, Math.max(0, p.pos * 100))}%` }} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Muted>Mín. {sig(p.priceLower)}</Muted><Muted>Atual {sig(p.price)}</Muted><Muted>Máx. {sig(p.priceUpper)}</Muted>
            </View>
            <Text style={{ color: C.white }}>Valor: <Text style={{ fontWeight: "700" }}>{p.valueUsd === null ? "—" : usd(p.valueUsd)}</Text></Text>
            <Muted>{sig(p.amount0)} {p.symbol0} + {sig(p.amount1)} {p.symbol1}</Muted>
            <Text style={{ color: C.white }}>Taxas a coletar: <Text style={{ color: C.up, fontWeight: "700" }}>{p.feesUsd === null ? "—" : usd(p.feesUsd)}</Text></Text>
            <Text style={{ color: C.white }}>Ganho estimado/dia: <Text style={{ fontWeight: "700" }}>{p.estDayUsd === null ? "—" : usd(p.estDayUsd)}</Text>{p.estApr !== null ? ` · APR ${rate(p.estApr)}` : ""}</Text>
            <Muted>Pool: {p.poolTvlUsd === null ? "—" : usdCompact(p.poolTvlUsd)} de liquidez{p.poolApr !== null ? ` · APR ${rate(p.poolApr)}` : ""}</Muted>
            <Text style={{ color: C.gold, fontWeight: "700" }}>Análise completa: PnL, ROI, gráficos →</Text>
          </Card>
        );
      })}
    </>
  );
}

export default function Saude() {
  const [text, setText] = useState("");
  const [addr, setAddr] = useState("");
  const bad = text.trim() !== "" && !ADDRESS.test(text.trim());
  return (
    <Screen title="Saúde das pools" subtitle="Siga o dinheiro na blockchain. Somente visualização.">
      <ProGate feature="Saúde das pools">
        <Card style={{ gap: 8 }}>
          <H2>Endereço da carteira</H2>
          <TextInput value={text} onChangeText={setText} placeholder="0x..." placeholderTextColor={C.muted} autoCapitalize="none" autoCorrect={false}
            style={{ backgroundColor: C.ink, borderColor: C.line, borderWidth: 1, borderRadius: 10, color: C.white, paddingHorizontal: 12, paddingVertical: 10 }} />
          {bad && <Text style={{ color: C.down }}>Endereço inválido (0x + 40 caracteres).</Text>}
          <GoldButton label="Consultar" onPress={() => { if (ADDRESS.test(text.trim())) setAddr(text.trim()); }} />
          <Muted>Não conectamos sua carteira, não pedimos assinatura e não há swap nem ajuste de pool. Desconfie de qualquer site que peça isso para “ver” posições.</Muted>
        </Card>
        {addr ? <Result key={addr} address={addr} /> : null}
      </ProGate>
    </Screen>
  );
}
