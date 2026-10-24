import { Text } from "react-native";
import { useAuth } from "../src/auth";
import { C } from "../src/theme";
import { Card, GoldButton, H2, Muted, Screen } from "../src/ui";

export default function Planos() {
  const { isPro } = useAuth();
  return (
    <Screen subtitle="Escolha como quer usar o NIZA INVEST.">
      <Card><H2>Grátis</H2><Muted>Conteúdos básicos, Feed, Notícias e chat-geral.</Muted></Card>
      <Card style={{ borderColor: C.gold }}>
        <H2>Pró</H2>
        <Text style={{ color: C.goldSoft, fontSize: 20, fontWeight: "700" }}>R$ 49,90/mês · R$ 499,90/ano</Text>
        <Muted>Portfólio, Carteiras Recomendadas, Cursos, Lives VIP e todos os canais. 30 dias de teste grátis.</Muted>
        {isPro ? <Muted>Você já é Pró.</Muted> : <GoldButton label="Assinar (pagamento na próxima etapa)" onPress={() => {}} />}
      </Card>
    </Screen>
  );
}
