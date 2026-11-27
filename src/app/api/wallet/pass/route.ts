import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { hasBlack } from "@/lib/orders";
import { issueWalletPass, WALLET_URL } from "@/lib/walletPass";

export const dynamic = "force-dynamic";

/** "Abrir Niza Wallet": confere o Black Diamond no servidor e manda para a carteira com um passe curto. */
export async function GET(req: Request) {
  const base = new URL(req.url).origin;
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL("/entrar", base), 303);
  if (user.role !== "admin" && !hasBlack(user.id)) return NextResponse.redirect(new URL("/painel/black", base), 303);
  const pass = await issueWalletPass();
  const res = NextResponse.redirect(`${WALLET_URL}/entrar?pass=${encodeURIComponent(pass)}`, 303);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
