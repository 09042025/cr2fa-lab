import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { send } from "../src/api";
import { Avatar } from "../src/Avatar";
import { C } from "../src/theme";
import { useApi } from "../src/useApi";
import { Card, GoldButton, Muted, Screen, Status } from "../src/ui";

interface Live { id: number; userId: number; name: string; avatarId: number | null; title: string; url: string; platform: string; startedAt: number }
const since = (t: number) => {
  const m = Math.max(0, Math.floor((Date.now() / 1000 - t) / 60));
  return m < 1 ? "agora" : m < 60 ? `há ${m} min` : `há ${Math.floor(m / 60)} h`;
};
const input = { backgroundColor: C.ink, borderColor: C.line, borderWidth: 1, borderRadius: 10, color: C.white, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 } as const;

export default function Lives() {
  const { data, error, loading, reload } = useApi<{ lives: Live[] }>("/api/community/lives");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  async function start() {
    setMsg(null);
    const e = await send("/api/community/lives", { action: "start", title, url });
    if (e) return setMsg(e);
    setOpen(false); setTitle(""); setUrl(""); void reload();
  }
  return (
    <Screen title="Lives Abertas" subtitle="Transmissões ao vivo dos membros. Entre, assista e converse no chat.">
      <GoldButton label={open ? "Fechar" : "Começar uma live"} ghost={open} onPress={() => setOpen(!open)} />
      {open && (
        <Card style={{ gap: 8 }}>
          <Muted>Você transmite em outra plataforma (YouTube, Instagram, TikTok, Twitch, Google Meet…) e cola o link aqui. O chat fica no app.</Muted>
          <TextInput style={input} value={title} onChangeText={setTitle} placeholder="Título da live" placeholderTextColor={C.muted} maxLength={80} />
          <TextInput style={input} value={url} onChangeText={setUrl} placeholder="Link https da transmissão" placeholderTextColor={C.muted} autoCapitalize="none" keyboardType="url" />
          {msg ? <Text style={{ color: C.down }}>{msg}</Text> : null}
          <GoldButton label="Entrar no ar" onPress={start} />
        </Card>
      )}
      <Status loading={loading && !data} error={error} onRetry={reload} />
      {data && data.lives.length === 0 && <Card><Muted>Ninguém está ao vivo agora. Que tal começar a primeira live?</Muted></Card>}
      {data?.lives.map((l) => (
        <Pressable key={l.id} onPress={() => router.push({ pathname: "/live", params: { id: String(l.id) } })}>
          <Card style={{ gap: 8 }}>
            <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#dc2626", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" }} /><Text style={{ color: "#fff", fontWeight: "800", fontSize: 11 }}>AO VIVO</Text>
            </View>
            <Text style={{ color: C.white, fontWeight: "700", fontSize: 16 }}>{l.title}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Avatar name={l.name} id={l.avatarId} size={28} />
              <Text style={{ color: C.muted, flex: 1 }} numberOfLines={1}>{l.name}</Text>
              <Text style={{ color: C.muted, fontSize: 12 }}>{l.platform} · {since(l.startedAt)}</Text>
            </View>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
