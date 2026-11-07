import { router } from "expo-router";
import { Linking, Text, type TextStyle } from "react-native";
import { C } from "./theme";

const URL_RE = /(https?:\/\/[^\s<>"']+)/gi;
const MENTION_RE = /(@[\p{L}\p{N}_.-]+)/u;

/** Texto sem link: separa as menções @Nome e abre o perfil ao tocar. */
function withMentions(text: string, key: string) {
  return text.split(MENTION_RE).map((t, i) =>
    t.startsWith("@") && t.length > 1 ? (
      <Text key={`${key}${i}`} style={{ color: C.goldSoft, fontWeight: "600" }} onPress={() => router.push({ pathname: "/membro", params: { nome: t.slice(1) } })}>{t}</Text>
    ) : t,
  );
}

/** Texto com links clicáveis (abre no navegador). Só http/https. */
export function RichText({ body, style }: { body: string; style?: TextStyle }) {
  const parts = body.split(URL_RE);
  return (
    <Text style={style}>
      {parts.map((part, i) => {
        if (i % 2 === 0) return <Text key={i}>{withMentions(part, `m${i}-`)}</Text>;
        const url = part.replace(/[.,;:!?)\]]+$/, "");
        const tail = part.slice(url.length);
        const shown = url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
        return (
          <Text key={i}>
            <Text style={{ color: C.goldSoft, textDecorationLine: "underline" }} onPress={() => Linking.openURL(url)}>{shown.length > 40 ? shown.slice(0, 39) + "…" : shown}</Text>
            {tail}
          </Text>
        );
      })}
    </Text>
  );
}
