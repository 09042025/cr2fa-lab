import { useState } from "react";
import { Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { CriptoNav } from "../src/criptoNav";
import { pct, usdCompact } from "../src/format";
import { C } from "../src/theme";
import { useApi } from "../src/useApi";
import { Card, H2, Muted, Screen, Status } from "../src/ui";

interface P { id: string; name: string; url: string; kind: string; note: string; tvl: number | null; change7d: number | null; chains: string[]; vol: { v24h: number | null; v7d: number | null; v30d: number | null; v1y: number | null } | null }
interface Ex { name: string; url: string; origin: "Brasil" | "Global"; note: string }
interface Data { secao: string; chains?: string[]; offline?: boolean; platforms?: P[]; exchanges?: Ex[] }
const SEC = [{ id: "defi", l: "Plataformas DeFi" }, { id: "dex", l: "DEX (trocas)" }, { id: "corretoras", l: "Corretoras" }];
const Chip = ({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) => (
  <Pressable onPress={onPress} style={{ flexGrow: 1, flexBasis: "28%", alignItems: "center", paddingHorizontal: 8, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: on ? C.gold : C.line, backgroundColor: on ? C.gold : C.panel2 }}>
    <Text style={{ color: on ? C.ink : C.white, fontWeight: "700", textAlign: "center" }}>{label}</Text>
  </Pressable>
);
const Stat = ({ l, v }: { l: string; v: string }) => <View style={{ minWidth: "30%" }}><Text style={{ color: C.muted, fontSize: 11 }}>{l}</Text><Text style={{ color: C.white, fontWeight: "700" }}>{v}</Text></View>;
const link = (url: string) => Linking.openURL(url);

export default function Plataformas() {
  const [s, setS] = useState("defi");
  const [rede, setRede] = useState("");
  const [q, setQ] = useState("");
  const [qs, setQs] = useState("");
  const params = new URLSearchParams({ s });
  if (rede) params.set("rede", rede);
  if (qs) params.set("q", qs);
  const { data, error, loading, reload } = useApi<Data>(`/api/mobile/plataformas?${params}`);
  const dex = s === "dex";
  return (
    <Screen title="DEX e Plataformas DeFi" subtitle="Protocolos de DeFi, corretoras descentralizadas (DEX) e corretoras tradicionais, com links oficiais, redes e TVL.">
      <CriptoNav current="/plataformas" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {SEC.map((x) => <Chip key={x.id} label={x.l} on={s === x.id} onPress={() => { setS(x.id); setRede(""); }} />)}
      </View>
      {s !== "corretoras" && (
        <>
          <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => setQs(q.trim())} onEndEditing={() => setQs(q.trim())} returnKeyType="search" placeholder="Buscar (ex.: Aave, staking)" placeholderTextColor={C.muted} style={{ backgroundColor: C.panel, borderColor: C.line, borderWidth: 1, borderRadius: 10, color: C.white, paddingHorizontal: 12, paddingVertical: 9 }} />
          {data?.chains && data.chains.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6 }}>
              <Chip label="Todas as redes" on={rede === ""} onPress={() => setRede("")} />
              {data.chains.map((c) => <Chip key={c} label={c} on={rede === c} onPress={() => setRede(rede === c ? "" : c)} />)}
            </ScrollView>
          )}
        </>
      )}
      <Status loading={loading && !data} error={error} onRetry={reload} />
      {data?.exchanges && (
        <>
          <Card><Text style={{ color: C.goldSoft, fontSize: 12 }}>Cuidado com golpes: confira sempre o endereço do site, nunca entre por link de anúncio, e-mail ou mensagem, e ative a verificação em duas etapas. Os links abaixo são os sites oficiais.</Text></Card>
          {(["Brasil", "Global"] as const).map((o) => (
            <View key={o} style={{ gap: 8 }}>
              <H2>{o === "Brasil" ? "Corretoras brasileiras" : "Corretoras globais"}</H2>
              {data.exchanges!.filter((x) => x.origin === o).map((x) => (
                <Card key={x.name} onPress={() => link(x.url)}>
                  <Text style={{ color: C.goldSoft, fontWeight: "700" }}>{x.name} ↗</Text>
                  <Muted>{x.note}</Muted>
                </Card>
              ))}
            </View>
          ))}
        </>
      )}
      {data?.platforms && (
        <>
          {data.offline && <Muted>Sem dados da fonte agora. Tente novamente em alguns minutos.</Muted>}
          {data.platforms.length === 0 && !data.offline && <Muted>Nenhuma plataforma encontrada com esses filtros.</Muted>}
          {data.platforms.map((p) => (
            <Card key={p.id} onPress={() => link(p.url)} style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: C.goldSoft, fontWeight: "700", fontSize: 16 }}>{p.name} ↗</Text>
                <Text style={{ color: C.white, fontWeight: "700" }}>{p.tvl === null ? "—" : usdCompact(p.tvl)}</Text>
              </View>
              <Text style={{ color: C.muted, fontSize: 12 }}>{p.kind} · {p.note}</Text>
              {p.chains.length > 0 && <Text style={{ color: C.muted, fontSize: 12 }}>Redes: {p.chains.join(", ")}</Text>}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                <Stat l={`TVL${rede ? ` (${rede})` : ""}`} v={p.tvl === null ? "—" : usdCompact(p.tvl)} />
                {!dex && <Stat l="TVL 7d" v={p.change7d === null ? "—" : pct(p.change7d)} />}
                {dex && <><Stat l="Volume 24h" v={p.vol?.v24h == null ? "—" : usdCompact(p.vol.v24h)} /><Stat l="7 dias" v={p.vol?.v7d == null ? "—" : usdCompact(p.vol.v7d)} /><Stat l="30 dias" v={p.vol?.v30d == null ? "—" : usdCompact(p.vol.v30d)} /></>}
              </View>
            </Card>
          ))}
          <Muted>Fonte: DefiLlama. Sempre confira o endereço no navegador antes de conectar sua carteira. Conteúdo educativo, não é recomendação de investimento.</Muted>
        </>
      )}
    </Screen>
  );
}
