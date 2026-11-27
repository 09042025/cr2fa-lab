import { requireAdmin } from "@/lib/auth";
import { walletPublicKey } from "@/lib/walletPass";

export const dynamic = "force-dynamic";

/** Mostra a chave PÚBLICA para colar na Vercel (variável VIP_PUBLIC_KEY da Niza Wallet). Não é segredo. */
export async function GET() {
  await requireAdmin();
  return new Response(walletPublicKey(), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
