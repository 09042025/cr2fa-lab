import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import { getThumbnailAsync } from "expo-video-thumbnails";
import { useVideoPlayer, VideoView } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API, getToken, send } from "./api";
import { C } from "./theme";
import { xhrUpload } from "./upload";

export interface Recorded { videoId: number; posterId: number; seconds: number; uri: string }
type Mode = "cashpill" | "story";

/** Envia a capa (imagem) e o vídeo ao site e devolve os ids. */
async function uploadVideo(uri: string, seconds: number): Promise<Recorded | { error: string }> {
  const token = await getToken();
  let step = "criar a capa";
  try {
    const thumb = await getThumbnailAsync(uri, { time: 600, quality: 0.7 });
    step = "enviar a capa";
    const p = await xhrUpload(`${API}/api/community/image`, thumb.uri, token, "capa.jpg", "image/jpeg");
    if (p.status < 200 || p.status >= 300 || !p.body.id) return { error: p.body.error || `O site recusou a capa (código ${p.status}).` };
    step = "enviar o vídeo";
    const v = await xhrUpload(`${API}/api/community/video`, uri, token, "video.mp4", "video/mp4");
    if (v.status < 200 || v.status >= 300 || !v.body.id) return { error: v.body.error || `O site recusou o vídeo (código ${v.status}).` };
    return { videoId: v.body.id, posterId: p.body.id, seconds, uri };
  } catch (e) {
    return { error: `Não foi possível ${step}: ${e instanceof Error ? e.message : "erro desconhecido"}` };
  }
}

function Preview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.play(); });
  return <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls={false} />;
}

/**
 * Câmera de vídeo em tela cheia: grava (toque para começar e parar), mostra a prévia, envia e entrega o vídeo pronto.
 * Cashpill: 15, 30, 45 ou 60 s. Story: até 60 s.
 */
