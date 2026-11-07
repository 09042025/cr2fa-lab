import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { get, send } from "./api";
import { Avatar, useImage } from "./Avatar";
import { ago } from "./format";
import { C } from "./theme";
import { pickAndUpload, type Picked } from "./upload";

interface Story { id: number; imageId: number; videoId: number | null; caption: string; createdAt: number; seen: boolean; views?: number }
interface Group { userId: number; name: string; avatarId: number | null; isAdmin: boolean; mine: boolean; allSeen: boolean; stories: Story[] }

const STORY_MS = 5000;

function Ring({ g, onPress }: { g: Group; onPress: () => void }) {
  const ring = g.allSeen ? C.line : C.gold;
  return (
    <Pressable onPress={onPress} style={{ alignItems: "center", width: 74 }}>
      <View style={{ width: 66, height: 66, borderRadius: 33, borderWidth: 2.5, borderColor: ring, alignItems: "center", justifyContent: "center" }}>
        <Avatar name={g.name} id={g.avatarId} size={56} />
      </View>
      <Text numberOfLines={1} style={{ color: g.allSeen ? C.muted : C.white, fontSize: 12, marginTop: 4 }}>{g.mine ? "Seu story" : g.name.split(" ")[0]}</Text>
    </Pressable>
  );
}

function StoryImage({ id }: { id: number }) {
  const { uri, error } = useImage(id);
  if (error) return <Text style={{ color: C.muted, textAlign: "center" }}>Imagem indisponível ({error}).</Text>;
  if (!uri) return null;
  return <Image source={{ uri }} resizeMode="contain" style={{ width: "100%", height: "100%" }} />;
}

function Viewer({ groups, start, onClose, onChanged }: { groups: Group[]; start: number; onClose: () => void; onChanged: () => void }) {
  const insets = useSafeAreaInsets();
  const [gi, setGi] = useState(start);
  const [si, setSi] = useState(() => { const g = groups[start]; const n = g.stories.findIndex((s) => !s.seen); return n < 0 ? 0 : n; });
  const prog = useRef(new Animated.Value(0)).current;
  const paused = useRef(false);
  const g = groups[gi];
  const story = g?.stories[si];

  const next = useCallback(() => {
    if (!g) return onClose();
    if (si < g.stories.length - 1) setSi(si + 1);
    else if (gi < groups.length - 1) { setGi(gi + 1); setSi(0); }
    else onClose();
  }, [g, si, gi, groups.length, onClose]);
  const prev = () => {
    if (si > 0) setSi(si - 1);
    else if (gi > 0) { setGi(gi - 1); setSi(0); }
    else { prog.setValue(0); }
  };

  const run = useCallback((from: number) => {
    prog.setValue(from);
    Animated.timing(prog, { toValue: 1, duration: STORY_MS * (1 - from), easing: Easing.linear, useNativeDriver: false }).start(({ finished }) => { if (finished) next(); });
  }, [prog, next]);

  useEffect(() => {
    if (!story) return;
    if (!story.seen && !g.mine) void send("/api/community/stories", { view: story.id });
    run(0);
    return () => prog.stopAnimation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gi, si]);

  if (!g || !story) return null;
  const hold = () => { paused.current = true; prog.stopAnimation(); };
  const release = () => { if (!paused.current) return; paused.current = false; prog.stopAnimation((v) => run(v)); };

  const remove = () => {
    hold();
    Alert.alert("Apagar este story?", undefined, [
      { text: "Cancelar", style: "cancel", onPress: release },
      { text: "Apagar", style: "destructive", onPress: async () => { await send(`/api/community/stories?id=${story.id}`, {}, "DELETE"); onChanged(); onClose(); } },
    ]);
  };

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "#000", paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ flexDirection: "row", gap: 4, paddingHorizontal: 8, paddingTop: 8 }}>
          {g.stories.map((s, i) => (
            <View key={s.id} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.3)", overflow: "hidden" }}>
              <Animated.View style={{ height: 3, backgroundColor: "#fff", width: i < si ? "100%" : i > si ? "0%" : prog.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }} />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12 }}>
          <Avatar name={g.name} id={g.avatarId} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>{g.name}{g.isAdmin ? <Text style={{ color: C.goldSoft, fontSize: 11 }}>  ADMIN</Text> : null}</Text>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{ago(story.createdAt)}</Text>
          </View>
          {g.mine && <Pressable onPress={remove} hitSlop={10}><Text style={{ color: C.down, fontWeight: "700" }}>Apagar</Text></Pressable>}
          <Pressable onPress={onClose} hitSlop={12}><Text style={{ color: "#fff", fontSize: 26 }}>✕</Text></Pressable>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><StoryImage id={story.imageId} /></View>
          <View style={{ ...{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }, flexDirection: "row" }}>
            <Pressable style={{ flex: 1 }} onPress={prev} onLongPress={hold} onPressOut={release} delayLongPress={200} />
            <Pressable style={{ flex: 2 }} onPress={next} onLongPress={hold} onPressOut={release} delayLongPress={200} />
          </View>
        </View>
        <View style={{ padding: 16, gap: 6 }} pointerEvents="none">
          {story.videoId ? <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, textAlign: "center" }}>▶ Story em vídeo: o vídeo toca no site. Aqui aparece a capa.</Text> : null}
          {story.caption ? <Text style={{ color: "#fff", fontSize: 16, textAlign: "center" }}>{story.caption}</Text> : null}
          {g.mine && typeof story.views === "number" ? <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, textAlign: "center" }}>👁 {story.views} visualizações</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

