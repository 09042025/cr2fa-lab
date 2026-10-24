import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { get, send } from "./api";
import { Avatar, PostImage } from "./Avatar";
import { ago } from "./format";
import { RichText } from "./RichText";
import { C } from "./theme";
import { Act, ConfirmAct, PhotoPicker, ReportAct, Row } from "./actions";
import type { Picked } from "./upload";
import { Card, GoldButton, Muted, Status } from "./ui";

interface Comment { id: number; userId: number; author: string; authorAvatar: number | null; authorIsAdmin: boolean; body: string; createdAt: number }
interface Post { id: number; userId: number; author: string; authorAvatar: number | null; authorIsAdmin: boolean; topic: string; body: string; imageId: number | null; createdAt: number; likes: number; liked: boolean; pinned: boolean; comments: Comment[] }
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

  async function like() {
    const was = liked;
    setLiked(!was); setLikes(likes + (was ? -1 : 1));
    const e = await send("/api/community/feed", { action: "like", postId: p.id });
    if (e) { setLiked(was); setLikes(likes); setMsg(e); }
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

export function FeedTab() {
  const [topic, setTopic] = useState("");
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

  async function publish() {
    if (!draft.trim() && !photo) return;
    setPosting(true); setPostErr(null);
    const e = await send("/api/community/feed", { action: "post", topic: draftTopic, body: draft.trim(), imageId: photo?.id ?? null });
    setPosting(false);
    if (e) return setPostErr(e);
    setDraft(""); setPhoto(null); void load();
  }

  const label = (id: string) => topics.find((t) => t.id === id)?.label ?? "Geral";
  return (
    <>
      <Card style={{ gap: 10 }}>
        <TextInput style={[input, { minHeight: 80, textAlignVertical: "top" }]} placeholder="Compartilhe uma análise, dúvida ou ideia…" placeholderTextColor={C.muted} value={draft} onChangeText={setDraft} maxLength={1500} multiline />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {topics.map((t) => <Chip key={t.id} label={t.label} on={draftTopic === t.id} onPress={() => setDraftTopic(t.id)} />)}
        </View>
        <PhotoPicker value={photo} onChange={setPhoto} onError={setPostErr} />
        {postErr ? <Text style={{ color: C.down }}>{postErr}</Text> : null}
        <GoldButton label={posting ? "Publicando…" : "Publicar"} onPress={publish} />
      </Card>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        <Chip label="Tudo" on={topic === ""} onPress={() => setTopic("")} />
        <Chip label="Seguindo" on={topic === "seguindo"} onPress={() => setTopic("seguindo")} />
        {topics.map((t) => <Chip key={t.id} label={t.label} on={topic === t.id} onPress={() => setTopic(t.id)} />)}
      </View>

      <Status loading={loading && posts.length === 0} error={error} onRetry={() => load()} />
      {!loading && !error && posts.length === 0 && <Muted>Ainda não há publicações aqui. Seja o primeiro!</Muted>}
      {posts.map((p) => <PostCard key={p.id} p={p} topicLabel={label(p.topic)} onChanged={() => load()} me={me} reasons={reasons} />)}
      {more && <GoldButton label={loading ? "Carregando…" : "Ver mais"} ghost onPress={() => load(true)} />}
      {!loading && <GoldButton label="Atualizar" ghost onPress={() => load()} />}
    </>
  );
}
