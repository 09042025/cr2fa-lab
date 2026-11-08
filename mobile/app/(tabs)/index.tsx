import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useAuth } from "../../src/auth";
import { FeedTab } from "../../src/FeedTab";
import { StoriesBar } from "../../src/Stories";
import { C } from "../../src/theme";
import { Screen } from "../../src/ui";

/** Primeira tela do app: Stories, Feed e o botão "+" flutuante para publicar (como no X e no Instagram). */
export default function Feed() {
  const { user } = useAuth();
  const [composing, setComposing] = useState(false);
  const [tick, setTick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const onLoaded = useCallback(() => setRefreshing(false), []);
  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); setTick((n) => n + 1); }}>
        <StoriesBar me={{ name: user?.name ?? "", avatarId: user?.avatarId }} reloadKey={tick} />
        <FeedTab reloadKey={tick} onLoaded={onLoaded} composing={composing} onCloseCompose={() => setComposing(false)} />
      </Screen>
      <Pressable onPress={() => setComposing(true)} accessibilityLabel="Nova publicação" style={{ position: "absolute", right: 20, bottom: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: C.gold, alignItems: "center", justifyContent: "center", elevation: 6 }}>
        <Text style={{ color: C.ink, fontSize: 34, lineHeight: 38, fontWeight: "300" }}>+</Text>
      </Pressable>
    </View>
  );
}
