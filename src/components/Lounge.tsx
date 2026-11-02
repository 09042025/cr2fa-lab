"use client";
import { useState } from "react";

const BASE = "https://meet.jit.si/";
const link = (room: string, name: string) => `${BASE}${room}#userInfo.displayName=${encodeURIComponent(JSON.stringify(name))}&config.prejoinPageEnabled=false`;
const randomRoom = () => "NizaPrivada" + Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 14);

/** Lounge: sala de voz/vídeo com compartilhamento de tela entre membros Premium (Jitsi Meet, abre em nova aba). */
export function Lounge({ room, name }: { room: string; name: string }) {
  const [priv, setPriv] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const open = (r: string) => window.open(link(r, name), "_blank", "noopener,noreferrer");
  async function copy(r: string) {
    try { await navigator.clipboard.writeText(`${BASE}${r}`); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* sem permissão */ }
  }
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-gold/30 bg-gradient-to-br from-panel-2 to-ink p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold/80">Sala aberta dos membros</p>
        <h3 className="mt-1 font-display text-xl font-bold text-white">Lounge</h3>
        <p className="mt-2 text-sm text-muted">Converse por voz ou vídeo com outros membros Premium e compartilhe a tela, direto do navegador, sem instalar nada. Qualquer membro que entrar fica na mesma sala.</p>
        <button type="button" onClick={() => open(room)} className="mt-4 rounded-lg bg-gradient-to-b from-gold-soft to-gold px-5 py-3 text-sm font-bold text-black">Entrar no Lounge</button>
      </section>

      <section className="rounded-xl border border-line p-5">
        <h3 className="font-display text-lg font-bold text-gold-soft">Chamada reservada com um membro</h3>
        <p className="mt-1 text-sm text-muted">Crie uma sala só sua, copie o link e envie para o outro membro em <strong className="text-white">Mensagens</strong>. Só entra quem receber o link.</p>
        {!priv ? (
          <button type="button" onClick={() => setPriv(randomRoom())} className="mt-3 rounded-lg border border-gold/40 px-4 py-2 text-sm font-semibold text-gold-soft hover:bg-gold/10">Criar sala reservada</button>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => open(priv)} className="rounded-lg bg-gradient-to-b from-gold-soft to-gold px-4 py-2 text-sm font-bold text-black">Entrar na minha sala</button>
            <button type="button" onClick={() => copy(priv)} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-white hover:bg-white/5">{copied ? "Link copiado ✓" : "Copiar link para enviar"}</button>
          </div>
        )}
      </section>

      <ul className="space-y-1 text-xs text-muted">
        <li>• Para compartilhar a tela, use o botão <strong className="text-white">Compartilhar tela</strong> dentro da chamada (no celular, depende do navegador).</li>
        <li>• Permita o uso do microfone quando o navegador pedir.</li>
        <li>• Respeite as regras da comunidade. Nada aqui é recomendação de investimento.</li>
      </ul>
    </div>
  );
}
