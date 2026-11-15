import Link from "next/link";

function BR() {
  return (
    <svg viewBox="0 0 30 21" width="30" height="21" aria-hidden className="rounded-[3px]"><rect width="30" height="21" fill="#009c3b" /><path d="M15 2.5 27 10.5 15 18.5 3 10.5z" fill="#ffdf00" /><circle cx="15" cy="10.5" r="4.6" fill="#002776" /><path d="M10.6 9.6c3-.9 6.2-.4 8.8 1.3" stroke="#fff" strokeWidth=".9" fill="none" /></svg>
  );
}
function US() {
  return (
    <svg viewBox="0 0 30 21" width="30" height="21" aria-hidden className="rounded-[3px]"><rect width="30" height="21" fill="#fff" />{[0, 2, 4, 6, 8, 10, 12].map((i) => <rect key={i} y={i * 1.615} width="30" height="1.615" fill="#b22234" />)}<rect width="13" height="11.3" fill="#3c3b6e" />{[[2, 2], [5, 2], [8, 2], [11, 2], [3.5, 4.4], [6.5, 4.4], [9.5, 4.4], [2, 6.8], [5, 6.8], [8, 6.8], [11, 6.8], [3.5, 9.2], [6.5, 9.2], [9.5, 9.2]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r=".55" fill="#fff" />)}</svg>
  );
}

/** Escolha do mercado só pela bandeira: Brasil ou Estados Unidos. */
export function CountryTabs({ path, pais }: { path: string; pais: "br" | "us" }) {
  const cls = (on: boolean) => `inline-flex items-center rounded-lg border-2 p-1.5 transition ${on ? "border-gold bg-gold/10 shadow-[0_0_10px_rgba(212,168,47,.35)]" : "border-line opacity-60 hover:opacity-100"}`;
  return (
    <div className="mb-3 flex gap-2">
      <Link href={path} aria-label="Brasil" title="Brasil" className={cls(pais === "br")}><BR /></Link>
      <Link href={`${path}?pais=us`} aria-label="Estados Unidos" title="Estados Unidos" className={cls(pais === "us")}><US /></Link>
    </div>
  );
}