export function Recorder({ mode, onClose, onReady }: { mode: Mode; onClose: () => void; onReady: (r: Recorded, caption: string) => Promise<string | null> }) {
  const insets = useSafeAreaInsets();
  const cam = useRef<CameraView>(null);
  const [camPerm, askCam] = useCameraPermissions();
  const [micPerm, askMic] = useMicrophonePermissions();
  const [front, setFront] = useState(false);
  const [maxSec, setMaxSec] = useState(mode === "cashpill" ? 30 : 60);
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [taken, setTaken] = useState<{ uri: string; seconds: number } | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const t0 = useRef(0);

  useEffect(() => { if (camPerm && !camPerm.granted && camPerm.canAskAgain) void askCam(); }, [camPerm, askCam]);
  useEffect(() => { if (micPerm && !micPerm.granted && micPerm.canAskAgain) void askMic(); }, [micPerm, askMic]);
  useEffect(() => {
    if (!recording) return;
    const iv = setInterval(() => setSecs(Math.floor((Date.now() - t0.current) / 1000)), 250);
    return () => clearInterval(iv);
  }, [recording]);

  async function toggle() {
    if (recording) { cam.current?.stopRecording(); return; }
    setErr(null); setSecs(0); t0.current = Date.now(); setRecording(true);
    try {
      // 480p e taxa baixa mantêm o vídeo abaixo do limite de 14 MB do site.
      const r = await cam.current?.recordAsync({ maxDuration: maxSec, ...( { videoQuality: "480p", videoBitrate: 1_500_000 } as object) });
      setRecording(false);
      if (r?.uri) setTaken({ uri: r.uri, seconds: Math.max(1, Math.min(maxSec, Math.round((Date.now() - t0.current) / 1000))) });
    } catch (e) {
      setRecording(false);
      setErr(`Não foi possível gravar: ${e instanceof Error ? e.message : "erro desconhecido"}`);
    }
  }

  async function publish() {
    if (!taken) return;
    setBusy(true); setErr(null);
    const up = await uploadVideo(taken.uri, taken.seconds);
    if ("error" in up) { setBusy(false); return setErr(up.error); }
    const e = await onReady(up, caption);
    setBusy(false);
    if (e) return setErr(e);
    onClose();
  }

  const ok = camPerm?.granted && micPerm?.granted;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "#000", paddingTop: insets.top, paddingBottom: insets.bottom }}>
        {!ok ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 }}>
            <Text style={{ color: "#fff", textAlign: "center", fontSize: 16 }}>Para gravar, o app precisa de acesso à câmera e ao microfone.</Text>
            <Pressable onPress={() => { void askCam(); void askMic(); }} style={{ backgroundColor: C.gold, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 10 }}><Text style={{ color: C.ink, fontWeight: "800" }}>Permitir</Text></Pressable>
            <Pressable onPress={onClose}><Text style={{ color: C.muted }}>Cancelar</Text></Pressable>
          </View>
        ) : taken ? (
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14 }}>
              <Pressable onPress={() => { setTaken(null); setErr(null); }} disabled={busy}><Text style={{ color: "#fff", fontSize: 16 }}>Regravar</Text></Pressable>
              <Text style={{ color: C.goldSoft, fontWeight: "700" }}>{mode === "cashpill" ? "Novo Cashpill" : "Novo story"} · {taken.seconds}s</Text>
              <Pressable onPress={publish} disabled={busy} style={{ backgroundColor: C.gold, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 8, opacity: busy ? 0.5 : 1 }}>
                {busy ? <ActivityIndicator color={C.ink} /> : <Text style={{ color: C.ink, fontWeight: "800" }}>{mode === "cashpill" ? "Publicar" : "Compartilhar"}</Text>}
              </Pressable>
            </View>
            <Preview uri={taken.uri} />
            <View style={{ padding: 14, gap: 6 }}>
              <TextInput value={caption} onChangeText={setCaption} maxLength={200} placeholder="Legenda (opcional)" placeholderTextColor="#9aa" style={{ color: "#fff", fontSize: 16, borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 6 }} />
              {busy ? <Text style={{ color: C.muted, fontSize: 12 }}>Enviando vídeo… pode levar alguns segundos.</Text> : null}
              {err ? <Text style={{ color: C.down }}>{err}</Text> : null}
            </View>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <CameraView ref={cam} style={{ flex: 1 }} mode="video" facing={front ? "front" : "back"} mirror={front} />
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14 }}>
              <Pressable onPress={onClose} hitSlop={12} disabled={recording}><Text style={{ color: "#fff", fontSize: 26 }}>✕</Text></Pressable>
              {recording
                ? <View style={{ backgroundColor: "#dc2626", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 3 }}><Text style={{ color: "#fff", fontWeight: "700" }}>● {secs}s / {maxSec}s</Text></View>
                : <Text style={{ color: "rgba(255,255,255,0.8)" }}>{mode === "cashpill" ? `Cashpill de até ${maxSec} s` : `Vídeo até ${maxSec} s`}</Text>}
              <Pressable onPress={() => setFront(!front)} hitSlop={12} disabled={recording}><Text style={{ color: "#fff", fontSize: 24 }}>⟳</Text></Pressable>
            </View>
            <View style={{ position: "absolute", bottom: 16, left: 0, right: 0, alignItems: "center", gap: 14 }}>
              {mode === "cashpill" && !recording && (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {[15, 30, 45, 60].map((n) => (
                    <Pressable key={n} onPress={() => setMaxSec(n)} style={{ borderRadius: 999, borderWidth: 1, borderColor: maxSec === n ? C.gold : "rgba(255,255,255,0.4)", backgroundColor: maxSec === n ? "rgba(217,165,32,0.25)" : "rgba(0,0,0,0.4)", paddingHorizontal: 14, paddingVertical: 6 }}>
                      <Text style={{ color: maxSec === n ? C.goldSoft : "#fff", fontWeight: "700" }}>{n}s</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {err ? <Text style={{ color: C.down, textAlign: "center", paddingHorizontal: 20 }}>{err}</Text> : null}
              <Pressable onPress={toggle} style={{ width: 74, height: 74, borderRadius: 37, borderWidth: 4, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                <View style={recording ? { width: 28, height: 28, borderRadius: 6, backgroundColor: "#dc2626" } : { width: 58, height: 58, borderRadius: 29, backgroundColor: "#dc2626" }} />
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

export const publishCashpill = (r: Recorded, caption: string) => send("/api/community/cashpills", { videoId: r.videoId, posterId: r.posterId, duration: r.seconds, caption });
export const publishVideoStory = (r: Recorded, caption: string) => send("/api/community/stories", { imageId: r.posterId, videoId: r.videoId, caption });
