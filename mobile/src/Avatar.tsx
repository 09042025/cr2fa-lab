import { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";
import { getToken, imageUri } from "./api";
import { C } from "./theme";

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function toBase64(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < b.length ? B64[(n >> 6) & 63] : "=") + (i + 2 < b.length ? B64[n & 63] : "=");
  }
  return out;
}

const cache = new Map<number, string>();
const pending = new Map<number, Promise<string>>();

/** Baixa a imagem com o token do usuário (elas só abrem com login) e guarda em memória. */
function loadImage(id: number): Promise<string> {
  const hit = cache.get(id);
  if (hit) return Promise.resolve(hit);
  let p = pending.get(id);
  if (!p) {
    p = (async () => {
      const token = await getToken();
      const res = await fetch(imageUri(id), { headers: token ? { authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error(`código ${res.status}`);
      const mime = (res.headers.get("content-type") || "image/jpeg").split(";")[0];
      const uri = `data:${mime};base64,${toBase64(await res.arrayBuffer())}`;
      cache.set(id, uri);
      return uri;
    })().finally(() => pending.delete(id));
    pending.set(id, p);
  }
  return p;
}

export const resetImageToken = () => cache.clear();

/** Devolve a imagem pronta para exibir (ou o motivo de não ter carregado). */
export function useImage(id: number | null) {
  const [uri, setUri] = useState<string | null>(id ? cache.get(id) ?? null : null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    let alive = true;
    loadImage(id).then((u) => alive && setUri(u)).catch((e: Error) => alive && setError(e.message));
    return () => { alive = false; };
  }, [id]);
  return { uri, error };
}

export function Avatar({ name, id, size = 38 }: { name: string; id: number | null; size?: number }) {
  const { uri } = useImage(id);
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: C.line }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: C.goldSoft, fontWeight: "700", fontSize: size * 0.42 }}>{(name.trim()[0] ?? "?").toUpperCase()}</Text>
    </View>
  );
}

export function PostImage({ id }: { id: number }) {
  const { uri, error } = useImage(id);
  if (error) return <Text style={{ color: C.muted, fontSize: 12 }}>Imagem indisponível ({error}).</Text>;
  if (!uri) return <View style={{ height: 120, borderRadius: 10, backgroundColor: C.ink }} />;
  return <Image source={{ uri }} resizeMode="contain" style={{ width: "100%", height: 260, borderRadius: 10, backgroundColor: C.ink }} />;
}
