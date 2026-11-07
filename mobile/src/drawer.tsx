import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Dimensions, Image, Linking, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";
import { Avatar } from "./Avatar";
import { useAuth } from "./auth";
import { C } from "./theme";

interface Item { label: string; to?: Href; url?: string; pro?: boolean; diamond?: boolean }

// Mesma lista e mesma ordem do menu lateral do site. Sem destino = ainda não chegou ao app.
const ITEMS: Item[] = [
  { label: "Feed", to: "/" },
  { label: "Ações", to: "/acoes" },
  { label: "Cripto", to: "/cripto" },
  { label: "Fundos imobiliários", to: "/fiis" },
  { label: "Lives Abertas", to: "/lives" },
  { label: "Mensagens", to: "/mensagens" },
  { label: "Mentoria com Niza", to: "/mentoria", diamond: true },
  { label: "Notícias", to: "/noticias" },
  { label: "Planos e pagamento", to: "/planos" },
  { label: "Posts Salvos", to: "/salvos" },
  { label: "Renda fixa", to: "/renda-fixa" },
  { label: "Visão geral", to: "/visao-geral" },
  { label: "Mercado Cripto", to: "/mercado" },
  { label: "Portfólio", to: "/portfolio", pro: true },
  { label: "White Flame Society", to: "/comunidade", pro: true },
];

const Ctx = createContext<{ open: () => void }>({ open: () => {} });
export const useDrawer = () => useContext(Ctx);

export function Logo({ markOnly }: { markOnly?: boolean }) {
  if (markOnly) return <Image source={require("../assets/logo-niza-mark.webp")} style={{ width: 62, height: 54 }} resizeMode="contain" />;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Image source={require("../assets/logo-niza-mark.webp")} style={{ width: 39, height: 34 }} resizeMode="contain" />
      <Text style={{ fontFamily: "serif", fontSize: 17, fontWeight: "700", letterSpacing: 2.7, color: C.goldSoft }}>
        NIZA <Text style={{ fontWeight: "500", color: C.gold }}>INVEST</Text>
      </Text>
    </View>
  );
}

function Panel({ onClose }: { onClose: () => void }) {
  const { user, isPro, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const go = (it: Item) => {
    onClose();
    if (it.url) void Linking.openURL(it.url);
    else if (it.to) router.navigate(it.to);
  };
  const extra: Item[] = [
    ...(user?.role === "admin" ? [{ label: "Administração", url: "https://nizainvest.com.br/painel/admin" }] : []),
    { label: "Configurações", to: "/configuracoes" },
  ];
  const row = (it: Item) => {
    const on = !!it.to || !!it.url;
    return (
      <Pressable key={it.label} disabled={!on} onPress={() => go(it)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 15, paddingHorizontal: 12, opacity: pressed ? 0.6 : on ? 1 : 0.45 })}>
        <Text style={{ color: C.white, fontSize: 17 }}>{it.diamond ? "◆  " : ""}{it.label}</Text>
        {!on ? <Text style={{ color: C.muted, fontSize: 11 }}>em breve</Text> : it.pro && !isPro ? <Text style={{ color: C.goldSoft, fontSize: 11, fontWeight: "700" }}>PREMIUM</Text> : null}
      </Pressable>
    );
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.panel, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18 }}>
        <Logo />
        <Pressable onPress={onClose} hitSlop={12}><Text style={{ color: C.muted, fontSize: 26 }}>✕</Text></Pressable>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 18, borderBottomWidth: 1, borderBottomColor: C.line }}>
        <Avatar name={user?.name ?? ""} id={user?.avatarId ?? null} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.white, fontSize: 18, fontWeight: "800" }} numberOfLines={1}>{(user?.name ?? "").toUpperCase()}</Text>
          <Text style={{ color: C.muted }} numberOfLines={1}>{user?.email}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 10, paddingTop: 6 }}>
        {ITEMS.map(row)}
        <View style={{ height: 1, backgroundColor: C.line, marginVertical: 8 }} />
        {extra.map(row)}
        <Pressable onPress={() => { onClose(); void signOut(); }} style={{ paddingVertical: 15, paddingHorizontal: 12 }}>
          <Text style={{ color: C.down, fontSize: 17, fontWeight: "700" }}>Sair</Text>
        </Pressable>
      </ScrollView>
      <View style={{ paddingHorizontal: 18, gap: 10, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 12 }}>
        <View style={{ borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 10, flexDirection: "row", gap: 8 }}>
          <Text style={{ fontSize: 16 }}>🇧🇷</Text><Text style={{ color: C.white }}>Português</Text>
        </View>
        <Text style={{ color: C.muted }}>Plano: <Text style={{ color: C.goldSoft, fontWeight: "700" }}>{isPro ? "Premium" : "Grátis"}</Text></Text>
      </View>
    </View>
  );
}

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState(false);
  const w = Math.min(Dimensions.get("window").width * 0.82, 360);
  const x = useRef(new Animated.Value(-w)).current;
  const open = useCallback(() => { setShown(true); }, []);
  useEffect(() => { if (shown) Animated.timing(x, { toValue: 0, duration: 220, useNativeDriver: true }).start(); }, [shown, x]);
  const close = useCallback(() => {
    Animated.timing(x, { toValue: -w, duration: 180, useNativeDriver: true }).start(() => setShown(false));
  }, [x, w]);
  return (
    <Ctx.Provider value={{ open }}>
      {children}
      <Modal visible={shown} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
        <View style={{ flex: 1, flexDirection: "row", backgroundColor: "rgba(0,0,0,0.55)" }}>
          <Animated.View style={{ width: w, transform: [{ translateX: x }] }}><Panel onClose={close} /></Animated.View>
          <Pressable style={{ flex: 1 }} onPress={close} />
        </View>
      </Modal>
    </Ctx.Provider>
  );
}

/** Barra do topo igual à do site no celular: foto (abre o menu), logo e idioma. */
export function AppHeader() {
  const { open } = useDrawer();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 6, paddingBottom: 10, paddingHorizontal: 14, backgroundColor: C.ink, borderBottomWidth: 1, borderBottomColor: C.line, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Pressable onPress={open} hitSlop={10}><Avatar name={user?.name ?? ""} id={user?.avatarId ?? null} size={40} /></Pressable>
      <Logo markOnly />
      <View style={{ borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 }}><Text style={{ fontSize: 16 }}>🇧🇷 <Text style={{ color: C.muted, fontSize: 9 }}>▾</Text></Text></View>
    </View>
  );
}
