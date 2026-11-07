import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { get } from "./api";
import { Avatar } from "./Avatar";
import { C } from "./theme";

interface Member { id: number; name: string; avatarId: number | null; handle?: string | null }

/** Ao digitar @ num campo, busca membros da plataforma e insere @PrimeiroNome. */
export function useMention(value: string, setValue: (v: string) => void) {
  const [q, setQ] = useState<string | null>(null);
  const [list, setList] = useState<Member[]>([]);
  const caret = useRef(0);
  const start = useRef(0);

  function scan(text: string, pos: number) {
    const m = /(?:^|\s)@([\p{L}\p{N}_.-]{0,30})$/u.exec(text.slice(0, pos));
    if (!m) return setQ(null);
    start.current = pos - m[1].length - 1;
    setQ(m[1]);
  }

  useEffect(() => {
    if (q === null) { setList([]); return; }
    let dead = false;
    const t = setTimeout(async () => {
      const r = await get<{ members?: Member[] }>(q.length >= 2 ? `/api/community/dm?q=${encodeURIComponent(q)}` : "/api/community/dm?share=1");
      if (!dead) setList(("data" in r ? r.data.members ?? [] : []).slice(0, 6));
    }, q.length >= 2 ? 200 : 0);
    return () => { dead = true; clearTimeout(t); };
  }, [q]);

  const latest = useRef(value);
  latest.current = value;
  const onChangeText = (t: string) => {
    const pos = Math.min(t.length, Math.max(0, caret.current + (t.length - latest.current.length)));
    latest.current = t; caret.current = pos;
    setValue(t); scan(t, pos);
  };
  const onSelectionChange = (e: { nativeEvent: { selection: { start: number } } }) => { caret.current = e.nativeEvent.selection.start; scan(latest.current, caret.current); };

  function pick(m: Member) {
    const first = m.handle || m.name.trim().split(/\s+/)[0].replace(/[^\p{L}\p{N}_.-]/gu, "");
    setValue(`${value.slice(0, start.current)}@${first} ${value.slice(caret.current)}`);
    setQ(null);
  }

  const picker = q !== null && list.length > 0 ? (
    <View style={{ backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 4 }}>
      {list.map((m) => (
        <Pressable key={m.id} onPress={() => pick(m)} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingHorizontal: 8 }}>
          <Avatar name={m.name} id={m.avatarId} size={32} />
          <Text style={{ color: C.white, flex: 1 }} numberOfLines={1}>{m.name}</Text>
        </Pressable>
      ))}
    </View>
  ) : null;

  return { onChangeText, onSelectionChange, picker };
}
