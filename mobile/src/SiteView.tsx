import { useEffect, useState } from "react";
import { Linking, View } from "react-native";
import { router } from "expo-router";
import { API, getToken } from "./api";
import { C } from "./theme";
import { GoldButton, Muted } from "./ui";

let WebViewC: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
try { WebViewC = require("react-native-webview").WebView; } catch { WebViewC = null; }

/**
 * Abre uma página do próprio site dentro do app, sem menu nem cabeçalho do site (o app tem o seu), usando o login do app.
 * Assim a tela fica sempre idêntica à do navegador do celular.
 */
export function SiteView({ path }: { path: string }) {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => { void getToken().then(setToken); }, []);
  const base = `${API}${path}`;
  if (!WebViewC) return <View style={{ padding: 16 }}><Muted>Este aparelho não consegue abrir esta tela dentro do app.</Muted><GoldButton label="Abrir no navegador" onPress={() => void Linking.openURL(base)} /></View>;
  if (!token) return <View style={{ flex: 1, backgroundColor: C.ink }} />;
  return (
    <WebViewC
      source={{ uri: base, headers: { Authorization: `Bearer ${token}`, "x-niza-app": "1" } }}
      injectedJavaScriptBeforeContentLoaded={`(function(){var c="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no";var m=document.querySelector('meta[name=viewport]');if(m){m.setAttribute("content",c);}else{document.addEventListener("DOMContentLoaded",function(){var n=document.createElement("meta");n.name="viewport";n.content=c;document.head.appendChild(n);});}})();document.cookie = "cr2fa_session=${token}; path=/; max-age=86400";document.cookie = "niza_app=1; path=/; max-age=86400"; true;`}
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
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      style={{ flex: 1, backgroundColor: C.ink }}
      onShouldStartLoadWithRequest={(ev: { url: string; isTopFrame?: boolean }) => {
        if (ev.isTopFrame === false || ev.url === "about:blank" || !ev.url.startsWith("http")) return true;
        if (ev.url.startsWith(`${API}/planos`)) { router.push("/planos"); return false; }
        if (ev.url.startsWith(API)) return true;
        void Linking.openURL(ev.url);
        return false;
      }}
    />
  );
}
