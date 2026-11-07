import { Text } from "react-native";
import { C } from "../src/theme";
import { useApi } from "../src/useApi";
import { Card, Muted, Screen, Status } from "../src/ui";

interface Data { intro: string; blocks: { h: string; p?: string[]; ul?: { b: string; t: string }[] }[] }

/** Política de privacidade nativa: o texto vem do site (mesmo conteúdo da página nizainvest.com.br/privacidade). */
export default function Privacidade() {
  const { data, error, loading, reload } = useApi<Data>("/api/privacy");
  return (
    <Screen title="Política de privacidade">
      <Status loading={loading && !data} error={error} onRetry={reload} />
      {data && (
        <>
          <Muted>{data.intro}</Muted>
          {data.blocks.map((b) => (
            <Card key={b.h} style={{ gap: 8 }}>
              <Text style={{ color: C.goldSoft, fontWeight: "800", fontSize: 16 }}>{b.h}</Text>
              {b.ul?.map((i) => <Text key={i.b} style={{ color: C.muted, lineHeight: 20 }}>• <Text style={{ color: C.white, fontWeight: "700" }}>{i.b}:</Text> {i.t}</Text>)}
              {b.p?.map((t) => <Text key={t} style={{ color: C.muted, lineHeight: 20 }}>{t}</Text>)}
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
