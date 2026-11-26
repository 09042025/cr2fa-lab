import { WfsTabs } from "@/components/WfsTabs";

export default function BlackLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <WfsTabs />
      {children}
    </>
  );
}
