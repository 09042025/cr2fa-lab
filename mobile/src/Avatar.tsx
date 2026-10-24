import { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";
import { getToken, imageUri } from "./api";
import { C } from "./theme";

let cachedToken: string | null | undefined;

/** Imagens da comunidade só abrem com login: manda o token junto. */
export function useImageSource(id: number | null) {
  const [token, setToken] = useState<string | null | undefined>(cachedToken);
  useEffect(() => {
    if (cachedToken !== undefined) return;
    getToken().then((t) => { cachedToken = t; setToken(t); });
  }, []);
  if (!id || !token) return null;
  return { uri: imageUri(id), headers: { authorization: `Bearer ${token}` } };
}

export const resetImageToken = () => { cachedToken = undefined; };

export function Avatar({ name, id, size = 38 }: { name: string; id: number | null; size?: number }) {
  const src = useImageSource(id);
  if (src) return <Image source={src} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: C.line }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: C.goldSoft, fontWeight: "700", fontSize: size * 0.42 }}>{(name.trim()[0] ?? "?").toUpperCase()}</Text>
    </View>
  );
}

export function PostImage({ id }: { id: number }) {
  const src = useImageSource(id);
  if (!src) return null;
  return <Image source={src} resizeMode="contain" style={{ width: "100%", height: 260, borderRadius: 10, backgroundColor: C.ink }} />;
}
