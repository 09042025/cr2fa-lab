import { getUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { GROUPS, INDICATORS } from "@/lib/onchain-defs";

/** Lista de indicadores on-chain para o app (Premium). Os dados de cada indicador vêm de /api/onchain/btc. */
export async function GET() {
  const user = await getUser();
  if (!user) return fail("Sessão expirada. Entre de novo.", 401);
  const pro = user.plan === "pro" || user.role === "admin";
  if (!pro) return json({ pro: false });
  return json({ pro: true, groups: GROUPS, indicators: INDICATORS.map((i) => ({ id: i.id, name: i.name, group: i.group, axis: i.axis, scale: i.scale, fmt: i.fmt, lines: i.lines, refs: i.refs ?? [], desc: i.desc })) });
}
