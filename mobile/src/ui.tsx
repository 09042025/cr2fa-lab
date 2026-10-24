import { router } from "expo-router";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "./auth";
import { C } from "./theme";

export function Screen({ title, subtitle, children }: { title?: string; subtitle?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.ink }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: 32, gap: 12 }}>
      {title ? <Text style={s.h1}>{title}</Text> : null}
      {subtitle ? <Text style={s.muted}>{subtitle}</Text> : null}
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: ViewStyle; onPress?: () => void }) {
  const inner = <View style={[s.card, style]}>{children}</View>;
  return onPress ? <Pressable onPress={onPress}>{inner}</Pressable> : inner;
}

export const H2 = ({ children }: { children: ReactNode }) => <Text style={s.h2}>{children}</Text>;
export const Muted = ({ children }: { children: ReactNode }) => <Text style={s.muted}>{children}</Text>;

export function GoldButton({ label, onPress, ghost }: { label: string; onPress: () => void; ghost?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.btn, ghost ? s.btnGhost : s.btnGold, pressed && { opacity: 0.8 }]}>
      <Text style={[s.btnText, ghost && { color: C.white }]}>{label}</Text>
    </Pressable>
  );
}

export function ProBadge() {
  return <View style={s.badge}><Text style={s.badgeText}>PRÓ</Text></View>;
}

/** Tela/trecho exclusivo do plano Pró: quem é Grátis vê o cadeado e o botão para os planos. */
export function ProGate({ feature, children }: { feature: string; children: ReactNode }) {
  const { isPro } = useAuth();
  if (isPro) return <>{children}</>;
  return (
    <Card style={{ alignItems: "flex-start", gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><ProBadge /><Text style={s.h2}>{feature}</Text></View>
      <Text style={s.muted}>Este recurso faz parte do plano Pró. Assine para liberar.</Text>
      <GoldButton label="Ver planos" onPress={() => router.push("/planos")} />
    </Card>
  );
}

export const s = StyleSheet.create({
  h1: { color: C.goldSoft, fontSize: 28, fontWeight: "700" },
  h2: { color: C.white, fontSize: 16, fontWeight: "600" },
  muted: { color: C.muted, fontSize: 14, lineHeight: 20 },
  card: { backgroundColor: C.panel, borderColor: C.line, borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  btn: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 18, alignItems: "center" },
  btnGold: { backgroundColor: C.gold },
  btnGhost: { borderColor: C.line, borderWidth: 1, backgroundColor: C.panel2 },
  btnText: { color: C.ink, fontWeight: "700", fontSize: 15 },
  badge: { backgroundColor: "rgba(217,165,32,0.2)", borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: C.goldSoft, fontSize: 10, fontWeight: "700" },
});

/** Aviso de carregando / erro com botão de tentar de novo. */
export function Status({ loading, error, onRetry }: { loading: boolean; error: string | null; onRetry: () => void }) {
  if (loading) return <ActivityIndicator color={C.gold} style={{ marginVertical: 16 }} />;
  if (!error) return null;
  return (
    <Card style={{ borderColor: C.down }}>
      <Text style={{ color: C.down }}>{error}</Text>
      <GoldButton label="Tentar de novo" ghost onPress={onRetry} />
    </Card>
  );
}
