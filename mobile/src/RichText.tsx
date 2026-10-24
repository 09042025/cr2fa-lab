import { Linking, Text, type TextStyle } from "react-native";
import { C } from "./theme";

const URL_RE = /(https?:\/\/[^\s<>"']+)/gi;

/** Texto com links clicáveis (abre no navegador). Só http/https. */
export function RichText({ body, style }: { body: string; style?: TextStyle }) {
  const parts = body.split(URL_RE);
  return (
    <Text style={style}>
      {parts.map((part, i) => {
        if (i % 2 === 0) return part;
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
