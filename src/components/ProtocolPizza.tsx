import Image from "next/image";
import pizza from "@/assets/protocolo-pizza-limpa.webp";

/** Posições (em % da imagem) do centro de cada texto. O texto é HTML de verdade, então o tradutor do site o traduz. */
const LABELS = [
  { name: "Criptomoedas", x: 33.4, y: 25.6, w: 28 },
  { name: "Reserva para oportunidades", x: 68, y: 25.6, w: 26 },
  { name: "Fundos imobiliários", x: 19.5, y: 58.2, w: 24 },
  { name: "Renda fixa", x: 83, y: 59.4, w: 26 },
  { name: "Ações", x: 50, y: 77.2, w: 26 },
];

export function ProtocolPizza({ className = "", priority = false }: { className?: string; priority?: boolean }) {
  return (
    <div className={`relative ${className}`} style={{ containerType: "inline-size" }}>
      <Image src={pizza} alt="" aria-hidden priority={priority} unoptimized className="w-full" />
      <div role="img" aria-label="Protocolo CR2FA: 20% em cada bloco" className="absolute inset-0">
        {LABELS.map((l) => (
          <div key={l.name} className="absolute -translate-x-1/2 text-center font-bold leading-[1.1] text-white" style={{ left: `${l.x}%`, top: `${l.y}%`, width: `${l.w}%`, textShadow: "0 1px 6px rgba(0,0,0,.55)" }}>
            <div style={{ fontSize: "5.2cqw", fontFamily: "var(--font-sans, system-ui), sans-serif" }}>20%</div>
            <div style={{ fontSize: "3cqw", fontWeight: 600, marginTop: "0.4cqw", overflowWrap: "break-word", hyphens: "none" }}>{l.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
