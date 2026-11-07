import { View } from "react-native";
import { C } from "./theme";
import { Muted } from "./ui";

// react-native-webview só existe no app instalado; se faltar, mostra um aviso em vez de quebrar.
let WebViewC: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
try { WebViewC = require("react-native-webview").WebView; } catch { WebViewC = null; }

/** Gráfico interativo do TradingView (widget oficial e gratuito), igual ao do site. */
export function TvChart({ symbol, height = 420 }: { symbol: string; height?: number }) {
  if (!WebViewC) return <Muted>Gráfico indisponível neste aparelho.</Muted>;
  const cfg = JSON.stringify({ autosize: true, symbol, interval: "D", timezone: "America/Sao_Paulo", theme: "dark", style: "1", locale: "br", allow_symbol_change: true, hide_side_toolbar: true, withdateranges: true, support_host: "https://www.tradingview.com" });
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#0b1020}.tradingview-widget-container{height:100%;width:100%}</style></head><body><div class="tradingview-widget-container"><div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div><script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>${cfg}</script></div></body></html>`;
  return (
    <View style={{ height, borderRadius: 10, overflow: "hidden", backgroundColor: C.ink }}>
      <WebViewC source={{ html, baseUrl: "https://nizainvest.com.br" }} originWhitelist={["*"]} setSupportMultipleWindows={false} javaScriptEnabled domStorageEnabled nestedScrollEnabled startInLoadingState style={{ flex: 1, backgroundColor: C.ink }} />
    </View>
  );
}
