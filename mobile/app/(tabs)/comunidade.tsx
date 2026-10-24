import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ChatTab } from "../../src/ChatTab";
import { FeedTab } from "../../src/FeedTab";
import { NoticiasTab } from "../../src/NoticiasTab";
import { C } from "../../src/theme";
import { Card, H2, Muted, ProBadge, ProGate, Screen } from "../../src/ui";

// Mesma divisão do site: Chat (só chat-geral livre), Feed e Notícias livres, Lives VIP é Pró.
const TABS = ["Chat", "Feed", "Notícias", "Lives VIP"] as const;
const CANAIS = [
  { nome: "chat-geral", pro: false },
  { nome: "boas-vindas-e-regras", pro: true },
  { nome: "anuncios-do-canal", pro: true },
  { nome: "geral", pro: true },
  { nome: "planejamento-de-reuniões", pro: true },
];

/** Abas principais: 4 colunas do mesmo tamanho, alinhadas. */
function SegTabs({ items, value, onChange, badge }: { items: readonly string[]; value: string; onChange: (v: string) => void; badge: (v: string) => boolean }) {
  return (
    <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.line }}>
      {items.map((t) => {
        const on = value === t;
        return (
          <Pressable key={t} onPress={() => onChange(t)} style={{ flex: 1, alignItems: "center", gap: 3, paddingTop: 8, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: on ? C.gold : "transparent", marginBottom: -1 }}>
            <Text numberOfLines={1} style={{ color: on ? C.goldSoft : C.muted, fontWeight: "600", fontSize: 14 }}>{t}</Text>
            <View style={{ height: 16, justifyContent: "center" }}>{badge(t) ? <ProBadge /> : null}</View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Lista vertical: todas as linhas com a mesma largura e altura (selo PRÓ sempre à direita). */
function ListPick({ items, value, onChange, badge, prefix = "" }: { items: readonly string[]; value: string; onChange: (v: string) => void; badge?: (v: string) => boolean; prefix?: string }) {
  return (
    <View style={{ gap: 8 }}>
      {items.map((t) => {
        const on = value === t;
        return (
          <Pressable key={t} onPress={() => onChange(t)} style={{ height: 46, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, borderWidth: 1, borderColor: on ? C.gold : C.line, backgroundColor: on ? "rgba(217,165,32,0.15)" : C.panel, paddingHorizontal: 14 }}>
            <Text numberOfLines={1} style={{ flex: 1, color: on ? C.goldSoft : C.white, fontWeight: "600" }}>{prefix}{t}</Text>
            {badge?.(t) ? <ProBadge /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function Comunidade() {
  const [tab, setTab] = useState<string>("Chat");
  const [canal, setCanal] = useState("chat-geral");
  const pro = CANAIS.find((c) => c.nome === canal)?.pro ?? false;
  return (
    <Screen title="Comunidade">
      <SegTabs items={TABS} value={tab} onChange={setTab} badge={(t) => t === "Lives VIP"} />
      {tab === "Chat" && (
        <>
          <ListPick prefix="# " items={CANAIS.map((c) => c.nome)} value={canal} onChange={setCanal} badge={(n) => !!CANAIS.find((c) => c.nome === n)?.pro} />
          {pro ? (
            <ProGate feature={`${canal} (exclusivo do plano Pró)`}><ChatTab channel={canal} /></ProGate>
          ) : (
            <ChatTab channel="chat-geral" />
          )}
        </>
      )}
      {tab === "Feed" && <FeedTab />}
      {tab === "Notícias" && <NoticiasTab />}
      {tab === "Lives VIP" && <ProGate feature="Lives VIP (exclusivo do plano Pró)"><Card><H2>Ao vivo</H2><Muted>A live do canal @EMERSON-NIZA aparece aqui.</Muted></Card></ProGate>}
    </Screen>
  );
}
