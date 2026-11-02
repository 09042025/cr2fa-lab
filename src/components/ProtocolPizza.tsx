import Image from "next/image";
import pizza from "@/assets/protocolo-pizza-limpa.webp";

/** Posições (em % da imagem) do centro de cada texto. O texto é HTML de verdade, então o tradutor do site o traduz. */
const LABELS = [
  { pct: "20%", name: "Criptomoedas", x: 33.4, y: 28.2, ny: 33.4 },
  { pct: "20%", name: "Reserva para oportunidades", x: 68, y: 27.6, ny: 34.2 },
  { pct: "20%", name: "Fundos imobiliários", x: 20.7, y: 60.2, ny: 67 },
  { pct: "20%", name: "Renda fixa", x: 82, y: 61.5, ny: 66.4 },
  { pct: "20%", name: "Ações", x: 50, y: 80, ny: 85.2 },
];

export function ProtocolPizza({ className = "", priority = false }: { className?: string; priority?: boolean }) {
  return (
    <div className={`relative ${className}`} style={{ containerType: "inline-size" }}>
      <Image src={pizza} alt="" aria-hidden priority={priority} unoptimized className="w-full" />
      <div role="img" aria-label="Protocolo CR2FA: 20% em cada bloco" className="absolute inset-0">
        {LABELS.map((l) => (
          <div key={l.name} className="absolute w-[30%] -translate-x-1/2 text-center font-bold leading-[1.1] text-white" style={{ left: `${l.x}%`, top: `${l.y}%`, textShadow: "0 1px 6px rgba(0,0,0,.55)" }}>
            <div style={{ fontSize: "6.2cqw", fontFamily: "var(--font-sans, system-ui), sans-serif" }}>{l.pct}</div>
            <div style={{ fontSize: "4.1cqw", fontWeight: 600, marginTop: "0.6cqw", overflowWrap: "anywhere" }}>{l.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
