import { Text, View } from "react-native";
import { C } from "../../src/theme";
import { Card, H2, Muted, Screen } from "../../src/ui";

const ROWS = [["Bitcoin", "BTC", "+1,2%"], ["Ethereum", "ETH", "−0,4%"], ["Solana", "SOL", "+3,1%"]];

export default function Mercado() {
  return (
    <Screen title="Mercado" subtitle="Cripto, ações, FIIs e renda fixa. Dados reais na próxima etapa.">
      {ROWS.map(([n, t, v]) => (
        <Card key={t}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View><H2>{n}</H2><Muted>{t}</Muted></View>
            <Text style={{ color: v.startsWith("+") ? C.up : C.down, fontWeight: "700" }}>{v}</Text>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
