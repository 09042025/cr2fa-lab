import { useCallback, useEffect, useState } from "react";
import { AppState, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { get, send } from "./api";
import { Avatar } from "./Avatar";
import { ago } from "./format";
import { Icon } from "./icons";
import { C } from "./theme";

interface Item { id: number; byId: number; by: string; avatarId: number | null; kind: string; postId: number; snippet: string; createdAt: number; read: boolean }

/** Sininho amarelo no topo: avisa quando alguém marca você com @ num post ou comentário. */
export function MentionsBell() {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);

  const count = useCallback(async () => {
    const r = await get<{ unread: number }>("/api/community/mentions?count=1");
    if ("data" in r) setUnread(r.data.unread);
  }, []);
  useEffect(() => {
    void count();
    const t = setInterval(() => { void count(); }, 60_000);
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") void count(); });
    return () => { clearInterval(t); sub.remove(); };
  }, [count]);

  async function show() {
    setOpen(true); setItems(null);
    const r = await get<{ unread: number; items: Item[] }>("/api/community/mentions");
    setItems("data" in r ? r.data.items : []);
    if ("data" in r && r.data.unread > 0) { await send("/api/community/mentions", {}); setUnread(0); }
  }

  return (
    <>
      <Pressable onPress={show} hitSlop={10} accessibilityLabel="Marcações" style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" }}>
        <Icon name="bell" size={20} color={C.gold} fill={unread > 0} />
        {unread > 0 && (
          <View style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.gold, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
            <Text style={{ color: C.ink, fontSize: 11, fontWeight: "800" }}>{unread > 9 ? "9+" : unread}</Text>
          </View>
        )}
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: C.panel, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "75%", borderWidth: 1, borderColor: C.line }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 }}>
              <Text style={{ color: C.white, fontSize: 18, fontWeight: "800" }}>Marcações</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={12}><Text style={{ color: C.muted, fontSize: 26 }}>✕</Text></Pressable>
            </View>
            <ScrollView>
              {items === null && <Text style={{ color: C.muted, padding: 16 }}>Carregando…</Text>}
              {items?.length === 0 && <Text style={{ color: C.muted, padding: 16 }}>Ninguém marcou você ainda.</Text>}
              {(items ?? []).map((m) => (
                <Pressable key={m.id} onPress={() => { setOpen(false); router.push({ pathname: "/post", params: { id: String(m.postId) } }); }} style={{ flexDirection: "row", gap: 12, padding: 14, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: m.read ? "transparent" : "rgba(217,165,32,0.1)" }}>
                  <Avatar name={m.by} id={m.avatarId} size={38} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.white, fontWeight: "700" }}>{m.by} <Text style={{ color: C.muted, fontWeight: "400" }}>marcou você {m.kind === "comment" ? "em um comentário" : "em um post"} · {ago(m.createdAt)}</Text></Text>
                    <Text style={{ color: C.muted, marginTop: 2 }} numberOfLines={2}>{m.snippet}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
