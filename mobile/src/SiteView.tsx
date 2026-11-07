import { useEffect, useState } from "react";
import { Linking, View } from "react-native";
import { router } from "expo-router";
import { API, getToken } from "./api";
import { C } from "./theme";
import { GoldButton, Muted } from "./ui";

let WebViewC: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
try { WebViewC = require("react-native-webview").WebView; } catch { WebViewC = null; }

/** Troca a lista suspensa nativa do Android (letras grandes, tela cheia) por uma lista compacta no mesmo estilo do site. */
const SELECT_JS = `
(function(){
  if (window.__nzSel) return; window.__nzSel = 1;
  var setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
  function close(){ var o=document.getElementById("nz-sel"); if(o) o.remove(); }
  function open(sel){
    close();
    var o=document.createElement("div"); o.id="nz-sel";
    o.style.cssText="position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center;font-family:system-ui,sans-serif";
    var b=document.createElement("div");
    b.style.cssText="width:100%;max-width:480px;max-height:62vh;overflow:auto;background:#0f1a3a;border:1px solid #24335f;border-radius:16px 16px 0 0;padding:6px 0";
    Array.prototype.forEach.call(sel.options,function(op){
      var r=document.createElement("div"); r.textContent=op.text;
      var on=op.value===sel.value;
      r.style.cssText="padding:11px 18px;font-size:14px;line-height:1.3;color:"+(on?"#f3d27a":"#e8ecf8")+";font-weight:"+(on?"700":"400")+";border-bottom:1px solid rgba(36,51,95,.6)"+(op.disabled?";opacity:.4":"");
      if(!op.disabled) r.addEventListener("click",function(e){ e.stopPropagation(); setter.call(sel,op.value); sel.dispatchEvent(new Event("input",{bubbles:true})); sel.dispatchEvent(new Event("change",{bubbles:true})); close(); });
      b.appendChild(r);
    });
    o.appendChild(b); o.addEventListener("click",close); document.body.appendChild(o);
  }
  document.addEventListener("mousedown",function(e){ var t=e.target; if(t&&t.tagName==="SELECT"&&!t.multiple){ e.preventDefault(); t.blur(); open(t); } },true);
  document.addEventListener("touchstart",function(e){ var t=e.target; if(t&&t.tagName==="SELECT"&&!t.multiple){ t.__nzT=1; } },{capture:true,passive:true});
  document.addEventListener("click",function(e){ var t=e.target; if(t&&t.tagName==="SELECT"&&!t.multiple){ e.preventDefault(); open(t); } },true);
})();
true;
`;

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
      injectedJavaScript={SELECT_JS}
      textZoom={100}
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
