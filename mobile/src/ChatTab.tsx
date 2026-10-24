import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Act, ConfirmAct, PhotoPicker, ReportAct, Row } from "./actions";
import { get, send } from "./api";
import { Avatar, PostImage } from "./Avatar";
import { ago } from "./format";
import { RichText } from "./RichText";
import { C } from "./theme";
import type { Picked } from "./upload";
import { Card, GoldButton, Muted, Status } from "./ui";

interface Reaction { emoji: string; count: number; mine: boolean }
interface Msg { id: number; userId: number; author: string; isAdmin: boolean; avatarId: number | null; body: string; createdAt: number; imageId: number | null; audioId: number | null; edited: boolean; reply: { id: number; author: string; body: string } | null; reactions: Reaction[] }
interface ChatData { channel: { slug: string; name: string; description: string }; canPost: boolean; banned: boolean; me: { id: number; admin: boolean }; reactions: string[]; reportReasons: string[]; messages: Msg[] }

const input = { backgroundColor: C.ink, borderColor: C.line, borderWidth: 1, borderRadius: 10, color: C.white, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 } as const;

function Message({ m, d, onChanged, onReply, note }: { m: Msg; d: ChatData; onChanged: () => void; onReply: () => void; note: (t: string) => void }) {
  const mine = m.userId === d.me.id;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(m.body);
  const [picker, setPicker] = useState(false);

  const run = async (p: Promise<string | null>, ok?: string) => { const e = await p; if (e) note(e); else { if (ok) note(ok); onChanged(); } };
  const react = (emoji: string) => { setPicker(false); void run(send("/api/community/react", { messageId: m.id, emoji })); };

  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <Avatar name={m.author} id={m.avatarId} size={36} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: C.white, fontWeight: "700" }}>
          {m.author}{mine ? " (você)" : ""}{m.isAdmin ? <Text style={{ color: C.goldSoft, fontSize: 11 }}>  ADMIN</Text> : null}
          <Text style={{ color: C.muted, fontWeight: "400", fontSize: 12 }}>  {ago(m.createdAt)}{m.edited ? " · editado" : ""}</Text>
        </Text>
        {m.reply ? <Text numberOfLines={1} style={{ color: C.muted, fontSize: 12, borderLeftColor: C.gold, borderLeftWidth: 2, paddingLeft: 6 }}>↪ {m.reply.author}: {m.reply.body}</Text> : null}
        {editing ? (
          <View style={{ gap: 8 }}>
            <TextInput style={input} value={text} onChangeText={setText} maxLength={1000} multiline />
            <Row>
              <Act label="Salvar" onPress={() => { setEditing(false); void run(send("/api/community", { id: m.id, body: text.trim() }, "PATCH")); }} />
              <Act label="Cancelar" onPress={() => { setEditing(false); setText(m.body); }} />
            </Row>
          </View>
        ) : m.body ? <RichText body={m.body} style={{ color: C.muted, fontSize: 15, lineHeight: 21 }} /> : null}
        {m.audioId ? <Text style={{ color: C.muted, fontStyle: "italic" }}>🎤 Mensagem de voz (abra no site para ouvir)</Text> : null}
        {m.imageId ? <PostImage id={m.imageId} /> : null}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          {m.reactions.map((r) => (
            <Pressable key={r.emoji} onPress={() => react(r.emoji)} style={{ borderRadius: 999, borderWidth: 1, borderColor: r.mine ? C.gold : C.line, backgroundColor: r.mine ? "rgba(217,165,32,0.15)" : C.panel2, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color: C.white, fontSize: 13 }}>{r.emoji} {r.count}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setPicker(!picker)} style={{ borderRadius: 999, borderWidth: 1, borderColor: C.line, paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ color: C.muted, fontSize: 13 }}>＋ 😀</Text></Pressable>
        </View>
        {picker && (
          <View style={{ flexDirection: "row", gap: 6, backgroundColor: C.panel2, padding: 8, borderRadius: 10, alignSelf: "flex-start" }}>
            {d.reactions.map((e) => <Pressable key={e} onPress={() => react(e)}><Text style={{ fontSize: 22 }}>{e}</Text></Pressable>)}
          </View>
        )}

        <Row>
          {d.canPost && <Act label="Responder" onPress={onReply} />}
          {mine && !editing && <Act label="Editar" onPress={() => setEditing(true)} />}
          {(mine || d.me.admin) && <ConfirmAct label="Apagar" ask="Apagar a mensagem?" onConfirm={() => run(send("/api/community?id=" + m.id, undefined, "DELETE"))} />}
          {!mine && <ReportAct reasons={d.reportReasons} onPick={(reason) => run(send("/api/community/report", { messageId: m.id, reason }), "Denúncia enviada à moderação. Obrigado.")} />}
          {!mine && !m.isAdmin && <ConfirmAct label="Bloquear" ask={`Bloquear ${m.author.split(" ")[0]}?`} onConfirm={() => run(send("/api/community/block", { userId: m.userId, blocked: true }), "Membro bloqueado. Você não verá mais as mensagens dele.")} />}
        </Row>
      </View>
    </View>
  );
}

