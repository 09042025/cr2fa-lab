import { Linking, Text, View } from "react-native";
import { router } from "expo-router";
import { API } from "../src/api";
import { C } from "../src/theme";
import { useApi } from "../src/useApi";
import { Card, GoldButton, H2, Muted, Screen, Status } from "../src/ui";

interface Data {
  current: string; until: { at: number; trial: boolean } | null; trial: number; diamond: boolean;
  premium: { monthly: string; yearly: string; features: string[]; free: string[] };
  mentoria: { price: string; sessions: number; spots: { left: number; limit: number; turma: number; full: boolean } };
  diamondPlan: { name: string; price: string; features: string[] };
}
const dia = (t: number) => new Date(t * 1000).toLocaleDateString("pt-BR");
const Item = ({ t }: { t: string }) => <Text style={{ color: C.muted, lineHeight: 20 }}>✓ {t}</Text>;

/** Planos e pagamento: os mesmos planos e preços do site. O pagamento (Pix, cartão ou cripto) é concluído no site. */
export default function Planos() {
  const { data, error, loading, reload } = useApi<Data>("/api/mobile/planos");
  const site = (path: string) => void Linking.openURL(`${API}${path}`);
  return (
    <Screen title="Planos e pagamento" subtitle="Pague por Pix, cartão de crédito ou cripto. O Premium é liberado assim que o pagamento é confirmado.">
      <Status loading={loading && !data} error={error} onRetry={reload} />
      {data && (
        <>
          <Card style={{ gap: 6 }}>
            <Muted>Seu plano</Muted>
            <Text style={{ color: C.goldSoft, fontSize: 20, fontWeight: "800" }}>{data.current}</Text>
            {data.until && <Muted>{data.until.trial ? "Teste grátis até" : "Ativo até"} {dia(data.until.at)}</Muted>}
          </Card>

          {data.trial > 0 && (
            <Card style={{ borderColor: C.gold, gap: 6 }}>
              <H2>Teste o Premium por {data.trial} dias, sem pagar</H2>
              <Muted>Libera todos os recursos do Premium agora. Não pedimos cartão e nada é cobrado no fim: o plano volta para o Grátis, e você assina só se quiser.</Muted>
              <GoldButton label="Começar teste grátis no site" onPress={() => site("/planos")} />
            </Card>
          )}

          <Card style={{ gap: 6 }}>
            <H2>Grátis</H2>
            {data.premium.free.map((f) => <Item key={f} t={f} />)}
          </Card>

          <Card style={{ borderColor: C.gold, gap: 8 }}>
            <H2>Premium</H2>
            <Text style={{ color: C.goldSoft, fontSize: 22, fontWeight: "800" }}>{data.premium.monthly}<Text style={{ fontSize: 14, fontWeight: "600" }}> /mês</Text></Text>
            <Text style={{ color: C.goldSoft, fontSize: 18, fontWeight: "700" }}>{data.premium.yearly}<Text style={{ fontSize: 13, fontWeight: "600" }}> /ano</Text></Text>
            {data.premium.features.map((f) => <Item key={f} t={f} />)}
            <GoldButton label="Assinar no site (Pix, cartão ou cripto)" onPress={() => site("/planos")} />
          </Card>

          <Card style={{ borderColor: "rgba(125,190,255,0.4)", gap: 8 }}>
            <Text style={{ color: "#bfe0ff", fontWeight: "800", letterSpacing: 2, fontSize: 11 }}>◆ MENTORIA COM NIZA</Text>
            <Text style={{ color: C.goldSoft, fontSize: 24, fontWeight: "800" }}>{data.mentoria.price}</Text>
            <Muted>Pagamento único, à parte do Premium. {data.mentoria.sessions} aulas particulares de 1 hora (1 por mês) via Google Meet ou Teams, com foco em criptomoedas, avaliação da sua carteira pelo Protocolo CR2FA e o racional dos pools de liquidez. Sem recomendação de ativos.</Muted>
            <Text style={{ color: data.mentoria.spots.full ? C.down : C.up, fontWeight: "700" }}>{data.mentoria.spots.full ? `Turma ${data.mentoria.spots.turma} esgotada` : `Turma ${data.mentoria.spots.turma}: ${data.mentoria.spots.left} de ${data.mentoria.spots.limit} vagas`}</Text>
            <GoldButton ghost label="Ver detalhes da mentoria" onPress={() => router.push("/mentoria")} />
            {!data.mentoria.spots.full && <GoldButton label="Contratar no site" onPress={() => site("/planos#mentoria")} />}
          </Card>

          {!data.diamond && (
            <Card style={{ borderColor: "rgba(125,190,255,0.4)", gap: 8 }}>
              <Text style={{ color: "#bfe0ff", fontWeight: "800", letterSpacing: 2, fontSize: 11 }}>◆ VITALÍCIO · PAGAMENTO ÚNICO</Text>
              <H2>Plano Diamond</H2>
              <Text style={{ color: C.goldSoft, fontSize: 24, fontWeight: "800" }}>{data.diamondPlan.price}</Text>
              <Muted>Tudo do Premium, para sempre, mais a Mentoria com Niza.</Muted>
              {data.diamondPlan.features.map((f) => <Item key={f} t={f} />)}
              <GoldButton label="Contratar no site" onPress={() => site("/planos#diamond")} />
            </Card>
          )}
          <Muted>O pagamento é concluído com segurança no site. Conteúdo educacional, sem recomendação de investimento.</Muted>
        </>
      )}
    </Screen>
  );
}
