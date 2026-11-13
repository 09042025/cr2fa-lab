"use client";

import { useEffect, useRef, useState } from "react";

interface Spot { id: string; name: string; body: string; isAdmin: boolean; youtube?: boolean }

/** Comentário em destaque sobre a transmissão. Fundo transparente (OBS: Fonte de navegador, 1920x1080). */
export function LiveOverlay({ liveId, keyStr }: { liveId: number; keyStr: string }) {
  const [spot, setSpot] = useState<Spot | null>(null);
  const [leaving, setLeaving] = useState(false);
  const cur = useRef<string | null>(null);

  useEffect(() => {
    let dead = false;
    async function tick() {
      const r = await fetch(`/api/community/lives?overlay=1&id=${liveId}&k=${encodeURIComponent(keyStr)}`, { cache: "no-store" }).catch(() => null);
      const d = (await r?.json().catch(() => null)) as { spotlight: Spot | null } | null;
      if (dead || !d) return;
      const next = d.spotlight;
      if ((next?.id ?? null) === cur.current) return;
      cur.current = next?.id ?? null;
      if (next) { setLeaving(false); setSpot(next); }
      else { setLeaving(true); setTimeout(() => { if (cur.current === null) setSpot(null); }, 400); }
    }
    void tick();
    const iv = setInterval(tick, 1500);
    return () => { dead = true; clearInterval(iv); };
  }, [liveId, keyStr]);

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`html,body{background:transparent!important}@keyframes niza-in{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}@keyframes niza-out{from{opacity:1;transform:none}to{opacity:0;transform:translateY(28px)}}`}</style>
      {spot && (
        <div key={spot.id} style={{ position: "absolute", left: "4vw", right: "4vw", bottom: "7vh", animation: `${leaving ? "niza-out" : "niza-in"} .4s ease both` }}>
          <div style={{ display: "inline-block", background: "linear-gradient(180deg,#f3d27a,#d9a520)", color: "#1a1203", fontWeight: 800, fontSize: "2.1vw", padding: ".5vw 1.6vw", borderRadius: "1vw 1vw 0 0", letterSpacing: ".02em" }}>
            {spot.name}{spot.isAdmin ? " · ADMIN" : ""}{spot.youtube ? " · YouTube" : ""}
          </div>
          <div style={{ background: "rgba(11,26,74,.96)", color: "#fff", fontWeight: 600, fontSize: "2.9vw", lineHeight: 1.25, padding: "1.4vw 2vw", borderRadius: "0 1.2vw 1.2vw 1.2vw", border: ".18vw solid #d9a520", boxShadow: "0 .6vw 2vw rgba(0,0,0,.5)", wordBreak: "break-word" }}>
            {spot.body}
          </div>
        </div>
      )}
    </div>
  );
}
