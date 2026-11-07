import type { MetadataRoute } from "next";

/** Permite instalar o site como app (tela inicial do iPhone e do Android), sem passar pela loja. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NIZA INVEST",
    short_name: "NIZA INVEST",
    description: "Hub de investimentos: carteira, comunidade, cursos e ferramentas.",
    start_url: "/painel",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1a4a",
    theme_color: "#0b1a4a",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
