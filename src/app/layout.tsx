import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TranslateLoader } from "@/components/TranslateLoader";
import { PwaSplash } from "@/components/PwaSplash";
import { PullToRefresh } from "@/components/PullToRefresh";

const standaloneScript = `try{if(window.navigator.standalone||window.matchMedia("(display-mode: standalone)").matches)document.documentElement.setAttribute("data-standalone","")}catch(e){}`;

const name = process.env.APP_NAME || "NIZA INVEST";

export const viewport: Viewport = { themeColor: "#0b1a4a", width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };

export const metadata: Metadata = {
  title: { default: `${name} | Organize sua carteira em cinco blocos`, template: `%s | ${name}` },
  description:
    "Dados de cripto, DeFi, ações, fundos imobiliários e renda fixa em um só lugar, organizados pelo Protocolo CR2FA: cinco blocos de 20% com diversificação em duas camadas.",
  appleWebApp: { capable: true, title: "NIZA INVEST", statusBarStyle: "black" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: standaloneScript }} />
        <PwaSplash />
        <PullToRefresh />
        {children}
        <TranslateLoader />
      </body>
    </html>
  );
}
