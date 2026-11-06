"use client";
import { useEffect, useState, type ReactNode } from "react";

const KEY = "lp-hidden";
const read = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]; } catch { return []; } };
const write = (v: string[]) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* sem armazenamento: some só nesta visita */ } window.dispatchEvent(new Event("lp-hidden")); };

function useHidden() {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => { const f = () => setList(read()); f(); window.addEventListener("lp-hidden", f); return () => window.removeEventListener("lp-hidden", f); }, []);
  return list;
}

/** Cartão de posição com botão para ocultar (fica guardado neste navegador). */
export function HideableCard({ id, children }: { id: string; children: ReactNode }) {
  const list = useHidden();
  if (list.includes(id)) return null;
  return (
    <div className="relative">
      <button type="button" onClick={() => write([...read(), id])} className="absolute right-3 top-3 z-10 rounded border border-line bg-panel px-2 py-0.5 text-xs text-muted hover:text-white" title="Ocultar esta posição da lista (só neste navegador)">Ocultar</button>
      {children}
    </div>
  );
}

export function RestoreHidden() {
  const list = useHidden();
  if (!list.length) return null;
  return <button type="button" onClick={() => write([])} className="text-xs text-gold-soft hover:underline">Mostrar {list.length} posição(ões) que você ocultou</button>;
}
