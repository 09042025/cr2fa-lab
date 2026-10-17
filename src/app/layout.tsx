import type { Metadata } from "next";
import "./globals.css";

const name = process.env.APP_NAME || "CR2FA Lab";

export const metadata: Metadata = {
  title: { default: `${name} | Organize sua carteira em cinco blocos`, template: `%s | ${name}` },
  description:
    "Dados de cripto, DeFi, ações, fundos imobiliários e renda fixa em um só lugar, organizados pelo Protocolo CR2FA: cinco blocos de 20% com diversificação em duas camadas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
