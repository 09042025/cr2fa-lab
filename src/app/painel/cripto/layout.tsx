import { CryptoTabs } from "@/components/CryptoTabs";

export default function CryptoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CryptoTabs />
      {children}
    </>
  );
}
