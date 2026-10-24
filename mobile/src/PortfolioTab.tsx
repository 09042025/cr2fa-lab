import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { send } from "./api";
import { ConfirmAct } from "./actions";
import { C } from "./theme";
import { useApi } from "./useApi";
import { Card, GoldButton, H2, Muted, Status } from "./ui";

interface Row { key: string; name: string; color: string; currentCents: number; currentPct: number; targetCents: number; diffCents: number }
interface Holding { id: number; block: string; label: string; valueCents: number; source: string }
interface Data { totalCents: number; rows: Row[]; holdings: Holding[] }

const brl = (cents: number) => "R$ " + (cents / 100).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const input = { backgroundColor: C.ink, borderColor: C.line, borderWidth: 1, borderRadius: 10, color: C.white, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 } as const;

/** Consolidador (Pró): patrimônio por bloco, quanto comprar/vender para voltar aos 20% e as posições. */
export function PortfolioTab() {
  const { data, error, loading, reload } = useApi<Data>("/api/mobile/portfolio");
  const [block, setBlock] = useState("cripto");
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function add() {
    const v = Number(value.replace(/\./g, "").replace(",", "."));
    if (!label.trim() || !Number.isFinite(v) || v < 0) return setMsg("Confira o nome e o valor (ex.: 1500,00).");
    const e = await send("/api/portfolio", { block, label: label.trim(), value: v });
    if (e) return setMsg(e);
    setLabel(""); setValue(""); setMsg(null); void reload();
  }
  async function remove(id: number) {
    const e = await send("/api/portfolio?id=" + id, undefined, "DELETE");
    if (e) setMsg(e); else void reload();
  }

  return (
    <>
      <Status loading={loading && !data} error={error} onRetry={reload} />
      {data && (
        <>
          <Card>
            <Muted>Patrimônio nos blocos</Muted>
            <Text style={{ color: C.goldSoft, fontSize: 26, fontWeight: "700" }}>{brl(data.totalCents)}</Text>
            <Muted>Meta do Protocolo: 20% em cada bloco.</Muted>
          </Card>
          <Card style={{ gap: 12 }}>
            <H2>Rebalanceamento</H2>
            {data.rows.map((r) => (
              <View key={r.key} style={{ gap: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: C.white, fontWeight: "600", flexShrink: 1 }}>{r.name}</Text>
                  <Text style={{ color: C.muted }}>{r.currentPct.toFixed(1).replace(".", ",")}% · {brl(r.currentCents)}</Text>
                </View>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: C.panel2, overflow: "hidden" }}>
                  <View style={{ width: `${Math.min(100, r.currentPct * 2.5)}%`, height: 8, backgroundColor: r.color }} />
                </View>
                <Text style={{ color: r.diffCents > 0 ? C.up : r.diffCents < 0 ? C.down : C.muted, fontWeight: "600", fontSize: 13 }}>
                  {r.diffCents > 0 ? "Comprar " : r.diffCents < 0 ? "Vender " : "Em dia "}{r.diffCents !== 0 ? brl(Math.abs(r.diffCents)) : ""}
                </Text>
              </View>
            ))}
            <Muted>Antes de vender, considere impostos e custos da operação.</Muted>
          </Card>
          <Card style={{ gap: 10 }}>
            <H2>Adicionar posição</H2>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {data.rows.map((r) => (
                <Pressable key={r.key} onPress={() => setBlock(r.key)} style={{ borderRadius: 999, borderWidth: 1, borderColor: block === r.key ? C.gold : C.line, paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Text style={{ color: block === r.key ? C.goldSoft : C.muted, fontSize: 13 }}>{r.name}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput value={label} onChangeText={setLabel} placeholder="Nome (ex.: Bitcoin, HGLG11)" placeholderTextColor={C.muted} style={input} maxLength={60} />
            <TextInput value={value} onChangeText={setValue} placeholder="Valor em R$ (ex.: 1500,00)" placeholderTextColor={C.muted} style={input} keyboardType="decimal-pad" />
            {msg && <Text style={{ color: C.down }}>{msg}</Text>}
            <GoldButton label="Adicionar" onPress={add} />
          </Card>
          <Card style={{ gap: 10 }}>
            <H2>Posições</H2>
            {data.holdings.length === 0 && <Muted>Nenhuma posição registrada.</Muted>}
            {data.holdings.map((h) => (
              <View key={h.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={{ color: C.white }}>{h.label}{h.source === "b3" ? "  · B3" : ""}</Text>
                  <Text style={{ color: C.muted, fontSize: 12 }}>{data.rows.find((r) => r.key === h.block)?.name}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: C.white, fontWeight: "600" }}>{brl(h.valueCents)}</Text>
                  <ConfirmAct label="Apagar" ask="Apagar esta posição?" onConfirm={() => remove(h.id)} />
                </View>
              </View>
            ))}
          </Card>
        </>
      )}
    </>
  );
}
