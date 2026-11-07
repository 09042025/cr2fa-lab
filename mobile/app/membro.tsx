import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SiteView } from "../src/SiteView";
import { C } from "../src/theme";

/** Perfil de quem foi marcado com @Nome (a mesma página do site, dentro do app). */
export default function Membro() {
  const { nome, id } = useLocalSearchParams<{ nome?: string; id?: string }>();
  const path = id ? `/painel/feed/membro/${id}` : `/painel/feed/mencao?nome=${encodeURIComponent(nome ?? "")}`;
  return <View style={{ flex: 1, backgroundColor: C.ink }}><SiteView path={path} /></View>;
}