function Composer({ photo, onClose, onDone }: { photo: Picked; onClose: () => void; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function share() {
    setBusy(true); setErr(null);
    const e = await send("/api/community/stories", { imageId: photo.id, caption });
    setBusy(false);
    if (e) return setErr(e);
    onDone();
  }
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: "#000", paddingTop: insets.top + 8, paddingBottom: insets.bottom }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8 }}>
          <Pressable onPress={onClose} hitSlop={10}><Text style={{ color: "#fff", fontSize: 16 }}>Cancelar</Text></Pressable>
          <Pressable onPress={share} disabled={busy} style={{ backgroundColor: C.gold, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 8, opacity: busy ? 0.5 : 1 }}>
            <Text style={{ color: C.ink, fontWeight: "800" }}>{busy ? "…" : "Compartilhar"}</Text>
          </Pressable>
        </View>
        <Image source={{ uri: photo.uri }} resizeMode="contain" style={{ flex: 1 }} />
        <View style={{ padding: 14, gap: 6 }}>
          <TextInput value={caption} onChangeText={setCaption} maxLength={200} placeholder="Adicionar legenda…" placeholderTextColor="#9aa" style={{ color: "#fff", fontSize: 16, borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 6 }} />
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Stories somem em 24 horas.</Text>
          {err ? <Text style={{ color: C.down }}>{err}</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Stories no estilo Instagram: bolinhas no topo do Feed, visualizador em tela cheia e publicar com foto. */
export function StoriesBar({ me }: { me: { name: string } }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [photo, setPhoto] = useState<Picked | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await get<{ groups: Group[] }>("/api/community/stories");
    if ("data" in r) setGroups(r.data.groups);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function add() {
    setMsg(null);
    const r = await pickAndUpload();
    if (!r) return;
    if ("error" in r) return setMsg(r.error);
    setPhoto(r);
  }

  const mine = groups.find((g) => g.mine);
  const others = groups.filter((g) => !g.mine);
  return (
    <View style={{ gap: 6 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
        <View style={{ width: 74, alignItems: "center" }}>
          {mine ? <Ring g={mine} onPress={() => setOpen(groups.indexOf(mine))} /> : (
            <Pressable onPress={add} style={{ alignItems: "center" }}>
              <View style={{ width: 66, height: 66, borderRadius: 33, borderWidth: 2.5, borderColor: C.line, borderStyle: "dashed", alignItems: "center", justifyContent: "center" }}>
                <Avatar name={me.name} id={null} size={56} />
              </View>
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>Seu story</Text>
            </Pressable>
          )}
          <Pressable onPress={add} hitSlop={6} style={{ position: "absolute", right: 4, top: 44, width: 22, height: 22, borderRadius: 11, backgroundColor: C.gold, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.ink }}>
            <Text style={{ color: C.ink, fontWeight: "800", lineHeight: 18 }}>+</Text>
          </Pressable>
        </View>
        {others.map((g) => <Ring key={g.userId} g={g} onPress={() => setOpen(groups.indexOf(g))} />)}
      </ScrollView>
      {msg ? <Text style={{ color: C.down }}>{msg}</Text> : null}
      {open !== null && <Viewer groups={groups} start={open} onClose={() => { setOpen(null); void load(); }} onChanged={load} />}
      {photo && <Composer photo={photo} onClose={() => setPhoto(null)} onDone={() => { setPhoto(null); void load(); }} />}
    </View>
  );
}
