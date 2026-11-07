import { router, useLocalSearchParams } from "expo-router";
import { Linking, Text, View } from "react-native";
import { brl, brlCompact, pct } from "../src/format";
import { C } from "../src/theme";
import { TvChart } from "../src/TvChart";
import { useApi } from "../src/useApi";
import { Card, GoldButton, H2, Muted, ProBadge, Screen, Status } from "../src/ui";

interface Data {
  ticker: string; isFii: boolean; pro: boolean; failed: boolean; name: string;
  quote: { price: number | null; changePct: number | null; volume: number | null; marketCap: number | null } | null;
  tvSymbol: string | null;
  indicators: { dayLow: number | null; dayHigh: number | null; low52: number | null; high52: number | null; pe: number | null; eps: number | null } | null;
  dividends: { date: string; label: string; value: number }[] | null;
  docs: { label: string; url: string }[]; links: { label: string; url: string }[];
}
const n2 = (v: number | null) => (v === null ? "—" : v.toLocaleString("pt-BR", { maximumFractionDigits: 2 }));
const Item = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <Card style={{ width: "48.5%", padding: 12 }}><Text style={{ color: C.muted, fontSize: 12 }}>{label}</Text><Text style={{ color: color ?? C.white, fontSize: 16, fontWeight: "700" }}>{value}</Text></Card>
);

/** Ação ou FII: cotação, gráfico, indicadores e proventos (Premium), documentos. Igual à página do site no celular. */
export default function Acao() {
  const { t, de } = useLocalSearchParams<{ t: string; de?: string }>();
  const { data, error, loading, reload } = useApi<Data>(`/api/mobile/asset?t=${encodeURIComponent(t ?? "")}&de=${de ?? ""}`);
  const q = data?.quote;
  return (
    <Screen title={data ? `${data.name} (${data.ticker})` : t} subtitle="Cotação, gráfico e informações do ativo.">
      <Status loading={loading && !data} error={error} onRetry={reload} />
      {data?.failed && <Muted>Não foi possível carregar a cotação agora. Tente de novo em instantes.</Muted>}
      {q && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
          <Item label="Preço" value={brl(q.price)} />
          <Item label="Variação no dia" value={pct(q.changePct)} color={(q.changePct ?? 0) >= 0 ? C.up : C.down} />
          <Item label="Volume" value={q.volume === null ? "—" : q.volume.toLocaleString("pt-BR")} />
          <Item label="Valor de mercado" value={brlCompact(q.marketCap)} />
        </View>
      )}
      {data?.tvSymbol && <TvChart symbol={data.tvSymbol} />}
      {data && (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><H2>Indicadores</H2>{!data.pro && <ProBadge />}</View>
          {data.pro ? (
            data.indicators ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
                <Item label="Mínima do dia" value={brl(data.indicators.dayLow)} />
                <Item label="Máxima do dia" value={brl(data.indicators.dayHigh)} />
                <Item label="Mínima 52 semanas" value={brl(data.indicators.low52)} />
                <Item label="Máxima 52 semanas" value={brl(data.indicators.high52)} />
                <Item label="P/L" value={n2(data.indicators.pe)} />
                <Item label="Lucro por ação (LPA)" value={brl(data.indicators.eps)} />
              </View>
            ) : <Muted>Indicadores indisponíveis no momento.</Muted>
          ) : (
            <Card style={{ borderColor: C.gold, gap: 8 }}><Text style={{ color: C.goldSoft, fontWeight: "700" }}>Indicadores e histórico de proventos (exclusivo do plano Premium)</Text><GoldButton label="Ver planos" onPress={() => router.push("/planos")} /></Card>
          )}
          {data.pro && data.dividends && (
            <>
              <H2>Proventos recentes</H2>
              {data.dividends.length ? (
                <Card style={{ gap: 6 }}>
                  {data.dividends.map((x, i) => (
                    <View key={`${x.date}-${i}`} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ color: C.muted }}>{x.date.split("-").reverse().join("/")} · {x.label}</Text>
                      <Text style={{ color: C.white, fontWeight: "700" }}>{brl(x.value)}</Text>
                    </View>
                  ))}
                </Card>
              ) : <Muted>Sem proventos registrados para este ativo.</Muted>}
            </>
          )}
          <H2>{data.isFii ? "Relatórios gerenciais e documentos" : "Documentos e resultados"}</H2>
          <Card style={{ gap: 10 }}>
            {data.docs.map((l) => <Text key={l.url + l.label} onPress={() => void Linking.openURL(l.url)} style={{ color: C.goldSoft, textDecorationLine: "underline" }}>{l.label} ↗</Text>)}
            {data.isFii && <Muted>Os relatórios gerenciais mais recentes ficam nestes sites, na página de cada fundo.</Muted>}
          </Card>
          {data.links.map((l) => <GoldButton key={l.url} ghost label={`${l.label} ↗`} onPress={() => void Linking.openURL(l.url)} />)}
          <Muted>Conteúdo informativo e educativo. Não é recomendação de investimento. Fonte: brapi.dev (B3).</Muted>
        </>
      )}
    </Screen>
  );
}
