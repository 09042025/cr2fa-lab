import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Linking, Text, TextInput, View } from "react-native";
import { get, send } from "../src/api";
import { Avatar } from "../src/Avatar";
import { useAuth } from "../src/auth";
import { ago } from "../src/format";
import { C } from "../src/theme";
import { Card, GoldButton, Muted, Screen } from "../src/ui";

interface Live { id: number; userId: number; name: string; title: string; url: string; platform: string }
interface Msg { id: number; userId: number; name: string; avatarId: number | null; isAdmin: boolean; body: string; createdAt: number }

/** Uma live aberta: botão para assistir na plataforma de origem e o chat da comunidade (atualiza sozinho). */
export default function LiveRoom() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [live, setLive] = useState<Live | null | undefined>(undefined);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await get<{ live: Live | null; messages: Msg[] }>(`/api/community/lives?id=${id}`);
    if ("data" in r) { setLive(r.data.live); setMsgs(r.data.messages); }
  }, [id]);
  useEffect(() => { void load(); const iv = setInterval(load, 5000); return () => clearInterval(iv); }, [load]);

  async function say() {
    if (!text.trim()) return;
    const e = await send("/api/community/lives", { action: "chat", id: Number(id), body: text });
    if (e) return setErr(e);
    setText(""); setErr(null); void load();
  }
  async function end() {
    await send("/api/community/lives", { action: "end", id: Number(id) });
    void load();
  }

  if (live === undefined) return <Screen><Muted>Carregando…</Muted></Screen>;
  if (live === null) return <Screen title="Live encerrada"><Muted>Essa live já terminou.</Muted></Screen>;
  return (
    <Screen title={live.title} subtitle={`${live.name} · ${live.platform}`}>
      <GoldButton label={`Assistir no ${live.platform}`} onPress={() => void Linking.openURL(live.url)} />
      {live.userId === user?.id && <GoldButton ghost label="Encerrar minha live" onPress={end} />}
      <Card style={{ gap: 8 }}>
        <Text style={{ color: C.goldSoft, fontWeight: "800" }}>Chat</Text>
        <TextInput value={text} onChangeText={setText} onSubmitEditing={say} placeholder="Escreva uma mensagem…" placeholderTextColor={C.muted} maxLength={300} style={{ backgroundColor: C.ink, borderColor: C.line, borderWidth: 1, borderRadius: 10, color: C.white, paddingHorizontal: 12, paddingVertical: 9 }} />
        <GoldButton label="Enviar" ghost onPress={say} />
        {err ? <Text style={{ color: C.down }}>{err}</Text> : null}
        {msgs.length === 0 && <Muted>Ainda sem mensagens. Diga olá!</Muted>}
        {msgs.map((m) => (
          <View key={m.id} style={{ flexDirection: "row", gap: 8 }}>
            <Avatar name={m.name} id={m.avatarId} size={28} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.white, fontWeight: "700", fontSize: 13 }}>{m.name}{m.isAdmin ? <Text style={{ color: C.goldSoft, fontSize: 11 }}>  ADMIN</Text> : null} <Text style={{ color: C.muted, fontWeight: "400", fontSize: 11 }}>{ago(m.createdAt)}</Text></Text>
              <Text style={{ color: C.white }}>{m.body}</Text>
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
