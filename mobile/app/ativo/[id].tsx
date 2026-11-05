import { Stack, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, Linking, Pressable, Text, View } from "react-native";
import { pct, usd, usdCompact } from "../../src/format";
import { C } from "../../src/theme";
import { useApi } from "../../src/useApi";
import { Card, GoldButton, H2, Muted, ProBadge, Screen, Status } from "../../src/ui";

interface Data {
  pro: boolean; days: number;
  coin: {
    id: string; symbol: string; name: string; image: string | null; rank: number | null; price: number | null; marketCap: number | null; volume: number | null; change24h: number | null;
    info: { fdv: number | null; circulating: number | null; total: number | null; max: number | null; ath: number | null; athDate: string | null; atl: number | null; atlDate: string | null; change7d: number | null; change30d: number | null; change1y: number | null; description: string; categories: string[]; contracts: { platform: string; address: string }[] } | null;
    homepage: string | null; twitter: string | null;
  };
  prices: number[];
}
const PERIODS = [{ d: 7, l: "7d" }, { d: 30, l: "30d" }, { d: 90, l: "90d" }, { d: 365, l: "1a" }];
const qty = (v: number | null) => (v === null ? "—" : v.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 2 }));
const dt = (s: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "");
const Item = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <Card style={{ width: "48.5%", padding: 12 }}><Text style={{ color: C.muted, fontSize: 12 }}>{label}</Text><Text style={{ color: C.white, fontSize: 16, fontWeight: "700" }}>{value}</Text>{sub ? <Text style={{ color: C.muted, fontSize: 11 }}>{sub}</Text> : null}</Card>
);
const Chg = ({ v }: { v: number | null }) => <Text style={{ color: (v ?? 0) >= 0 ? C.up : C.down, fontWeight: "700" }}>{pct(v)}</Text>;

export default function Ativo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [d, setD] = useState(30);
  const { data, error, loading, reload } = useApi<Data>(`/api/mobile/coin?id=${encodeURIComponent(id ?? "")}&d=${d}`);
  const c = data?.coin;
  const up = data ? data.prices[data.prices.length - 1] >= data.prices[0] : true;
  const min = data ? Math.min(...data.prices) : 0, max = data ? Math.max(...data.prices) : 1;
  return (
    <Screen subtitle="Preço, gráfico e informações do ativo.">
      <Stack.Screen options={{ title: c ? `${c.name} (${c.symbol})` : "Ativo" }} />
      <Status loading={loading && !data} error={error} onRetry={reload} />
      {c && data && (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            {c.image ? <Image source={{ uri: c.image }} style={{ width: 52, height: 52, borderRadius: 26 }} /> : null}
            <View>
              <Text style={{ color: C.white, fontSize: 26, fontWeight: "700" }}>{c.price === null ? "—" : usd(c.price)} <Chg v={c.change24h} /></Text>
              <Muted>{c.rank ? `Posição #${c.rank} por valor de mercado` : "Fora do ranking principal"}</Muted>
            </View>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Item label="Valor de mercado" value={c.marketCap === null ? "—" : usdCompact(c.marketCap)} />
            <Item label="Volume em 24h" value={c.volume === null ? "—" : usdCompact(c.volume)} />
          </View>
          <Card>
            <H2>Gráfico de preço</H2>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {PERIODS.map((p) => {
                const locked = !data.pro && p.d !== 30, on = p.d === data.days;
                return <Pressable key={p.d} disabled={locked} onPress={() => setD(p.d)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: on ? C.gold : C.panel2, borderWidth: 1, borderColor: on ? C.gold : C.line, opacity: locked ? 0.45 : 1 }}><Text style={{ color: on ? C.ink : C.white, fontWeight: "700" }}>{p.l}</Text></Pressable>;
              })}
            </View>
            {data.prices.length > 1 && (
              <View style={{ height: 160, flexDirection: "row", alignItems: "flex-end", gap: 1 }}>
                {data.prices.map((v, i) => <View key={i} style={{ flex: 1, height: `${Math.max(4, ((v - min) / (max - min || 1)) * 100)}%`, backgroundColor: up ? C.up : C.down, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />)}
              </View>
            )}
            {!data.pro && <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><ProBadge /><Muted>Períodos de 7 dias, 90 dias e 1 ano no plano Premium.</Muted></View>}
          </Card>

          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><Text style={{ color: C.goldSoft, fontSize: 20, fontWeight: "700" }}>Informações</Text>{!data.pro && <ProBadge />}</View>
          {c.info ? (
            <>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Item label="Valor totalmente diluído (FDV)" value={c.info.fdv === null ? "—" : usdCompact(c.info.fdv)} />
                <Item label="Oferta circulante" value={qty(c.info.circulating)} />
                <Item label="Oferta total" value={qty(c.info.total)} />
                <Item label="Oferta máxima" value={c.info.max === null ? "Sem limite" : qty(c.info.max)} />
                <Item label="Máxima histórica" value={c.info.ath === null ? "—" : usd(c.info.ath)} sub={dt(c.info.athDate)} />
                <Item label="Mínima histórica" value={c.info.atl === null ? "—" : usd(c.info.atl)} sub={dt(c.info.atlDate)} />
                <Item label="Variação em 7 dias" value={pct(c.info.change7d)} />
                <Item label="Variação em 30 dias" value={pct(c.info.change30d)} />
                <Item label="Variação em 1 ano" value={pct(c.info.change1y)} />
              </View>
              {c.info.description ? <Card><H2>Sobre {c.name}</H2><Text style={{ color: C.white, lineHeight: 21, opacity: 0.85 }}>{c.info.description}{c.info.description.length >= 900 ? "…" : ""}</Text>
                {c.info.categories.length > 0 && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>{c.info.categories.map((t) => <Text key={t} style={{ color: C.muted, fontSize: 12, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3 }}>{t}</Text>)}</View>}
              </Card> : null}
              {c.info.contracts.length > 0 && <Card><H2>Contratos</H2>{c.info.contracts.map((k) => <Text key={k.platform + k.address} selectable style={{ color: C.white, fontSize: 12 }}><Text style={{ color: C.muted }}>{k.platform}: </Text>{k.address}</Text>)}<Muted>Confira sempre o endereço no site oficial do projeto antes de qualquer transação.</Muted></Card>}
            </>
          ) : (
            <Card style={{ gap: 10 }}><View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><ProBadge /><H2>Oferta, máxima histórica, descrição e contratos (exclusivo do plano Premium)</H2></View><GoldButton label="Ver planos" onPress={() => router.push("/planos")} /></Card>
          )}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {c.homepage ? <GoldButton ghost label="Site oficial ↗" onPress={() => Linking.openURL(c.homepage!)} /> : null}
            {c.twitter ? <GoldButton ghost label="X (Twitter) ↗" onPress={() => Linking.openURL(`https://x.com/${c.twitter}`)} /> : null}
            <GoldButton ghost label="CoinGecko ↗" onPress={() => Linking.openURL(`https://www.coingecko.com/en/coins/${encodeURIComponent(c.id)}`)} />
          </View>
          <Muted>Conteúdo educativo e informativo, baseado em dados públicos. Não é recomendação de investimento.</Muted>
        </>
      )}
    </Screen>
  );
}
