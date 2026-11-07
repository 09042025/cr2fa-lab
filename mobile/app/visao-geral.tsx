import { router } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";
import { useAuth } from "../src/auth";
import { pct, rate, usd, usdCompact } from "../src/format";
import { C } from "../src/theme";
import { useApi } from "../src/useApi";
import { Card, GoldButton, H2, Muted, ProBadge, Screen, Status } from "../src/ui";

interface Overview {
  rates: { selic: number | null; cdi: number | null; ipca12m: number | null };
  coins: { id: string; symbol: string; name: string; priceUsd: number; change24h: number | null; image: string | null }[];
  pools: { id: string; symbol: string; project: string; chain: string; tvlUsd: number; apy: number | null }[];
}

const Row = ({ children, last }: { children: React.ReactNode; last?: boolean }) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.line }}>{children}</View>
);

/** Visão geral: mesmos blocos da página "Visão geral" do site. */
export default function VisaoGeral() {
  const { user, isPro } = useAuth();
  const { data, error, loading, reload } = useApi<Overview>("/api/mobile/overview");
  return (
    <Screen title={`Olá, ${user?.name.split(" ")[0] ?? ""}`} subtitle="Resumo dos dados que movem os cinco blocos do seu Protocolo CR2FA.">
      {!isPro && (
        <Card style={{ borderColor: C.gold }}>
          <Text style={{ color: C.goldSoft, fontWeight: "700" }}>Teste o Premium por 30 dias, sem pagar.</Text>
          <Muted>Libere Portfólio, Carteiras, Cursos, Lives VIP e todos os canais.</Muted>
          <GoldButton label="Ver planos" onPress={() => router.push("/planos")} />
        </Card>
      )}
      <Status loading={loading} error={error} onRetry={reload} />
      {data && (
        <>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[["Selic (meta)", data.rates.selic], ["CDI (anual)", data.rates.cdi], ["IPCA (12 m)", data.rates.ipca12m]].map(([label, v]) => (
              <Card key={label as string} style={{ flex: 1, padding: 12 }}>
                <Text style={{ color: C.muted, fontSize: 12 }}>{label as string}</Text>
                <Text style={{ color: C.goldSoft, fontSize: 20, fontWeight: "700" }}>{rate(v as number | null)}</Text>
              </Card>
            ))}
          </View>
          <Muted>Fonte: Banco Central do Brasil (SGS).</Muted>

          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <H2>Maiores criptomoedas</H2>
              <Pressable onPress={() => router.push("/mercado")}><Text style={{ color: C.goldSoft, textDecorationLine: "underline", fontSize: 12 }}>ver mais</Text></Pressable>
            </View>
            {data.coins.map((c, i) => (
              <Pressable key={c.id} onPress={() => router.push({ pathname: "/ativo/[id]", params: { id: c.id } })}><Row last={i === data.coins.length - 1}>
                {c.image ? <Image source={{ uri: c.image }} style={{ width: 28, height: 28, borderRadius: 14 }} /> : <View style={{ width: 28 }} />}
                <View style={{ flex: 1 }}><Text style={{ color: C.white, fontWeight: "600" }}>{c.name}</Text><Text style={{ color: C.muted, fontSize: 12 }}>{c.symbol}</Text></View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: C.white, fontWeight: "700" }}>{usd(c.priceUsd)}</Text>
                  <Text style={{ color: (c.change24h ?? 0) >= 0 ? C.up : C.down, fontWeight: "600", fontSize: 12 }}>{pct(c.change24h)}</Text>
                </View>
              </Row></Pressable>
            ))}
          </Card>

          <Card>
            <H2>Pools DeFi com maior TVL</H2>
            {data.pools.map((p, i) => (
              <Row key={p.id} last={i === data.pools.length - 1}>
                <View style={{ flex: 1 }}><Text style={{ color: C.white, fontWeight: "600" }}>{p.symbol}</Text><Text style={{ color: C.muted, fontSize: 12 }}>{p.project} · {p.chain}</Text></View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: C.white, fontWeight: "700" }}>{usdCompact(p.tvlUsd)}</Text>
                  <Text style={{ color: C.muted, fontSize: 12 }}>APY {rate(p.apy)}</Text>
                </View>
              </Row>
            ))}
          </Card>
        </>
      )}
      <Card onPress={() => router.push("/cursos")}>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><H2>Cursos</H2>{!isPro && <ProBadge />}</View>
        <Muted>Aulas em vídeo. Introdução liberada no Grátis.</Muted>
      </Card>
      <Muted>Conteúdo educativo e informativo, baseado em dados públicos. Não é recomendação de investimento.</Muted>
    </Screen>
  );
}
