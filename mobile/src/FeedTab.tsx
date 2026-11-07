import { useCallback, useEffect, useState } from "react";
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "./auth";
import { Select } from "./Select";
import { pickAndUpload } from "./upload";
import { Recorder, publishCashpill } from "./Recorder";
import { get, send } from "./api";
import { Avatar, PostImage } from "./Avatar";
import { ago } from "./format";
import { RichText } from "./RichText";
import { C } from "./theme";
import { Act, ConfirmAct, ReportAct, Row } from "./actions";
import type { Picked } from "./upload";
import { Card, GoldButton, Muted, Status } from "./ui";

interface Comment { id: number; userId: number; author: string; authorAvatar: number | null; authorIsAdmin: boolean; body: string; createdAt: number }
interface Post { id: number; userId: number; author: string; authorAvatar: number | null; authorIsAdmin: boolean; topic: string; body: string; imageId: number | null; createdAt: number; likes: number; liked: boolean; pinned: boolean; bookmarked?: boolean; comments: Comment[] }
interface FeedData { topics: { id: string; label: string }[]; reportReasons: string[]; me: { id: number; admin: boolean }; posts: Post[]; more: boolean }

const input = { backgroundColor: C.ink, borderColor: C.line, borderWidth: 1, borderRadius: 10, color: C.white, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 } as const;

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ borderRadius: 999, borderWidth: 1, borderColor: on ? C.gold : C.line, backgroundColor: on ? "rgba(217,165,32,0.15)" : C.panel, paddingHorizontal: 12, paddingVertical: 7 }}>
      <Text style={{ color: on ? C.goldSoft : C.muted, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

function PostCard({ p, topicLabel, onChanged, me, reasons }: { p: Post; topicLabel: string; onChanged: () => void; me: { id: number; admin: boolean }; reasons: string[] }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [liked, setLiked] = useState(p.liked);
  const [likes, setLikes] = useState(p.likes);
  const [saved, setSaved] = useState(!!p.bookmarked);

  async function like() {
    const was = liked;
    setLiked(!was); setLikes(likes + (was ? -1 : 1));
    const e = await send("/api/community/feed", { action: "like", postId: p.id });
    if (e) { setLiked(was); setLikes(likes); setMsg(e); }
  }
  async function bookmark() {
    const was = saved;
    setSaved(!was);
    const e = await send("/api/community/feed", { action: "bookmark", postId: p.id });
    if (e) { setSaved(was); setMsg(e); } else if (was) onChanged();
  }
  async function remove() {
    const e = await send("/api/community/feed?id=" + p.id + "&kind=post", undefined, "DELETE");
    if (e) setMsg(e); else onChanged();
  }
  async function report(reason: string) {
    const e = await send("/api/community/feed", { action: "report", postId: p.id, reason });
    setMsg(e ?? "Denúncia enviada à moderação. Obrigado.");
  }
  async function pin() {
    const e = await send("/api/community/feed", { action: "pin", postId: p.id, pin: !p.pinned });
    if (e) setMsg(e); else onChanged();
  }
  async function comment() {
    if (!text.trim()) return;
    const e = await send("/api/community/feed", { action: "comment", postId: p.id, body: text.trim() });
    if (e) return setMsg(e);
    setText(""); setMsg(null); onChanged();
  }

  return (
    <Card style={{ gap: 10 }}>
      {p.pinned && <Text style={{ color: C.goldSoft, fontSize: 12, fontWeight: "700" }}>📌 Fixado</Text>}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Avatar name={p.author} id={p.authorAvatar} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.white, fontWeight: "700" }}>{p.author}{p.authorIsAdmin ? <Text style={{ color: C.goldSoft, fontSize: 11 }}>  ADMIN</Text> : null}</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>{ago(p.createdAt)}</Text>
        </View>
        <Text style={{ color: C.muted, fontSize: 12, borderColor: C.line, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>{topicLabel}</Text>
      </View>
      {p.body ? <RichText body={p.body} style={{ color: C.white, fontSize: 15, lineHeight: 22 }} /> : null}
      {p.imageId ? <PostImage id={p.imageId} /> : null}
      <View style={{ flexDirection: "row", gap: 18, alignItems: "center" }}>
        <Pressable onPress={like}><Text style={{ color: liked ? C.down : C.muted, fontWeight: "700" }}>{liked ? "♥" : "♡"} {likes}</Text></Pressable>
        <Pressable onPress={() => setOpen(!open)}><Text style={{ color: C.muted, fontWeight: "600" }}>💬 {p.comments.length}</Text></Pressable>
        <Pressable onPress={bookmark}><Text style={{ color: saved ? C.goldSoft : C.muted, fontWeight: "700" }}>{saved ? "🔖 Salvo" : "🔖 Salvar"}</Text></Pressable>
      </View>
      <Row>
        {p.userId === me.id && <Act label={p.pinned ? "Desafixar" : "Fixar no perfil"} onPress={pin} />}
        {(p.userId === me.id || me.admin) && <ConfirmAct label="Apagar" ask="Apagar a publicação?" onConfirm={remove} />}
        {p.userId !== me.id && <ReportAct reasons={reasons} onPick={report} />}
      </Row>
      {open && (
        <View style={{ gap: 8, borderTopColor: C.line, borderTopWidth: 1, paddingTop: 10 }}>
          {p.comments.map((c) => (
            <View key={c.id} style={{ flexDirection: "row", gap: 8 }}>
              <Avatar name={c.author} id={c.authorAvatar} size={26} />
              <View style={{ flex: 1, backgroundColor: C.panel2, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ color: C.white, fontWeight: "700", fontSize: 13 }}>{c.author} <Text style={{ color: C.muted, fontWeight: "400", fontSize: 11 }}>{ago(c.createdAt)}</Text></Text>
                <RichText body={c.body} style={{ color: C.muted, fontSize: 14, lineHeight: 20 }} />
              </View>
            </View>
          ))}
          <TextInput style={input} placeholder="Escreva um comentário…" placeholderTextColor={C.muted} value={text} onChangeText={setText} maxLength={500} multiline />
          <GoldButton label="Comentar" ghost onPress={comment} />
        </View>
      )}
      {msg ? <Text style={{ color: C.muted }}>{msg}</Text> : null}
    </Card>
  );
}

export function FeedTab({ composing, onCloseCompose, only }: { composing?: boolean; onCloseCompose?: () => void; only?: string }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [topic, setTopic] = useState(only ?? "");
  const [posts, setPosts] = useState<Post[]>([]);
  const [topics, setTopics] = useState<{ id: string; label: string }[]>([]);
  const [more, setMore] = useState(false);
  const [me, setMe] = useState({ id: 0, admin: false });
  const [reasons, setReasons] = useState<string[]>([]);
  const [photo, setPhoto] = useState<Picked | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [draftTopic, setDraftTopic] = useState("geral");
  const [posting, setPosting] = useState(false);
  const [postErr, setPostErr] = useState<string | null>(null);

  const load = useCallback(async (append?: boolean) => {
    setLoading(true);
    const before = append && posts.length ? `&antes=${posts[posts.length - 1].id}` : "";
    const r = await get<FeedData>(`/api/mobile/feed?t=${topic}${before}`);
    if ("data" in r) {
      setTopics(r.data.topics); setMore(r.data.more); setMe(r.data.me); setReasons(r.data.reportReasons); setError(null);
      setPosts(append ? [...posts, ...r.data.posts] : r.data.posts);
    } else setError(r.error);
    setLoading(false);
  }, [topic, posts]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [topic]);

  const [msg, setMsg] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [rec, setRec] = useState(false);
  async function addPhoto() {
    setPicking(true); setPostErr(null);
    const r = await pickAndUpload();
    setPicking(false);
    if (!r) return;
    if ("error" in r) return setPostErr(r.error);
    setPhoto(r);
  }

  async function publish() {
    if (!draft.trim() && !photo) return;
    setPosting(true); setPostErr(null);
    const e = await send("/api/community/feed", { action: "post", topic: draftTopic, body: draft.trim(), imageId: photo?.id ?? null });
    setPosting(false);
    if (e) return setPostErr(e);
    setDraft(""); setPhoto(null); onCloseCompose?.(); void load();
  }

  const label = (id: string) => topics.find((t) => t.id === id)?.label ?? "Geral";
  return (
    <>
      <Modal visible={!!composing} animationType="slide" onRequestClose={onCloseCompose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: C.ink, paddingTop: insets.top + 8, paddingBottom: insets.bottom }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10 }}>
            <Pressable onPress={onCloseCompose} hitSlop={10}><Text style={{ color: C.white, fontSize: 16 }}>Cancelar</Text></Pressable>
            <Pressable onPress={publish} disabled={posting || (!draft.trim() && !photo)} style={{ backgroundColor: C.gold, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 8, opacity: posting || (!draft.trim() && !photo) ? 0.5 : 1 }}>
              <Text style={{ color: C.ink, fontWeight: "800" }}>{posting ? "…" : "Postar"}</Text>
            </Pressable>
          </View>
          <View style={{ flex: 1, flexDirection: "row", gap: 12, paddingHorizontal: 16 }}>
            <Avatar name={user?.name ?? ""} id={user?.avatarId ?? null} size={40} />
            <View style={{ flex: 1, gap: 8 }}>
              <Select compact title="Assunto" value={draftTopic} onChange={setDraftTopic} options={topics.map((t) => ({ id: t.id, label: t.label }))} />
              <TextInput style={{ color: C.white, fontSize: 18, lineHeight: 26, minHeight: 120, flexShrink: 1, textAlignVertical: "top", padding: 0 }} placeholder="Compartilhe uma análise, dúvida ou ideia de investimento…" placeholderTextColor={C.muted} value={draft} onChangeText={setDraft} maxLength={1500} multiline autoFocus />
              {photo ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.panel2, borderRadius: 10, padding: 8 }}>
                  <Image source={{ uri: photo.uri }} style={{ width: 56, height: 56, borderRadius: 8 }} />
                  <Text style={{ color: C.muted, flex: 1, fontSize: 12 }}>Foto pronta para publicar</Text>
                  <Pressable onPress={() => setPhoto(null)}><Text style={{ color: C.down, fontSize: 12 }}>remover</Text></Pressable>
                </View>
              ) : null}
              {postErr ? <Text style={{ color: C.down }}>{postErr}</Text> : null}
            </View>
          </View>
          <Text style={{ color: C.muted, fontSize: 11, paddingHorizontal: 16, paddingVertical: 8 }}>Conteúdo da comunidade é opinião dos membros, não recomendação de investimento. Nada de pedir dinheiro, divulgar terceiros ou prometer ganhos.</Text>
          <View style={{ borderTopWidth: 1, borderTopColor: C.line, paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Pressable onPress={addPhoto} disabled={picking} style={{ flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, opacity: picking ? 0.5 : 1 }}>
              <Text style={{ color: C.gold, fontSize: 18, fontWeight: "700" }}>+</Text>
              <Text style={{ color: C.white, fontWeight: "700" }}>{picking ? "Enviando…" : "Foto"}</Text>
            </Pressable>
            <Pressable onPress={() => setRec(true)} style={{ flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }}>
              <Text style={{ color: C.gold, fontSize: 16 }}>▶</Text>
              <Text style={{ color: C.white, fontWeight: "700" }}>Cashpill</Text>
            </Pressable>
            <Text style={{ color: C.muted, fontSize: 11, marginLeft: "auto" }}>{draft.length}/1500</Text>
          </View>
        </KeyboardAvoidingView>
        {rec && <Recorder mode="cashpill" onClose={() => setRec(false)} onReady={async (r, c) => { const e = await publishCashpill(r, c); if (!e) { onCloseCompose?.(); setMsg("Cashpill publicado no seu perfil!"); } return e; }} />}
      </Modal>

      {!only && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ flexGrow: 0 }}>
        <Chip label="Tudo" on={topic === ""} onPress={() => setTopic("")} />
        <Chip label="Seguindo" on={topic === "seguindo"} onPress={() => setTopic("seguindo")} />
        {topics.map((t) => <Chip key={t.id} label={t.label} on={topic === t.id} onPress={() => setTopic(t.id)} />)}
      </ScrollView>}

      {msg ? <Text style={{ color: C.goldSoft, fontWeight: "700" }}>{msg}</Text> : null}
      <Status loading={loading && posts.length === 0} error={error} onRetry={() => load()} />
      {!loading && !error && posts.length === 0 && <Muted>{only === "salvos" ? "Você ainda não salvou nenhuma publicação. Toque em Salvar em uma publicação para guardá-la aqui." : "Ainda não há publicações aqui. Seja o primeiro!"}</Muted>}
      {posts.map((p) => <PostCard key={p.id} p={p} topicLabel={label(p.topic)} onChanged={() => load()} me={me} reasons={reasons} />)}
      {more && <GoldButton label={loading ? "Carregando…" : "Ver mais"} ghost onPress={() => load(true)} />}
      {!loading && <GoldButton label="Atualizar" ghost onPress={() => load()} />}
    </>
  );
}
