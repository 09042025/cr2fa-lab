import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { get } from "../src/api";
import { Avatar } from "../src/Avatar";
import { ago } from "../src/format";
import { C } from "../src/theme";
import { useApi } from "../src/useApi";
import { Card, Muted, Screen, Status } from "../src/ui";

interface Conv { userId: number; name: string; avatarId: number | null; isAdmin: boolean; lastBody: string; lastKind: "text" | "image" | "audio"; lastAt: number; lastMine: boolean; unread: number }
interface Member { id: number; name: string; avatarId: number | null; handle?: string }
const open = (id: number, name: string) => router.push({ pathname: "/conversa", params: { id: String(id), nome: name } });

export default function Mensagens() {
  const { data, error, loading, reload } = useApi<{ conversations: Conv[] }>("/api/community/dm");
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Member[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) { setFound([]); return; }
    const t = setTimeout(async () => { const r = await get<{ members: Member[] }>(`/api/community/dm?q=${encodeURIComponent(q.trim())}`); if ("data" in r) setFound(r.data.members); }, 300);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <Screen title="Mensagens" subtitle="Converse em particular com outros membros.">
      <TextInput value={q} onChangeText={setQ} placeholder="Buscar membro para conversar…" placeholderTextColor={C.muted} style={{ backgroundColor: C.panel2, borderColor: C.line, borderWidth: 1, borderRadius: 999, color: C.white, paddingHorizontal: 16, paddingVertical: 10 }} />
      {found.map((m) => (
        <Pressable key={m.id} onPress={() => open(m.id, m.name)}>
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10 }}><Avatar name={m.name} id={m.avatarId} size={36} /><Text style={{ color: C.white, fontWeight: "700" }}>{m.name}</Text></Card>
        </Pressable>
      ))}
      <Status loading={loading && !data} error={error} onRetry={reload} />
      {data && data.conversations.length === 0 && !found.length && <Card><Muted>Nenhuma conversa ainda. Busque um membro acima para começar.</Muted></Card>}
      {data?.conversations.map((c) => (
        <Pressable key={c.userId} onPress={() => open(c.userId, c.name)}>
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Avatar name={c.name} id={c.avatarId} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.white, fontWeight: "700" }}>{c.name}{c.isAdmin ? <Text style={{ color: C.goldSoft, fontSize: 11 }}>  ADMIN</Text> : null}</Text>
              <Text style={{ color: c.unread ? C.white : C.muted }} numberOfLines={1}>{c.lastMine ? "Você: " : ""}{c.lastKind === "image" ? "📷 Foto" : c.lastKind === "audio" ? "🎤 Áudio" : c.lastBody}</Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Text style={{ color: C.muted, fontSize: 11 }}>{ago(c.lastAt)}</Text>
              {c.unread > 0 && <View style={{ backgroundColor: C.gold, borderRadius: 999, minWidth: 20, paddingHorizontal: 6, alignItems: "center" }}><Text style={{ color: C.ink, fontWeight: "800", fontSize: 12 }}>{c.unread}</Text></View>}
            </View>
          </Card>
        </Pressable>
      ))}
      <Muted>Nunca envie senhas, frases de recuperação de carteira nem faça pagamentos a pedido de desconhecidos. Bloqueie quem insistir.</Muted>
    </Screen>
  );
}
