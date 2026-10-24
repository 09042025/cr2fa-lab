import { Text } from "react-native";
import { useAuth } from "../../src/auth";
import { C } from "../../src/theme";
import { Card, GoldButton, H2, Muted, Screen } from "../../src/ui";

const dia = (t: number) => new Date(t * 1000).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

export default function Perfil() {
  const { user, isPro, setPlan, signOut } = useAuth();
  return (
    <Screen title="Perfil">
      <Card>
        <H2>{user?.name}</H2>
        <Muted>{user?.email}</Muted>
        <Text style={{ color: isPro ? C.goldSoft : C.muted, fontWeight: "700" }}>
          Plano: {isPro ? "Pró" : "Grátis"}
          {user?.role !== "admin" && isPro && user?.planExpiresAt ? ` · ${user.onTrial ? "teste grátis até" : "ativo até"} ${dia(user.planExpiresAt)}` : ""}
        </Text>
      </Card>
      {__DEV__ && (
        <Card>
          <H2>Modo de teste</H2>
          <Muted>Só aparece em desenvolvimento. Troca o plano na tela, sem mexer na sua conta.</Muted>
          <GoldButton label={isPro ? "Ver como plano Grátis" : "Ver como plano Pró"} ghost onPress={() => setPlan(isPro ? "free" : "pro")} />
        </Card>
      )}
      <GoldButton label="Sair" ghost onPress={signOut} />
    </Screen>
  );
}
