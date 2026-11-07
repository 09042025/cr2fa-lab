import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { get, send } from "../src/api";
import { PostImage } from "../src/Avatar";
import { C } from "../src/theme";

interface Msg { id: number; senderId: number; body: string; imageId: number | null; audioId: number | null; createdAt: number }
interface Data { me: number; other: { id: number; name: string }; blocked: boolean; banned: boolean; messages: Msg[] }
const hora = (t: number) => new Date(t * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** Conversa particular: texto (fotos e áudios recebidos aparecem; para enviar fotos e áudios, use o site por enquanto). */
export default function Conversa() {
  const { id, nome } = useLocalSearchParams<{ id: string; nome?: string }>();
  const [d, setD] = useState<Data | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const load = useCallback(async () => {
    const r = await get<Data>(`/api/community/dm?with=${id}`);
    if ("data" in r) setD(r.data); else setErr(r.error);
  }, [id]);
  useEffect(() => { void load(); const iv = setInterval(load, 5000); return () => clearInterval(iv); }, [load]);

  async function say() {
    if (!text.trim()) return;
    const e = await send("/api/community/dm", { to: Number(id), body: text.trim() });
    if (e) return setErr(e);
    setText(""); setErr(null); void load();
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: C.ink }}>
      <Stack.Screen options={{ title: d?.other.name ?? nome ?? "Conversa" }} />
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 12, gap: 8 }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
        {d?.messages.length === 0 && <Text style={{ color: C.muted, textAlign: "center" }}>Diga olá!</Text>}
        {d?.messages.map((m) => {
          const mine = m.senderId === d.me;
          return (
            <View key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "80%", backgroundColor: mine ? "rgba(217,165,32,0.22)" : C.panel2, borderRadius: 14, padding: 10, gap: 6 }}>
              {m.imageId ? <PostImage id={m.imageId} /> : null}
              {m.audioId ? <Text style={{ color: C.muted }}>🎤 Mensagem de áudio (ouça no site)</Text> : null}
              {m.body ? <Text style={{ color: C.white, fontSize: 15 }}>{m.body}</Text> : null}
              <Text style={{ color: C.muted, fontSize: 10, alignSelf: "flex-end" }}>{hora(m.createdAt)}</Text>
            </View>
          );
        })}
      </ScrollView>
      {err ? <Text style={{ color: C.down, paddingHorizontal: 12 }}>{err}</Text> : null}
      {d?.blocked || d?.banned ? <Text style={{ color: C.muted, padding: 12 }}>{d.banned ? "Você está suspenso da comunidade." : "Você bloqueou este membro."}</Text> : (
        <View style={{ flexDirection: "row", gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: C.line, alignItems: "flex-end" }}>
          <TextInput value={text} onChangeText={setText} placeholder="Mensagem…" placeholderTextColor={C.muted} maxLength={1000} multiline style={{ flex: 1, maxHeight: 110, backgroundColor: C.panel2, borderRadius: 18, color: C.white, paddingHorizontal: 14, paddingVertical: 9, fontSize: 15 }} />
          <Pressable onPress={say} style={{ backgroundColor: C.gold, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 }}><Text style={{ color: C.ink, fontWeight: "800" }}>Enviar</Text></Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
