"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lista que o administrador reordena arrastando a alça (⠿) para cima ou para baixo.
 * Funciona com o dedo (celular) e com o mouse. Ao soltar, devolve a nova ordem de ids.
 */
export function SortableList<T extends { id: number }>({ items, render, onReorder, gap = 12 }: {
  items: T[];
  render: (item: T, handle: React.ReactNode, dragging: boolean) => React.ReactNode;
  onReorder: (ids: number[]) => void;
  gap?: number;
}) {
  const [order, setOrder] = useState<T[]>(items);
  const [drag, setDrag] = useState<{ id: number; dy: number; target: number } | null>(null);
  const els = useRef<Map<number, HTMLLIElement>>(new Map());
  const st = useRef<{ id: number; startY: number; idx: number; rects: { top: number; h: number }[] } | null>(null);

  useEffect(() => { if (!st.current) setOrder(items); }, [items]);

  function down(e: React.PointerEvent, id: number) {
    e.preventDefault();
    const idx = order.findIndex((x) => x.id === id);
    const rects = order.map((x) => { const r = els.current.get(x.id)!.getBoundingClientRect(); return { top: r.top + window.scrollY, h: r.height }; });
    st.current = { id, startY: e.pageY, idx, rects };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ id, dy: 0, target: idx });
  }
  function move(e: React.PointerEvent) {
    const s = st.current; if (!s) return;
    if (e.clientY < 90) window.scrollBy(0, -14); else if (e.clientY > window.innerHeight - 90) window.scrollBy(0, 14);
    const dy = e.pageY - s.startY;
    const me = s.rects[s.idx];
    const center = me.top + me.h / 2 + dy;
    let target = 0;
    s.rects.forEach((r, j) => { if (j !== s.idx && r.top + r.h / 2 < center) target++; });
    setDrag({ id: s.id, dy, target });
  }
  function up() {
    const s = st.current; if (!s) return;
    const target = drag?.target ?? s.idx;
    st.current = null;
    setDrag(null);
    if (target === s.idx) return;
    const next = order.slice();
    const [m] = next.splice(s.idx, 1);
    next.splice(target, 0, m);
    setOrder(next);
    onReorder(next.map((x) => x.id));
  }

  const s = st.current;
  return (
    <ul style={{ display: "flex", flexDirection: "column", gap }}>
      {order.map((it, j) => {
        let ty = 0;
        const dragging = !!drag && drag.id === it.id;
        if (drag && s) {
          const hd = s.rects[s.idx].h + gap;
          if (dragging) ty = drag.dy;
          else if (j < s.idx && j >= drag.target) ty = hd;
          else if (j > s.idx && j <= drag.target) ty = -hd;
        }
        const handle = (
          <button type="button" aria-label="Arrastar para mudar a ordem" onPointerDown={(e) => down(e, it.id)} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
            className="flex h-9 w-9 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded-lg border border-line text-lg leading-none text-muted active:cursor-grabbing">⠿</button>
        );
        return (
          <li key={it.id} ref={(el) => { if (el) els.current.set(it.id, el); else els.current.delete(it.id); }}
            style={{ transform: `translateY(${ty}px)`, transition: dragging ? "none" : "transform 150ms ease", position: "relative", zIndex: dragging ? 20 : 0, boxShadow: dragging ? "0 10px 24px rgba(0,0,0,0.5)" : undefined, borderRadius: 16 }}>
            {render(it, handle, dragging)}
          </li>
        );
      })}
    </ul>
  );
}
