import { router } from "expo-router";
import { Pressable, ScrollView, Text } from "react-native";
import { C } from "./theme";
import { ProBadge } from "./ui";

// Mesmas seções do site (Cripto). "to" = tela nativa no app; sem "to" = próxima etapa.
export type CriptoRoute = "/cripto" | "/mercado" | "/defi" | "/rwa" | "/futuros" | "/etf" | "/onchain" | "/plataformas";
const SECOES: { label: string; pro?: boolean; to?: CriptoRoute }[] = [
  { label: "Visão de mercado", to: "/cripto" },
  { label: "Mercado Cripto", to: "/mercado" },
  { label: "HUB DEFI", pro: true, to: "/defi" },
  { label: "RWA", to: "/rwa" },
  { label: "Futuros", to: "/futuros" },
  { label: "ETFs de Cripto", to: "/etf" },
  { label: "Análise on Chain", pro: true, to: "/onchain" },
  { label: "DEX e Plataformas DeFi", to: "/plataformas" },
];

export function CriptoNav({ current }: { current: CriptoRoute }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, borderBottomWidth: 1, borderBottomColor: C.line }}>
      {SECOES.map((s) => {
        const on = s.to === current;
        return (
          <Pressable key={s.label} disabled={!s.to || on} onPress={() => s.to && (s.to === "/mercado" ? router.push(s.to) : router.replace(s.to))} style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: on ? C.gold : "transparent", marginBottom: -1, opacity: s.to ? 1 : 0.5, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ color: on ? C.goldSoft : C.muted, fontWeight: "600" }}>{s.label}</Text>
            {s.pro && <ProBadge />}
            {!s.to && <Text style={{ color: C.muted, fontSize: 10 }}>em breve</Text>}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
