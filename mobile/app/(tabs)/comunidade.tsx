import { useState } from "react";
import { Pressable, Text, View } from "react-native";
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
const TEMAS = ["Cripto", "Ações", "Fundos imobiliários", "Renda fixa", "Economia Brasil", "Economia mundial"];

function Chips({ items, value, onChange, badge }: { items: readonly string[]; value: string; onChange: (v: string) => void; badge?: (v: string) => boolean }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {items.map((t) => (
        <Pressable key={t} onPress={() => onChange(t)} style={{ borderRadius: 999, borderWidth: 1, borderColor: value === t ? C.gold : C.line, backgroundColor: value === t ? "rgba(217,165,32,0.15)" : C.panel, paddingHorizontal: 12, paddingVertical: 7, flexDirection: "row", gap: 6, alignItems: "center" }}>
          <Text style={{ color: value === t ? C.goldSoft : C.muted, fontWeight: "600" }}>{t}</Text>
          {badge?.(t) ? <ProBadge /> : null}
        </Pressable>
      ))}
    </View>
  );
}

export default function Comunidade() {
  const [tab, setTab] = useState<string>("Chat");
  const [canal, setCanal] = useState("chat-geral");
  const [tema, setTema] = useState("Cripto");
  const pro = CANAIS.find((c) => c.nome === canal)?.pro ?? false;
  return (
    <Screen title="Comunidade">
      <Chips items={TABS} value={tab} onChange={setTab} badge={(t) => t === "Lives VIP"} />
      {tab === "Chat" && (
        <>
          <Chips items={CANAIS.map((c) => c.nome)} value={canal} onChange={setCanal} badge={(n) => !!CANAIS.find((c) => c.nome === n)?.pro} />
          {pro ? (
            <ProGate feature={`${canal} (exclusivo do plano Pró)`}><Card><H2>#{canal}</H2><Muted>Mensagens do canal aparecem aqui.</Muted></Card></ProGate>
          ) : (
            <Card><H2>#{canal}</H2><Muted>Mensagens do chat-geral aparecem aqui. Livre para todos.</Muted></Card>
          )}
        </>
      )}
      {tab === "Feed" && <Card><H2>Feed da comunidade</H2><Muted>Publicações dos membros. Livre para todos.</Muted></Card>}
      {tab === "Notícias" && (
        <>
          <Chips items={TEMAS} value={tema} onChange={setTema} />
          <Card><H2>Notícias · {tema}</H2><Muted>As manchetes do tema aparecem aqui. Livre para todos.</Muted></Card>
        </>
      )}
      {tab === "Lives VIP" && <ProGate feature="Lives VIP (exclusivo do plano Pró)"><Card><H2>Ao vivo</H2><Muted>A live do canal @EMERSON-NIZA aparece aqui.</Muted></Card></ProGate>}
    </Screen>
  );
}
