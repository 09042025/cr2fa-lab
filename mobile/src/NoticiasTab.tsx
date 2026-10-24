import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { ago } from "./format";
import { C } from "./theme";
import { useApi } from "./useApi";
import { Card, GoldButton, Muted, Status } from "./ui";

interface Item { title: string; url: string; source: string; at: number; summary: string }
interface NewsData { topics: { id: string; label: string }[]; topic: string; items: Item[]; stale: boolean; failed: boolean }

const TEMAS = [["cripto", "Cripto"], ["acoes", "Ações"], ["fiis", "Fundos imobiliários"], ["renda-fixa", "Renda fixa"], ["brasil", "Economia Brasil"], ["mundo", "Economia mundial"]] as const;

export function NoticiasTab() {
  const [tema, setTema] = useState<string>("cripto");
  const { data, error, loading, reload } = useApi<NewsData>(`/api/mobile/news?t=${tema}`);
  return (
    <>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {TEMAS.map(([id, label]) => {
          const on = tema === id;
          return (
            <Pressable key={id} onPress={() => setTema(id)} style={{ width: "48.5%", height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, borderColor: on ? C.gold : C.line, backgroundColor: on ? "rgba(217,165,32,0.15)" : C.panel, paddingHorizontal: 8 }}>
              <Text numberOfLines={1} style={{ color: on ? C.goldSoft : C.white, fontWeight: "600" }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Status loading={loading} error={error ?? (data?.failed ? "As fontes de notícias não responderam agora. Tente em instantes." : null)} onRetry={reload} />
      {!loading && data && !data.failed && data.items.length === 0 && <Muted>Nenhuma notícia deste tema agora.</Muted>}
      {!loading && data?.items.map((n) => (
        <Card key={n.url} onPress={() => Linking.openURL(n.url)}>
          <Text style={{ color: C.muted, fontSize: 12 }}><Text style={{ color: C.goldSoft, fontWeight: "700" }}>{n.source}</Text> · {ago(n.at)}</Text>
          <Text style={{ color: C.white, fontWeight: "700", fontSize: 15, lineHeight: 21 }}>{n.title}</Text>
          {n.summary ? <Text numberOfLines={3} style={{ color: C.muted, fontSize: 13, lineHeight: 19 }}>{n.summary}</Text> : null}
        </Card>
      ))}
      {!loading && data && !data.failed && <GoldButton label="Atualizar" ghost onPress={reload} />}
      <Muted>Notícias de terceiros, abertas no site da fonte. Não são recomendação de investimento.</Muted>
    </>
  );
}
