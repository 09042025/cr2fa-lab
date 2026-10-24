import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { API, getToken } from "./api";

export interface Picked { id: number; uri: string }

/** Abre a galeria, reduz a foto (até 1280 px, JPEG) e envia ao site. Devolve o id para anexar à mensagem/publicação. */
export async function pickAndUpload(): Promise<Picked | { error: string } | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1, allowsEditing: false });
  if (r.canceled || !r.assets[0]) return null;
  try {
    const small = await ImageManipulator.manipulateAsync(r.assets[0].uri, [{ resize: { width: 1280 } }], { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG });
    const fd = new FormData();
    fd.append("file", { uri: small.uri, name: "foto.jpg", type: "image/jpeg" } as unknown as Blob);
    const token = await getToken();
    const res = await fetch(`${API}/api/community/image`, { method: "POST", body: fd, headers: token ? { authorization: `Bearer ${token}` } : {} });
    const body = (await res.json().catch(() => ({}))) as { id?: number; error?: string };
    if (!res.ok || !body.id) return { error: body.error || "Não foi possível enviar a foto." };
    return { id: body.id, uri: small.uri };
  } catch {
    return { error: "Não foi possível enviar a foto. Confira a internet e tente de novo." };
  }
}
