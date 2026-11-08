import { View } from "react-native";
import { SiteView } from "../src/SiteView";
import { C } from "../src/theme";

/** Masterclass: playlists de aulas por tipo de ativo (a mesma página do site, com o vídeo tocando aqui dentro). */
export default function Cursos() {
  return <View style={{ flex: 1, backgroundColor: C.ink }}><SiteView path="/painel/cursos" /></View>;
}
