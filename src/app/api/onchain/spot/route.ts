import { getUser } from "@/lib/auth";
import { getBtcSpot } from "@/lib/spot";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: "Faça login." }, { status: 401 });
  const r = await getBtcSpot();
  if (!r.data) return Response.json({ error: "Preço ao vivo indisponível." }, { status: 503 });
  return Response.json(r.data, { headers: { "cache-control": "no-store" } });
}
