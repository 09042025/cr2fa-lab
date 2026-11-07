import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { API, getToken } from "../src/api";
import { CriptoNav } from "../src/criptoNav";
import { C } from "../src/theme";
import { TvChart } from "../src/TvChart";
import { useApi } from "../src/useApi";
import { Card, GoldButton, H2, Muted, ProBadge, Screen, Status } from "../src/ui";

let WebViewC: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
try { WebViewC = require("react-native-webview").WebView; } catch { WebViewC = null; }

interface Ind { id: string; name: string; group: string; axis: "price" | "own"; scale: "linear" | "log"; fmt: string; lines: { label: string; dashed?: boolean }[]; refs: number[]; desc: string }
interface Defs { pro: boolean; groups?: { id: string; label: string }[]; indicators?: Ind[] }

const Chip = ({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) => (
  <Pressable onPress={onPress} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: on ? C.gold : C.line, backgroundColor: on ? C.gold : C.panel2 }}>
    <Text style={{ color: on ? C.ink : C.white, fontWeight: "700", fontSize: 13 }}>{label}</Text>
  </Pressable>
);

/** Gráfico do Bitcoin (preço) com um indicador on-chain por vez. Os dados vêm do mesmo endereço do site; o desenho é feito com Chart.js. */
function html(ind: Ind, token: string): string {
  const cfg = JSON.stringify(ind);
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#0b1020;color:#e5e9f5;font-family:sans-serif}#c{position:relative;height:340px;padding:4px}#m{padding:8px;font-size:13px;color:#9aa6c4}</style><script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script></head><body><div id="c"><canvas id="k"></canvas></div><div id="m">Carregando…</div><script>
const IND=${cfg};const TOKEN=${JSON.stringify(token)};
const COL=['#d9a520','#4ade80','#60a5fa','#f472b6'];
fetch('${API}/api/onchain/btc?i='+IND.id,{headers:{authorization:'Bearer '+TOKEN}}).then(r=>r.json().then(d=>({ok:r.ok,d}))).then(({ok,d})=>{
 if(!ok){document.getElementById('m').textContent=d.error||'Dados indisponíveis agora.';return}
 const n=d.n,start=d.start;const labels=[];for(let i=0;i<n;i++){const t=new Date((start+i)*86400000);labels.push(t.toISOString().slice(0,10))}
 const lines=d.series[IND.id]||[];
 const ds=[{label:'Preço (US$)',data:d.price,borderColor:'#94a3b8',borderWidth:1.2,pointRadius:0,yAxisID:'y'}];
 const own=IND.axis==='own';
 lines.forEach((ln,i)=>ds.push({label:IND.lines[i]?IND.lines[i].label:IND.name,data:ln,borderColor:COL[i%COL.length],borderWidth:1.8,borderDash:IND.lines[i]&&IND.lines[i].dashed?[5,4]:[],pointRadius:0,yAxisID:own?'y1':'y',spanGaps:false}));
 const scales={x:{ticks:{color:'#9aa6c4',maxTicksLimit:5,callback:function(v){return this.getLabelForValue(v).slice(0,4)}},grid:{display:false}},y:{type:'logarithmic',position:'left',ticks:{color:'#9aa6c4'},grid:{color:'rgba(255,255,255,0.06)'}}};
 if(own)scales.y1={type:IND.scale==='log'?'logarithmic':'linear',position:'right',ticks:{color:'#d9a520'},grid:{drawOnChartArea:false}};
 new Chart(document.getElementById('k'),{type:'line',data:{labels,datasets:ds},options:{animation:false,responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{labels:{color:'#e5e9f5',boxWidth:12}},decimation:{enabled:true,algorithm:'min-max'}},scales}});
 document.getElementById('m').textContent='Atualizado a partir dos dados públicos. Toque no gráfico para ler os valores de cada dia.';
}).catch(()=>{document.getElementById('m').textContent='Sem conexão com o servidor.'});
</script></body></html>`;
}

export default function Onchain() {
  const [view, setView] = useState<"tv" | "onchain">("tv");
  const { data, error, loading, reload } = useApi<Defs>("/api/mobile/onchain");
  const [id, setId] = useState("mvrv_z");
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => { void getToken().then(setToken); }, []);
  const ind = useMemo(() => data?.indicators?.find((i) => i.id === id) ?? data?.indicators?.[0], [data, id]);
  return (
    <Screen title="Análise on Chain" subtitle="Gráfico do Bitcoin com análise técnica e indicadores on-chain.">
      <CriptoNav current="/onchain" />
      <Status loading={loading && !data} error={error} onRetry={reload} />
      {data && !data.pro && (
        <Card style={{ borderColor: C.gold, gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><ProBadge /><Text style={{ color: C.goldSoft, fontWeight: "700" }}>Análise on Chain (exclusivo do plano Premium)</Text></View>
          <Muted>O gráfico do TradingView e os indicadores on-chain do Bitcoin fazem parte do plano Premium.</Muted>
          <GoldButton label="Ver planos" onPress={() => router.push("/planos")} />
        </Card>
      )}
      {data?.pro && (
        <>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Chip label="Análise técnica" on={view === "tv"} onPress={() => setView("tv")} />
            <Chip label="Indicadores on-chain" on={view === "onchain"} onPress={() => setView("onchain")} />
          </View>
          {view === "tv" ? (
            <>
              <TvChart symbol="BITSTAMP:BTCUSD" height={520} />
              <Muted>Use o botão Indicadores no topo do gráfico para ligar MACD, RSI, médias e outros. Gráficos fornecidos pelo TradingView.</Muted>
            </>
          ) : (
            <>
              {data.groups?.map((g) => (
                <View key={g.id} style={{ gap: 6 }}>
                  <Text style={{ color: C.muted, fontSize: 12 }}>{g.label}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {data.indicators!.filter((i) => i.group === g.id).map((i) => <Chip key={i.id} label={i.name} on={ind?.id === i.id} onPress={() => setId(i.id)} />)}
                  </View>
                </View>
              ))}
              {ind && token && WebViewC ? (
                <View style={{ height: 420, borderRadius: 10, overflow: "hidden", backgroundColor: C.ink }}>
                  <WebViewC key={ind.id} source={{ html: html(ind, token), baseUrl: API }} originWhitelist={["*"]} javaScriptEnabled domStorageEnabled nestedScrollEnabled style={{ flex: 1, backgroundColor: C.ink }} />
                </View>
              ) : null}
              {ind && <Card style={{ gap: 4 }}><H2>{ind.name}</H2><Muted>{ind.desc}</Muted></Card>}
            </>
          )}
          <Muted>Conteúdo educativo e informativo, baseado em dados públicos. Não é recomendação de investimento.</Muted>
        </>
      )}
    </Screen>
  );
}
