"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Reduz imagens grandes (telas retina) para no máximo `maxSide` px em JPEG. GIFs e imagens pequenas seguem como estão. */
export async function shrink(f: File, maxSide = 1600): Promise<File> {
  if (f.type === "image/gif" || f.size <= 900 * 1024) return f;
  try {
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    const ctx = c.getContext("2d");
    if (!ctx) return f;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.86));
    return blob && blob.size < f.size ? new File([blob], (f.name || "print").replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : f;
  } catch {
    return f;
  }
}

/** Recorta no centro em quadrado e reduz para `side` px (foto de perfil). */
export async function squareAvatar(f: File, side = 320): Promise<File> {
  try {
    const bmp = await createImageBitmap(f);
    const s = Math.min(bmp.width, bmp.height);
    const c = document.createElement("canvas");
    c.width = c.height = side;
    const ctx = c.getContext("2d");
    if (!ctx) return f;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, side, side);
    ctx.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, side, side);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.88));
    return blob ? new File([blob], "perfil.jpg", { type: "image/jpeg" }) : f;
  } catch {
    return f;
  }
}

/** Recorta no centro em faixa 3:1 (capa do perfil), 1200x400 px. */
export async function bannerCrop(f: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(f);
    const w = 1200, h = 400;
    const k = Math.max(w / bmp.width, h / bmp.height);
    const sw = w / k, sh = h / k;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return f;
    ctx.fillStyle = "#0e1730";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, (bmp.width - sw) / 2, (bmp.height - sh) / 2, sw, sh, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.86));
    return blob ? new File([blob], "capa.jpg", { type: "image/jpeg" }) : f;
  } catch {
    return f;
  }
}

export interface Uploaded { id: number; name: string; preview: string }

/** Envia uma imagem à comunidade e guarda o id + prévia. `prepare` ajusta o arquivo antes (padrão: reduzir). */
export function useImageUpload(prepare: (f: File) => Promise<File> = shrink) {
  const [image, setImage] = useState<Uploaded | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const prev = useRef<string | null>(null);

  useEffect(() => () => { if (prev.current) URL.revokeObjectURL(prev.current); }, []);

  const clear = useCallback(() => {
    if (prev.current) URL.revokeObjectURL(prev.current);
    prev.current = null;
    setImage(null);
  }, []);

  const upload = useCallback(async (f: File | undefined) => {
    if (!f) return;
    if (!/^image\/(png|jpeg|gif|webp)$/.test(f.type)) return setErr("Formato não aceito. Use PNG, JPG, GIF ou WebP.");
    setErr("");
    setBusy(true);
    const small = await prepare(f);
    const fd = new FormData();
    fd.append("file", small, small.name || "print.png");
    const res = await fetch("/api/community/image", { method: "POST", body: fd });
    setBusy(false);
    const data = (await res.json().catch(() => null)) as { id?: number; error?: string } | null;
    if (!res.ok || !data?.id) return setErr(data?.error ?? "Não foi possível enviar a imagem.");
    if (prev.current) URL.revokeObjectURL(prev.current);
    prev.current = URL.createObjectURL(small);
    setImage({ id: data.id, name: f.name || "print", preview: prev.current });
  }, [prepare]);

  return { image, busy, err, setErr, upload, clear };
}
