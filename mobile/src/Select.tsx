import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { C } from "./theme";

export interface Opt { id: string; label: string; disabled?: boolean }

/** Lista suspensa (abre em folha na parte de baixo da tela). Uma opção (single) ou várias (multi). */
export function Select({ title, options, value, onChange, multi }: {
  title: string; options: Opt[]; multi?: false; value: string; onChange: (v: string) => void;
} | {
  title: string; options: Opt[]; multi: true; value: string[]; onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const sel = multi ? (value as string[]) : [value as string];
  const text = multi
    ? sel.length === 0 ? "Nenhuma" : sel.length === 1 ? options.find((o) => o.id === sel[0])?.label ?? sel[0] : sel.length === options.filter((o) => !o.disabled).length ? "Todas" : `${sel.length} selecionadas`
    : options.find((o) => o.id === value)?.label ?? "—";
  const pick = (o: Opt) => {
    if (o.disabled) return;
    if (multi) { const v = value as string[]; (onChange as (v: string[]) => void)(v.includes(o.id) ? v.filter((x) => x !== o.id) : [...v, o.id]); }
    else { (onChange as (v: string) => void)(o.id); setOpen(false); }
  };
  return (
    <View style={{ flex: 1, minWidth: 140 }}>
      <Text style={{ color: C.muted, fontSize: 11, marginBottom: 3 }}>{title}</Text>
      <Pressable onPress={() => setOpen(true)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: C.line, backgroundColor: C.panel2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 }}>
        <Text style={{ color: C.white, fontWeight: "700", fontSize: 13, flexShrink: 1 }} numberOfLines={1}>{text}</Text>
        <Text style={{ color: C.gold, fontSize: 11 }}>▼</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
          <Pressable onPress={() => undefined} style={{ backgroundColor: C.panel, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 1, borderColor: C.line, padding: 14, maxHeight: "70%" }}>
            <Text style={{ color: C.gold, fontWeight: "800", fontSize: 15, marginBottom: 8 }}>{title}</Text>
            <ScrollView>
              {options.map((o) => {
                const on = sel.includes(o.id);
                return (
                  <Pressable key={o.id} onPress={() => pick(o)} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line, opacity: o.disabled ? 0.4 : 1 }}>
                    <Text style={{ color: on ? C.gold : C.white, fontWeight: on ? "800" : "500", fontSize: 15 }}>{o.label}{o.disabled ? " (em breve)" : ""}</Text>
                    {on && <Text style={{ color: C.gold, fontWeight: "800" }}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>
            {multi && <Pressable onPress={() => setOpen(false)} style={{ marginTop: 10, backgroundColor: C.gold, borderRadius: 10, paddingVertical: 11, alignItems: "center" }}><Text style={{ color: C.ink, fontWeight: "800" }}>Concluir</Text></Pressable>}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
