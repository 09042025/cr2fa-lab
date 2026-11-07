import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Text, View } from "react-native";
import { API, getToken } from "../src/api";
import { CriptoNav } from "../src/criptoNav";
import { C } from "../src/theme";
import { useApi } from "../src/useApi";
import { Card, GoldButton, Muted, ProBadge, Status } from "../src/ui";

let WebViewC: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
try { WebViewC = require("react-native-webview").WebView; } catch { WebViewC = null; }

/**
 * Análise on Chain: abre a própria tela do site (gráfico TradingView e indicadores on-chain, com zoom, atalhos, halvings, preço ao vivo e todas as
 * funções) sem o cabeçalho do site, usando o login do app. Assim fica sempre idêntico ao navegador do celular.
 */
export default function Onchain() {
  const { data, error, loading, reload } = useApi<{ pro: boolean }>("/api/mobile/onchain");
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => { void getToken().then(setToken); }, []);
  const base = `${API}/embed/onchain`;
  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <CriptoNav current="/onchain" />
      {loading && !data ? <View style={{ padding: 16 }}><Status loading error={error} onRetry={reload} /></View> : null}
      {error && !data ? <View style={{ padding: 16 }}><Status loading={false} error={error} onRetry={reload} /></View> : null}
      {data && !data.pro && (
        <View style={{ padding: 16 }}>
          <Card style={{ borderColor: C.gold, gap: 8 }}>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><ProBadge /><Text style={{ color: C.goldSoft, fontWeight: "700" }}>Análise on Chain (exclusivo do plano Premium)</Text></View>
            <Muted>O gráfico do TradingView e os indicadores on-chain do Bitcoin fazem parte do plano Premium.</Muted>
            <GoldButton label="Ver planos" onPress={() => router.push("/planos")} />
          </Card>
        </View>
      )}
      {data?.pro && token && WebViewC && (
        <WebViewC
          source={{ uri: base, headers: { Authorization: `Bearer ${token}` } }}
          injectedJavaScriptBeforeContentLoaded={`(function(){var m=document.querySelector('meta[name=viewport]');var c="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no";if(m){m.setAttribute("content",c);}else{document.addEventListener("DOMContentLoaded",function(){var n=document.createElement("meta");n.name="viewport";n.content=c;document.head.appendChild(n);});}})();document.cookie = "cr2fa_session=${token}; path=/; max-age=86400"; true;`}
          originWhitelist={["*"]}
          javaScriptEnabled
          scalesPageToFit={false}
          setBuiltInZoomControls={false}
          setDisplayZoomControls={false}
          domStorageEnabled
          nestedScrollEnabled
          setSupportMultipleWindows={false}
          startInLoadingState
          allowsBackForwardNavigationGestures
          style={{ flex: 1, backgroundColor: C.ink }}
          onShouldStartLoadWithRequest={(ev: { url: string; isTopFrame?: boolean }) => {
            if (ev.isTopFrame === false || ev.url === "about:blank" || ev.url.startsWith(base)) return true;
            if (ev.url.startsWith(`${API}/planos`)) { router.push("/planos"); return false; }
            if (ev.url.startsWith("http")) { void Linking.openURL(ev.url); return false; }
            return true;
          }}
        />
      )}
      {data?.pro && !WebViewC && <View style={{ padding: 16 }}><Muted>Este aparelho não consegue abrir o gráfico dentro do app.</Muted><GoldButton label="Abrir no navegador" onPress={() => void Linking.openURL(`${API}/painel/cripto/onchain`)} /></View>}
    </View>
  );
}
