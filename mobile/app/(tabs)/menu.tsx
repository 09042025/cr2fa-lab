import { router, type Href } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Avatar } from "../../src/Avatar";
import { useAuth } from "../../src/auth";
import { C } from "../../src/theme";
import { Card, H2, ProBadge, Screen } from "../../src/ui";

interface Item { label: string; to?: Href; pro?: boolean; diamond?: boolean }

// Mesma lista e mesmos nomes do menu lateral do site. Sem "to" = ainda não chegou ao app (as próximas etapas ligam uma a uma).
const FEED: Item = { label: "Feed", to: { pathname: "/comunidade", params: { aba: "Feed" } } };
const ITEMS: Item[] = [
  { label: "Ações" },
  { label: "White Flame Society", to: "/comunidade", pro: true },
  { label: "Cripto", to: "/mercado" },
  { label: "Fundos imobiliários" },
  { label: "Lives Abertas" },
  { label: "Mentoria com Niza", diamond: true },
  { label: "Mensagens" },
  { label: "Notícias", to: { pathname: "/comunidade", params: { aba: "Notícias" } } },
  { label: "Planos e pagamento", to: "/planos" },
  { label: "Posts Salvos" },
  { label: "Renda fixa" },
  { label: "Visão geral", to: "/" },
].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

function Row({ it }: { it: Item }) {
  const on = !!it.to;
  return (
    <Pressable disabled={!on} onPress={() => it.to && router.push(it.to)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: C.line, opacity: pressed ? 0.7 : on ? 1 : 0.5 })}>
      <Text style={{ color: on ? C.white : C.muted, fontSize: 16, fontWeight: "600" }}>{it.diamond ? "◆ " : ""}{it.label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {it.pro && <ProBadge />}
        {!on && <Text style={{ color: C.muted, fontSize: 11 }}>em breve</Text>}
        {on && <Text style={{ color: C.muted, fontSize: 18 }}>›</Text>}
      </View>
    </Pressable>
  );
}

export default function Menu() {
  const { user, isPro } = useAuth();
  const list: Item[] = [FEED, ...ITEMS, { label: "Configurações", to: "/configuracoes" }];
  return (
    <Screen>
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar name={user?.name ?? ""} id={null} size={52} />
        <View style={{ flex: 1 }}>
          <H2>{user?.name}</H2>
          <Text style={{ color: isPro ? C.goldSoft : C.muted, fontWeight: "700" }}>Plano {isPro ? "Premium" : "Grátis"}</Text>
        </View>
      </Card>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {list.map((it, i) => <View key={it.label} style={i === 0 ? { marginTop: -1 } : undefined}><Row it={it} /></View>)}
      </Card>
    </Screen>
  );
}