/** Mensagens de um canal, com atualização automática a cada 10 segundos enquanto a aba está aberta. */
export function ChatTab({ channel }: { channel: string }) {
  const [data, setData] = useState<ChatData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<Picked | null>(null);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<string | null>(null);
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
    if (!text.trim() && !photo) return;
    setSending(true); setNote(null);
    const e = await send("/api/community", { channel, body: text.trim(), replyTo: replyTo?.id ?? null, imageId: photo?.id ?? null });
    setSending(false);
    if (e) return setNote(e);
    setText(""); setPhoto(null); setReplyTo(null); void load(true);
  }

  return (
    <>
      <Status loading={loading && !data} error={error} onRetry={() => load()} />
      {data && (
        <Card style={{ gap: 14 }}>
          <View style={{ borderBottomColor: C.line, borderBottomWidth: 1, paddingBottom: 8 }}>
            <Text style={{ color: C.white, fontWeight: "700", fontSize: 16 }}>#{data.channel.name}</Text>
            <Muted>{data.channel.description}</Muted>
          </View>
          {data.messages.length === 0 && <Muted>Ainda não há mensagens neste canal. Seja o primeiro!</Muted>}
          {data.messages.map((m) => (
            <Message key={m.id} m={m} d={data} onChanged={() => load(true)} onReply={() => setReplyTo(m)} note={setNote} />
          ))}
        </Card>
      )}
      {data?.canPost && (
        <Card style={{ gap: 10 }}>
          {replyTo && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text numberOfLines={1} style={{ flex: 1, color: C.muted, borderLeftColor: C.gold, borderLeftWidth: 2, paddingLeft: 6 }}>Respondendo a {replyTo.author}: {replyTo.body || "foto"}</Text>
              <Act label="Cancelar" onPress={() => setReplyTo(null)} />
            </View>
          )}
          <TextInput style={[input, { minHeight: 48, textAlignVertical: "top" }]} placeholder="Escreva uma mensagem…" placeholderTextColor={C.muted} value={text} onChangeText={setText} maxLength={1000} multiline />
          <PhotoPicker value={photo} onChange={setPhoto} onError={setNote} />
          <GoldButton label={sending ? "Enviando…" : "Enviar"} onPress={enviar} />
        </Card>
      )}
      {note ? <Text style={{ color: C.muted }}>{note}</Text> : null}
      {data && !data.canPost && <Muted>{data.banned ? "Você foi suspenso da comunidade pela moderação." : "Canal somente leitura."}</Muted>}
      <Muted>Conteúdo da comunidade é opinião dos membros, não recomendação de investimento.</Muted>
    </>
  );
}
