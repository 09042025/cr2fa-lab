import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { brl, rate } from "../src/format";
import { C } from "../src/theme";
import { useApi } from "../src/useApi";
import { Card, GoldButton, H2, Muted, ProBadge, Screen, Status } from "../src/ui";

interface Res { gross: number; ir: number; fees: number; net: number; netProfit: number; netAnnualPct: number; label: string }
interface Data {
  pro: boolean; failed: boolean; rates: { selic: number | null; cdi: number | null; ipca12m: number | null } | null;
  input?: { cdi: number; selic: number; amount: number; days: number; cdb: number; lci: number };
  rows?: Res[]; irPct?: number; cdbEquivalent?: number;
}

const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <View style={{ width: "48%" }}>
    <Text style={{ color: C.muted, fontSize: 11, marginBottom: 3 }}>{label}</Text>
    <TextInput value={value} onChangeText={onChange} keyboardType="decimal-pad" style={{ backgroundColor: C.ink, borderColor: C.line, borderWidth: 1, borderRadius: 10, color: C.white, paddingHorizontal: 12, paddingVertical: 9 }} />
  </View>
);

export default function RendaFixa() {
  const [f, setF] = useState({ amount: "10000", days: "365", cdi: "", selic: "", cdb: "105", lci: "92" });
  const [qs, setQs] = useState("");
  const { data, error, loading, reload } = useApi<Data>(`/api/mobile/renda-fixa${qs}`);
  // Preenche CDI e Selic com os valores atuais na primeira carga.
  useEffect(() => { if (data?.input && f.cdi === "") setF((x) => ({ ...x, cdi: String(data.input!.cdi), selic: String(data.input!.selic) })); }, [data, f.cdi]);
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const run = () => setQs("?" + Object.entries(f).filter(([, v]) => v !== "").map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&"));
  return (
    <Screen title="Renda fixa" subtitle="Bloco de 20% do Protocolo: 30% Tesouro Selic, 30% CDBs e 40% LCI/LCA. A reserva para oportunidades também fica aqui, metade em CDB com liquidez diária e metade em Tesouro Selic.">
      <Status loading={loading && !data} error={error} onRetry={reload} />
      {data && (
        <>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[["Selic (meta)", data.rates?.selic], ["CDI (anual)", data.rates?.cdi], ["IPCA (12 m)", data.rates?.ipca12m]].map(([label, v]) => (
              <Card key={label as string} style={{ flex: 1, padding: 12 }}>
                <Text style={{ color: C.muted, fontSize: 12 }}>{label as string}</Text>
                <Text style={{ color: C.goldSoft, fontSize: 20, fontWeight: "700" }}>{rate(v as number | null | undefined)}</Text>
              </Card>
            ))}
          </View>
          {data.pro && data.rows ? (
            <>
              <Card style={{ gap: 10 }}>
                <H2>Comparador líquido (já descontado o imposto)</H2>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}>
                  <Field label="Valor aplicado (R$)" value={f.amount} onChange={set("amount")} />
                  <Field label="Prazo (dias)" value={f.days} onChange={set("days")} />
                  <Field label="CDI (% a.a.)" value={f.cdi} onChange={set("cdi")} />
                  <Field label="Selic (% a.a.)" value={f.selic} onChange={set("selic")} />
                  <Field label="CDB (% do CDI)" value={f.cdb} onChange={set("cdb")} />
                  <Field label="LCI/LCA (% do CDI)" value={f.lci} onChange={set("lci")} />
                </View>
                <GoldButton label="Comparar" onPress={run} />
              </Card>
              {data.rows.map((r, i) => (
                <Card key={r.label} style={{ gap: 4, borderColor: i === 0 ? C.gold : C.line }}>
                  <Text style={{ color: i === 0 ? C.goldSoft : C.white, fontWeight: "800" }}>{i === 0 ? "🏆 " : ""}{r.label}</Text>
                  <Text style={{ color: C.muted }}>Bruto {brl(r.gross)} · IR {brl(r.ir)} · Taxas {brl(r.fees)}</Text>
                  <Text style={{ color: C.white, fontWeight: "700" }}>Líquido {brl(r.net)} · Lucro {brl(r.netProfit)}</Text>
                  <Text style={{ color: C.up, fontWeight: "700" }}>{rate(r.netAnnualPct)} a.a. líquido</Text>
                </Card>
              ))}
              <Muted>Para o prazo de {data.input?.days} dias o IR do CDB é de {rate(data.irPct)}. Um CDB precisaria pagar cerca de {rate(data.cdbEquivalent)} do CDI para empatar com uma LCI/LCA de {data.input?.lci}% do CDI.</Muted>
              <Muted>Simulação simplificada: taxas constantes, sem IOF (aplica-se só a resgates em menos de 30 dias) e com a custódia de 0,10% a.a. da B3 no Tesouro Selic. Confira as condições reais na instituição.</Muted>
            </>
          ) : (
            <Card style={{ borderColor: C.gold, gap: 8 }}>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><ProBadge /><Text style={{ color: C.goldSoft, fontWeight: "700" }}>Comparador líquido de CDB, LCI/LCA e Tesouro Selic</Text></View>
              <Muted>Disponível no plano Premium.</Muted>
              <GoldButton label="Ver planos" onPress={() => router.push("/planos")} />
            </Card>
          )}
          <Muted>Em CDBs, confira a cobertura do FGC (até R$ 250 mil por CPF e por instituição) e a solidez do emissor. Fonte: Banco Central do Brasil (SGS).</Muted>
        </>
      )}
    </Screen>
  );
}
