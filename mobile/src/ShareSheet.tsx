import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { API, get, send } from "./api";
import { Avatar } from "./Avatar";
import { shareTargets, shareText } from "./share";
import { C } from "./theme";

interface Person { id: number; name: string; avatarId: number | null }

/** Compartilhar, igual ao do site: membros (mensagem direta), copiar link, compartilhar no..., WhatsApp e demais redes. */
export function ShareSheet({ id, author, body, imageId, onClose }: { id: number; author: string; body: string; imageId: number | null; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<Person[] | null>(null);
  const [sel, setSel] = useState<Person[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const url = `${API}/painel/feed/post/${id}`;
  const text = shareText(body, author);
  const targets = shareTargets(url, text);

  useEffect(() => {
    let dead = false;
    const term = q.trim();
    const t = setTimeout(async () => {
      const r = await get<{ members?: Person[] }>(term.length >= 2 ? `/api/community/dm?q=${encodeURIComponent(term)}` : "/api/community/dm?share=1");
      if (!dead) setPeople("data" in r ? r.data.members ?? [] : []);
    }, term.length >= 2 ? 250 : 0);
    return () => { dead = true; clearTimeout(t); };
  }, [q]);

  const toggle = (m: Person) => setSel((s) => (s.some((x) => x.id === m.id) ? s.filter((x) => x.id !== m.id) : [...s, m]));

  async function sendDm() {
    setBusy(true); setMsg("");
    const text2 = `${note.trim() ? `${note.trim()}\n` : ""}${url}`;
    let fail = 0;
    for (const m of sel) { const e = await send("/api/community/dm", { to: m.id, body: text2 }); if (e) fail++; }
    setBusy(false);
    if (fail) setMsg(`Não foi possível enviar para ${fail} ${fail === 1 ? "pessoa" : "pessoas"}.`);
    else { setMsg("Enviado!"); setSel([]); setNote(""); setTimeout(onClose, 900); }
  }
  async function toStory() {
    setBusy(true); setMsg("");
    const e = await send("/api/community/stories", { fromPost: id });
    setBusy(false);
    if (e) setMsg(e); else { setMsg("Adicionado ao seu story!"); setTimeout(onClose, 900); }
  }
  async function copy() {
    await Clipboard.setStringAsync(url);
    setMsg("Link copiado!");
  }

  const Round = ({ label, glyph, onPress, bg }: { label: string; glyph: string; onPress: () => void; bg?: string }) => (
    <Pressable onPress={onPress} disabled={busy} style={{ width: 76, alignItems: "center", gap: 6 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: bg ? 0 : 1, borderColor: C.line, backgroundColor: bg ?? C.panel2, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: C.white, fontSize: glyph.length > 1 ? 14 : 22, fontWeight: "700" }}>{glyph}</Text>
      </View>
      <Text style={{ color: C.muted, fontSize: 11, textAlign: "center" }} numberOfLines={2}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: C.panel, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "88%", borderWidth: 1, borderColor: C.line }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 14 }}>
            <Text style={{ color: C.white, fontSize: 18, fontWeight: "800" }}>Compartilhar</Text>
            <Pressable onPress={onClose} hitSlop={12}><Text style={{ color: C.muted, fontSize: 26 }}>✕</Text></Pressable>
          </View>
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <TextInput value={q} onChangeText={setQ} placeholder="Pesquisar membros" placeholderTextColor={C.muted} maxLength={40} style={{ height: 44, borderRadius: 22, borderWidth: 1, borderColor: C.line, backgroundColor: C.ink, color: C.white, paddingHorizontal: 16 }} />
          </View>
          <ScrollView style={{ minHeight: 120 }} contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 8, paddingVertical: 12 }}>
            {people === null && <ActivityIndicator color={C.gold} style={{ margin: 16 }} />}
            {people?.length === 0 && <Text style={{ color: C.muted, padding: 12 }}>{q.trim().length >= 2 ? "Ninguém encontrado." : "Siga alguém ou converse com um membro para vê-lo aqui."}</Text>}
            {(people ?? []).map((m) => {
              const on = sel.some((x) => x.id === m.id);
              return (
                <Pressable key={m.id} onPress={() => toggle(m)} style={{ width: "33.33%", alignItems: "center", gap: 4, paddingVertical: 6 }}>
                  <View style={{ borderRadius: 40, padding: 2, borderWidth: 2, borderColor: on ? C.gold : "transparent" }}>
                    <Avatar name={m.name} id={m.avatarId} size={64} />
                    {on && <View style={{ position: "absolute", right: 0, bottom: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: C.gold, alignItems: "center", justifyContent: "center" }}><Text style={{ color: C.ink, fontWeight: "800", fontSize: 12 }}>✓</Text></View>}
                  </View>
                  <Text style={{ color: C.white, fontSize: 12, textAlign: "center" }} numberOfLines={2}>{m.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {sel.length > 0 ? (
            <View style={{ flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: C.line }}>
              <TextInput value={note} onChangeText={setNote} maxLength={300} placeholder="Escreva uma mensagem…" placeholderTextColor={C.muted} style={{ flex: 1, height: 44, borderRadius: 22, borderWidth: 1, borderColor: C.line, backgroundColor: C.ink, color: C.white, paddingHorizontal: 16 }} />
              <Pressable onPress={sendDm} disabled={busy} style={{ backgroundColor: C.gold, borderRadius: 22, paddingHorizontal: 18, justifyContent: "center" }}>
                <Text style={{ color: C.ink, fontWeight: "800" }}>{busy ? "…" : `Enviar${sel.length > 1 ? ` (${sel.length})` : ""}`}</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, borderTopWidth: 1, borderTopColor: C.line }} contentContainerStyle={{ gap: 6, paddingHorizontal: 12, paddingVertical: 12 }}>
              {imageId ? <Round label="Adicionar ao story" glyph="＋" onPress={toStory} /> : null}
              <Round label="Copiar link" glyph="🔗" onPress={copy} />
              <Round label="Compartilhar no…" glyph="⇪" onPress={() => { void Share.share({ message: `${text} ${url}`, url }).then(onClose).catch(() => {}); }} />
              {targets.map((t) => (
                <Round key={t.id} label={t.label} glyph={t.id === "whatsapp" ? "✆" : t.label.slice(0, 2)} bg={t.id === "whatsapp" ? "#25D366" : undefined} onPress={() => { void Linking.openURL(t.href).catch(() => setMsg("Não foi possível abrir este aplicativo.")); }} />
              ))}
            </ScrollView>
          )}
          {msg ? <Text style={{ color: C.goldSoft, textAlign: "center", paddingBottom: 14 }}>{msg}</Text> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
