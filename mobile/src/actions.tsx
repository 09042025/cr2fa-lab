import { useState, type ReactNode } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { pickAndUpload, type Picked } from "./upload";
import { C } from "./theme";

/** Texto pequeno clicável, usado nas ações de cada mensagem/publicação. */
export function Act({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text style={{ color: danger ? C.down : C.muted, fontSize: 13, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

/** Ação que pede confirmação no próprio lugar (sem janelas): "Apagar" → "Tem certeza? Sim · Não". */
export function ConfirmAct({ label, ask, onConfirm, danger = true }: { label: string; ask: string; onConfirm: () => void; danger?: boolean }) {
  const [on, setOn] = useState(false);
  if (!on) return <Act label={label} danger={danger} onPress={() => setOn(true)} />;
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
      <Text style={{ color: C.muted, fontSize: 13 }}>{ask}</Text>
      <Act label="Sim" danger onPress={() => { setOn(false); onConfirm(); }} />
      <Act label="Não" onPress={() => setOn(false)} />
    </View>
  );
}

/** "Denunciar" abre a lista de motivos. */
export function ReportAct({ reasons, onPick }: { reasons: readonly string[]; onPick: (reason: string) => void }) {
  const [on, setOn] = useState(false);
  if (!on) return <Act label="Denunciar" onPress={() => setOn(true)} />;
  return (
    <View style={{ gap: 6, backgroundColor: C.panel2, borderRadius: 10, padding: 10, alignSelf: "stretch" }}>
      <Text style={{ color: C.white, fontWeight: "700", fontSize: 13 }}>Qual o motivo?</Text>
      {reasons.map((r) => <Act key={r} label={r} onPress={() => { setOn(false); onPick(r); }} />)}
      <Act label="Cancelar" onPress={() => setOn(false)} />
    </View>
  );
}

/** Botão "Foto" com miniatura. Controla o envio da imagem e entrega o id pelo `onChange`. */
export function PhotoPicker({ value, onChange, onError }: { value: Picked | null; onChange: (p: Picked | null) => void; onError: (e: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  async function pick() {
    setBusy(true); onError(null);
    const r = await pickAndUpload();
    setBusy(false);
    if (!r) return;
    if ("error" in r) return onError(r.error);
    onChange(r);
  }
  if (value) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Image source={{ uri: value.uri }} style={{ width: 56, height: 56, borderRadius: 8 }} />
        <Text style={{ color: C.muted, flex: 1 }}>Foto pronta para enviar</Text>
        <Act label="Remover" danger onPress={() => onChange(null)} />
      </View>
    );
  }
  return <Pressable onPress={pick} disabled={busy}><Text style={{ color: C.goldSoft, fontWeight: "700" }}>{busy ? "Enviando foto…" : "📷 Adicionar foto"}</Text></Pressable>;
}

export const Row = ({ children }: { children: ReactNode }) => <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, alignItems: "center" }}>{children}</View>;
