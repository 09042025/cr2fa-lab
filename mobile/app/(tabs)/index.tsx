import { router } from "expo-router";
import { Text, View } from "react-native";
import { useAuth } from "../../src/auth";
import { C } from "../../src/theme";
import { Card, GoldButton, H2, Muted, ProBadge, Screen } from "../../src/ui";

export default function Inicio() {
  const { user, isPro } = useAuth();
  return (
    <Screen title={`Olá, ${user?.name.split(" ")[0] ?? ""}`} subtitle="Resumo do seu hub de investimentos.">
      {!isPro && (
        <Card style={{ borderColor: C.gold }}>
          <Text style={{ color: C.goldSoft, fontWeight: "700" }}>Teste o Pró por 30 dias, sem pagar.</Text>
          <Muted>Libere Portfólio, Carteiras, Cursos, Lives VIP e todos os canais.</Muted>
          <GoldButton label="Ver planos" onPress={() => router.push("/planos")} />
        </Card>
      )}
      <Card><H2>Bitcoin</H2><Text style={{ color: C.up, fontSize: 22, fontWeight: "700" }}>exemplo · dados reais na próxima etapa</Text></Card>
      <Card onPress={() => router.push("/cursos")}>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><H2>Cursos</H2>{!isPro && <ProBadge />}</View>
        <Muted>Aulas em vídeo. Introdução liberada no Grátis.</Muted>
      </Card>
    </Screen>
  );
}
