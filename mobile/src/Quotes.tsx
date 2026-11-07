import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { brl, brlCompact, pct } from "./format";
import { Select } from "./Select";
import { C } from "./theme";
import { useApi } from "./useApi";
import { Card, GoldButton, Muted, ProBadge, Screen, Status } from "./ui";
import { router } from "expo-router";

interface Row { symbol: string; name: string; sector: string; price: number | null; changePct: number | null; volume: number | null; marketCap: number | null }
interface Data { pro: boolean; total: number; shown: number; sectors: string[]; rows: Row[]; stale: boolean; failed: boolean }

/** Lista de ações ou de FIIs, igual à do site: Premium vê tudo, filtra por setor/segmento e busca; grátis vê o começo da lista. */
export function Quotes({ kind }: { kind: "acoes" | "fiis" }) {
  const [setor, setSetor] = useState("");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const { data, error, loading, reload } = useApi<Data>(`/api/mobile/stocks?k=${kind}&setor=${encodeURIComponent(setor)}&q=${encodeURIComponent(term)}`);
  const fii = kind === "fiis";
  return (
    <Screen
      title={fii ? "Fundos imobiliários" : "Ações"}
      subtitle={fii ? "Bloco de 20% do Protocolo: 30% galpões logísticos, 30% shopping centers, 30% outros imóveis de tijolo e 10% fundos de papel." : "Bloco de 20% do Protocolo: metade em ações brasileiras (energia, bancos, saneamento, telecom e seguros, 20% cada) e metade em ações internacionais."}
    >
      <Status loading={loading && !data} error={error} onRetry={reload} />
      {data?.failed && <Muted>Não foi possível carregar as cotações agora. Tente de novo em instantes.</Muted>}
      {data && !data.failed && (
        <>
          {data.pro ? (
            <Card style={{ gap: 10 }}>
              <Select title={fii ? "Filtrar por segmento" : "Filtrar por setor"} value={setor} onChange={setSetor} options={[{ id: "", label: "Todos" }, ...data.sectors.map((s) => ({ id: s, label: s }))]} />
              <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => setTerm(q)} autoCapitalize="characters" placeholder={`Buscar ativo (ex.: ${fii ? "KNCR11" : "ITUB4"})`} placeholderTextColor={C.muted} maxLength={30} style={{ backgroundColor: C.ink, borderColor: C.line, borderWidth: 1, borderRadius: 10, color: C.white, paddingHorizontal: 12, paddingVertical: 9 }} />
              <GoldButton label="Filtrar" onPress={() => setTerm(q)} />
              <Muted>{data.shown} de {data.total} ativos.</Muted>
            </Card>
          ) : (
            <Card style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><ProBadge /><Text style={{ color: C.muted, flex: 1 }}>Lista completa, filtro e busca no plano Premium.</Text></Card>
          )}
          {data.rows.map((r) => (
            <Card key={r.symbol} style={{ gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: C.goldSoft, fontWeight: "800", fontSize: 16 }}>{r.symbol}</Text>
                <Text style={{ color: C.white, fontWeight: "700", fontSize: 16 }}>{brl(r.price)}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: C.muted, flex: 1 }} numberOfLines={1}>{r.name}</Text>
                <Text style={{ color: (r.changePct ?? 0) >= 0 ? C.up : C.down, fontWeight: "700" }}>{pct(r.changePct)}</Text>
              </View>
              <Text style={{ color: C.muted, fontSize: 12 }}>{r.sector} · Volume {r.volume === null ? "—" : r.volume.toLocaleString("pt-BR")} · Valor de mercado {brlCompact(r.marketCap)}</Text>
            </Card>
          ))}
          {!data.pro && data.total > data.shown && <Card style={{ borderColor: C.gold }}><Text style={{ color: C.goldSoft, fontWeight: "700" }}>Lista completa ({data.total} ativos) no Premium.</Text><GoldButton label="Ver planos" onPress={() => router.push("/planos")} /></Card>}
          <Muted>{fii ? "Lista de FIIs da B3. A estrutura acima é a do Protocolo, e não recomendação de compra." : "Lista de ações da B3. A estratégia acima é a estrutura do Protocolo, e não recomendação de compra."} Fonte: brapi.dev (B3).</Muted>
        </>
      )}
    </Screen>
  );
}
