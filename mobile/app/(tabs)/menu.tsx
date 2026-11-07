import { router, type Href } from "expo-router";
import { Linking, Pressable, Text, View } from "react-native";
import { Avatar } from "../../src/Avatar";
import { useAuth } from "../../src/auth";
import { C } from "../../src/theme";
import { Card, H2, ProBadge, Screen } from "../../src/ui";

interface Item { label: string; to?: Href; url?: string; pro?: boolean; diamond?: boolean }

// Mesma lista e mesmos nomes do menu lateral do site. Sem "to" = ainda não chegou ao app (as próximas etapas ligam uma a uma).
const ITEMS: Item[] = [
  { label: "Feed", to: "/" },
  { label: "Ações" },
  { label: "Cripto", to: "/cripto" },
  { label: "Fundos imobiliários" },
  { label: "Lives Abertas" },
  { label: "Mensagens" },
  { label: "Mentoria com Niza", diamond: true },
  { label: "Notícias", to: { pathname: "/comunidade", params: { aba: "Notícias" } } },
  { label: "Planos e pagamento", to: "/planos" },
  { label: "Posts Salvos" },
  { label: "Renda fixa" },
  { label: "Visão geral", to: "/visao-geral" },
  { label: "White Flame Society", to: "/comunidade", pro: true },
];

function Row({ it }: { it: Item }) {
  const on = !!it.to || !!it.url;
  return (
    <Pressable disabled={!on} onPress={() => (it.url ? Linking.openURL(it.url) : it.to && router.push(it.to))} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: C.line, opacity: pressed ? 0.7 : on ? 1 : 0.5 })}>
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
  const { user, isPro, signOut } = useAuth();
  const list: Item[] = [...ITEMS, ...(user?.role === "admin" ? [{ label: "Administração", url: "https://nizainvest.com.br/painel/admin" }] : []), { label: "Configurações", to: "/configuracoes" }];
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
      <Pressable onPress={() => void signOut()} style={{ alignItems: "center", paddingVertical: 14 }}>
        <Text style={{ color: C.down, fontWeight: "700", fontSize: 16 }}>Sair</Text>
      </Pressable>
    </Screen>
  );
}
