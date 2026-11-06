import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { Pressable } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Text, TextInput, View } from "react-native";
import { LpDetailBody } from "../src/LpDetail";
import { usd } from "../src/format";
import { C } from "../src/theme";
import { useApi } from "../src/useApi";
import { Card, GoldButton, H2, Muted, ProGate, Screen, Status } from "../src/ui";

interface P {
  protocol: string; protocolLabel: string; chain: string; tokenId: string; pair: string; symbol0: string; symbol1: string; fee: number;
  price: number; priceLower: number; priceUpper: number; health: "ok" | "attention" | "out"; pos: number;
  amount0: number; amount1: number; valueUsd: number | null; fees0: number; fees1: number; feesUsd: number | null;
  poolTvlUsd: number | null; poolApr: number | null; estDayUsd: number | null; estApr: number | null; link: string;
}
interface R { address: string; chains: { chain: string; positions: P[]; error?: string }[]; hidden?: { pair: string; chain: string; valueUsd: number | null }[] }
const KEY = "lp-hidden";
const sig = (v: number) => v.toLocaleString("pt-BR", { maximumSignificantDigits: 5 });
const HEALTH = { ok: ["Saudável", C.up], attention: ["Atenção: perto da borda", C.gold], out: ["Fora da faixa: sem taxas", C.down] } as const;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

function Result({ address }: { address: string }) {
  const { data, error, loading, reload } = useApi<R>(`/api/mobile/lp?address=${address}`);
  const [manual, setManual] = useState<string[]>([]);
  useEffect(() => { SecureStore.getItemAsync(KEY).then((v) => { if (v) setManual(JSON.parse(v) as string[]); }).catch(() => undefined); }, []);
  const save = (v: string[]) => { setManual(v); SecureStore.setItemAsync(KEY, JSON.stringify(v)).catch(() => undefined); };
  if (!data) return <Status loading={loading} error={error} onRetry={reload} />;
  const all = data.chains.flatMap((c) => c.positions).filter((p) => !manual.includes(`${p.protocol}-${p.chain}-${p.tokenId}`));
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
      {(data.hidden?.length ?? 0) > 0 && <Muted>{data.hidden!.length} posição(ões) ocultada(s): valor menor que US$ 2 ou token sem preço (comum em tokens falsos).</Muted>}
      {manual.length > 0 && <Pressable onPress={() => save([])}><Text style={{ color: C.gold, fontWeight: "700" }}>Mostrar {manual.length} que você ocultou</Text></Pressable>}
      {all.length === 0 && <Muted>Nenhuma posição aberta encontrada (Uniswap v3, PancakeSwap v3 e Aerodrome). Posições na Uniswap v4, Ekubo ou em staking ainda não são lidas.</Muted>}
      {all.map((p, i) => {
        const [label, color] = HEALTH[p.health];
        return (
          <View key={`${p.protocol}-${p.chain}-${p.tokenId}`} style={{ gap: 10 }}>
            <Pressable onPress={() => save([...manual, `${p.protocol}-${p.chain}-${p.tokenId}`])} style={{ alignSelf: "flex-end" }}><Text style={{ color: C.muted, fontSize: 12 }}>Ocultar esta posição ✕</Text></Pressable>
            {i >= 8 && (
              <>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                  <Text style={{ color: C.white, fontWeight: "800", fontSize: 17 }}>{p.pair} · {p.fee / 10000}%</Text>
                  <Text style={{ color, fontWeight: "700", fontSize: 12 }}>{label}</Text>
                </View>
                <Muted>{p.protocolLabel} · {p.chain} · #{p.tokenId}</Muted>
              </>
            )}
            {i < 8 ? <LpDetailBody address={address} rede={p.chain} id={p.tokenId} proto={p.protocol} /> : (
              <Card style={{ gap: 6 }}>
                <Text style={{ color: C.white }}>Valor: <Text style={{ fontWeight: "700" }}>{p.valueUsd === null ? "—" : usd(p.valueUsd)}</Text> · Taxas a coletar: <Text style={{ color: C.up, fontWeight: "700" }}>{p.feesUsd === null ? "—" : usd(p.feesUsd)}</Text></Text>
                <Muted>Faixa {sig(p.priceLower)} a {sig(p.priceUpper)} · atual {sig(p.price)}</Muted>
              </Card>
            )}
          </View>
        );
      })}
    </>
  );
}

export default function Saude() {
  const params = useLocalSearchParams<{ carteira?: string }>();
  const [text, setText] = useState(params.carteira ?? "");
  const [addr, setAddr] = useState(params.carteira && ADDRESS.test(params.carteira) ? params.carteira : "");
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
