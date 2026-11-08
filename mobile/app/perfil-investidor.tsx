import { View } from "react-native";
import { SiteView } from "../src/SiteView";
import { C } from "../src/theme";

/** Perfil de investidor: questionário e resultado (a mesma página do site, dentro do app). */
export default function PerfilInvestidor() {
  return <View style={{ flex: 1, backgroundColor: C.ink }}><SiteView path="/painel/perfil-investidor" /></View>;
}
