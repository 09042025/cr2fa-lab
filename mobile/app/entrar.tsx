import { Text, View } from "react-native";
import { useAuth } from "../src/auth";
import { C } from "../src/theme";
import { Card, GoldButton, Muted, Screen } from "../src/ui";

export default function Entrar() {
  const { signInDemo } = useAuth();
  return (
    <Screen>
      <View style={{ alignItems: "center", marginTop: 40, marginBottom: 16 }}>
        <Text style={{ color: C.goldSoft, fontSize: 30, fontWeight: "800", letterSpacing: 4 }}>NIZA <Text style={{ color: C.gold }}>INVEST</Text></Text>
        <Muted>Hub de investimentos</Muted>
      </View>
      <Card>
        <Text style={{ color: C.white, fontWeight: "600", fontSize: 16 }}>Modo de teste das telas</Text>
        <Muted>O login real (e-mail e senha do site) entra na próxima etapa. Por enquanto, escolha como quer ver o app:</Muted>
        <View style={{ gap: 10, marginTop: 8 }}>
          <GoldButton label="Entrar como plano Grátis" ghost onPress={() => signInDemo("free")} />
          <GoldButton label="Entrar como plano Pró" onPress={() => signInDemo("pro")} />
        </View>
      </Card>
    </Screen>
  );
}
