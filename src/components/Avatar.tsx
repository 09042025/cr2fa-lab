/** Foto de perfil da comunidade; sem foto, mostra as iniciais em dourado. */
export function Avatar({ name, id, size = 36 }: { name: string; id: number | null; size?: number }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (id) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/api/community/image?id=${id}`} alt={`Foto de ${name}`} loading="lazy" style={style} className="shrink-0 rounded-full border border-line object-cover" />;
  }
  return (
    <span aria-hidden style={style} className="flex shrink-0 items-center justify-center rounded-full border border-gold/40 bg-panel-2 font-semibold text-gold-soft">
      {initials}
    </span>
  );
}
