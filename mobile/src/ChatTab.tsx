import { useCallback, useEffect, useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { get, send } from "./api";
import { Avatar, PostImage } from "./Avatar";
import { ago } from "./format";
import { RichText } from "./RichText";
import { C } from "./theme";
import { Card, GoldButton, Muted, Status } from "./ui";

interface Msg { id: number; userId: number; author: string; isAdmin: boolean; avatarId: number | null; body: string; createdAt: number; imageId: number | null; audioId: number | null; edited: boolean; reply: { id: number; author: string; body: string } | null }
interface ChatData { channel: { slug: string; name: string; description: string }; canPost: boolean; banned: boolean; me: { id: number }; messages: Msg[] }

const input = { backgroundColor: C.ink, borderColor: C.line, borderWidth: 1, borderRadius: 10, color: C.white, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 } as const;

/** Mensagens de um canal, com atualização automática a cada 10 segundos enquanto a aba está aberta. */
export function ChatTab({ channel }: { channel: string }) {
  const [data, setData] = useState<ChatData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const alive = useRef(true);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    const r = await get<ChatData>(`/api/mobile/chat?c=${channel}`);
    if (!alive.current) return;
    if ("data" in r) { setData(r.data); setError(null); } else if (!quiet) setError(r.error);
    setLoading(false);
  }, [channel]);

  useEffect(() => {
    alive.current = true;
    void load();
    const t = setInterval(() => void load(true), 10_000);
    return () => { alive.current = false; clearInterval(t); };
  }, [load]);

  async function enviar() {
    if (!text.trim()) return;
    setSending(true); setSendErr(null);
    const e = await send("/api/community", { channel, body: text.trim() });
    setSending(false);
    if (e) return setSendErr(e);
    setText(""); void load(true);
  }

  const me = data?.me.id;
  return (
    <>
      <Status loading={loading && !data} error={error} onRetry={() => load()} />
      {data && (
        <Card style={{ gap: 12 }}>
          <View style={{ borderBottomColor: C.line, borderBottomWidth: 1, paddingBottom: 8 }}>
            <Text style={{ color: C.white, fontWeight: "700", fontSize: 16 }}>#{data.channel.name}</Text>
            <Muted>{data.channel.description}</Muted>
          </View>
          {data.messages.length === 0 && <Muted>Ainda não há mensagens neste canal. Seja o primeiro!</Muted>}
          {data.messages.map((m) => (
            <View key={m.id} style={{ flexDirection: "row", gap: 10 }}>
              <Avatar name={m.author} id={m.avatarId} size={36} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: C.white, fontWeight: "700" }}>
                  {m.author}{m.userId === me ? " (você)" : ""}{m.isAdmin ? <Text style={{ color: C.goldSoft, fontSize: 11 }}>  ADMIN</Text> : null}
                  <Text style={{ color: C.muted, fontWeight: "400", fontSize: 12 }}>  {ago(m.createdAt)}{m.edited ? " · editado" : ""}</Text>
                </Text>
                {m.reply ? <Text numberOfLines={1} style={{ color: C.muted, fontSize: 12, borderLeftColor: C.gold, borderLeftWidth: 2, paddingLeft: 6 }}>↪ {m.reply.author}: {m.reply.body}</Text> : null}
                {m.body ? <RichText body={m.body} style={{ color: C.muted, fontSize: 15, lineHeight: 21 }} /> : null}
                {m.audioId ? <Text style={{ color: C.muted, fontStyle: "italic" }}>🎤 Mensagem de voz (abra no site para ouvir)</Text> : null}
                {m.imageId ? <PostImage id={m.imageId} /> : null}
              </View>
            </View>
          ))}
        </Card>
      )}
      {data?.canPost && (
        <Card style={{ gap: 10 }}>
          <TextInput style={[input, { minHeight: 48, textAlignVertical: "top" }]} placeholder="Escreva uma mensagem…" placeholderTextColor={C.muted} value={text} onChangeText={setText} maxLength={1000} multiline />
          {sendErr ? <Text style={{ color: C.down }}>{sendErr}</Text> : null}
          <GoldButton label={sending ? "Enviando…" : "Enviar"} onPress={enviar} />
        </Card>
      )}
      {data && !data.canPost && <Muted>{data.banned ? "Você foi suspenso da comunidade pela moderação." : "Canal somente leitura."}</Muted>}
      <Muted>Conteúdo da comunidade é opinião dos membros, não recomendação de investimento.</Muted>
    </>
  );
}
