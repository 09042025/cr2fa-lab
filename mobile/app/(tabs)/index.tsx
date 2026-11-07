import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { FeedTab } from "../../src/FeedTab";
import { C } from "../../src/theme";
import { Screen } from "../../src/ui";

/** Primeira tela do app: o Feed, com o botão "+" flutuante para publicar (como no X). */
export default function Feed() {
  const [composing, setComposing] = useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <Screen title="Feed" subtitle="Publicações dos membros sobre investimentos: análises, dúvidas e ideias.">
        <FeedTab composing={composing} onCloseCompose={() => setComposing(false)} />
      </Screen>
      <Pressable onPress={() => setComposing(true)} accessibilityLabel="Nova publicação" style={{ position: "absolute", right: 20, bottom: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: C.gold, alignItems: "center", justifyContent: "center", elevation: 6 }}>
        <Text style={{ color: C.ink, fontSize: 34, lineHeight: 38, fontWeight: "300" }}>+</Text>
      </Pressable>
    </View>
  );
}
