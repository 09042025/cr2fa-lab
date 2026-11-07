import { View } from "react-native";
import { SiteView } from "../../src/SiteView";
import { useAuth } from "../../src/auth";
import { C } from "../../src/theme";
import { ProGate, Screen } from "../../src/ui";

/** White Flame Society: a própria área do site (Manifesto, Society, Lives VIP, Masterclass, Links, Portfólio, Financiamentos, Negócios, Mentoria, Protocolo). */
export default function Comunidade() {
  const { isPro } = useAuth();
  if (!isPro) {
    return (
      <Screen title="White Flame Society" subtitle="Chat, canais e Lives VIP dos membros.">
        <ProGate feature="White Flame Society (exclusivo do plano Premium)"><View /></ProGate>
      </Screen>
    );
  }
  return <View style={{ flex: 1, backgroundColor: C.ink }}><SiteView path="/painel/comunidade/manifesto" /></View>;
}
