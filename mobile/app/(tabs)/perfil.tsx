import { Text } from "react-native";
import { useAuth } from "../../src/auth";
import { C } from "../../src/theme";
import { Card, GoldButton, H2, Muted, Screen } from "../../src/ui";

export default function Perfil() {
  const { user, isPro, setPlan, signOut } = useAuth();
  return (
    <Screen title="Perfil">
      <Card>
        <H2>{user?.name}</H2>
        <Text style={{ color: isPro ? C.goldSoft : C.muted, fontWeight: "700" }}>Plano: {isPro ? "Pró" : "Grátis"}</Text>
      </Card>
      <Card>
        <H2>Modo de teste</H2>
        <Muted>Troque de plano para conferir o que cada um enxerga.</Muted>
        <GoldButton label={isPro ? "Ver como plano Grátis" : "Ver como plano Pró"} ghost onPress={() => setPlan(isPro ? "free" : "pro")} />
      </Card>
      <GoldButton label="Sair" ghost onPress={signOut} />
    </Screen>
  );
}
