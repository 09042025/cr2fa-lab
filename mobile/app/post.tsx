import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SiteView } from "../src/SiteView";
import { C } from "../src/theme";

/** Abre uma publicação (a mesma página do site, dentro do app). */
export default function Post() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <View style={{ flex: 1, backgroundColor: C.ink }}><SiteView path={`/painel/feed/post/${Number(id) || 0}`} /></View>;
}
