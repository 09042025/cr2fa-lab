import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { API, getToken } from "./api";

export interface Picked { id: number; uri: string }

/** Abre a galeria, reduz a foto (até 1280 px, JPEG) e envia ao site. Devolve o id para anexar à mensagem/publicação. */
export async function pickAndUpload(): Promise<Picked | { error: string } | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1, allowsEditing: false });
  if (r.canceled || !r.assets[0]) return null;
  let step = "reduzir a foto";
  try {
    let uri = r.assets[0].uri;
    try {
      uri = (await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1280 } }], { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG })).uri;
    } catch {
      // Se não conseguir reduzir, tenta enviar a foto como está (o site recusa acima de 2 MB).
    }
    step = "enviar a foto";
    const token = await getToken();
    const res = await xhrUpload(`${API}/api/community/image`, uri, token);
    if (res.status === 401) return { error: "Sessão expirada. Entre de novo." };
    if (res.status < 200 || res.status >= 300 || !res.body.id) return { error: res.body.error || `O site recusou a foto (código ${res.status}).` };
    return { id: res.body.id, uri };
  } catch (e) {
    return { error: `Não foi possível ${step}: ${e instanceof Error ? e.message : "erro desconhecido"}` };
  }
}

/** Envio com XMLHttpRequest: é o jeito mais compatível de mandar arquivo do celular em multipart. */
function xhrUpload(url: string, uri: string, token: string | null): Promise<{ status: number; body: { id?: number; error?: string } }> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", { uri, name: "foto.jpg", type: "image/jpeg" } as unknown as Blob);
    const x = new XMLHttpRequest();
    x.open("POST", url);
    if (token) x.setRequestHeader("authorization", `Bearer ${token}`);
    x.timeout = 60_000;
    x.onload = () => { let body = {}; try { body = JSON.parse(x.responseText); } catch { /* resposta sem JSON */ } resolve({ status: x.status, body }); };
    x.onerror = () => reject(new Error("sem resposta do servidor"));
    x.ontimeout = () => reject(new Error("tempo esgotado"));
    x.send(fd);
  });
}
