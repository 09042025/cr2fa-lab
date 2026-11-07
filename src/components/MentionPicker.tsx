"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "./Avatar";

interface Member { id: number; name: string; avatarId: number | null }

/** Ao digitar @ num campo de texto, busca membros da plataforma e insere @PrimeiroNome. */
export function useMention(value: string, setValue: (v: string) => void) {
  const [q, setQ] = useState<string | null>(null);
  const [list, setList] = useState<Member[]>([]);
  const el = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const start = useRef(0);

  function track(t: HTMLTextAreaElement | HTMLInputElement) {
    el.current = t;
    const pos = t.selectionStart ?? t.value.length;
    const m = /(?:^|\s)@([\p{L}\p{N}_.-]{0,30})$/u.exec(t.value.slice(0, pos));
    if (!m) return setQ(null);
    start.current = pos - m[1].length - 1;
    setQ(m[1]);
  }

  useEffect(() => {
    if (q === null) { setList([]); return; }
    let dead = false;
    const t = setTimeout(async () => {
      const r = await fetch(q.length >= 2 ? `/api/community/dm?q=${encodeURIComponent(q)}` : "/api/community/dm?share=1").then((x) => x.json()).catch(() => null);
      if (!dead) setList((r?.members ?? []).slice(0, 6));
    }, q.length >= 2 ? 200 : 0);
    return () => { dead = true; clearTimeout(t); };
  }, [q]);

  function pick(m: Member) {
    const first = m.name.trim().split(/\s+/)[0].replace(/[^\p{L}\p{N}_.-]/gu, "");
    const caret = el.current?.selectionStart ?? value.length;
    const next = `${value.slice(0, start.current)}@${first} ${value.slice(caret)}`;
    setValue(next);
    setQ(null);
    const t = el.current;
    const at = start.current + first.length + 2;
    setTimeout(() => { t?.focus(); t?.setSelectionRange(at, at); }, 0);
  }

  const picker = q !== null && list.length > 0 ? (
    <ul role="listbox" aria-label="Mencionar membro" className="z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-line bg-panel p-1 shadow-lg">
      {list.map((m) => (
        <li key={m.id}>
          <button type="button" role="option" aria-selected="false" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(m)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-panel-2">
            <Avatar name={m.name} id={m.avatarId} size={32} />
            <span className="min-w-0 flex-1 truncate text-sm text-white">{m.name}</span>
          </button>
        </li>
      ))}
    </ul>
  ) : null;

  return { track, picker };
}
