import { getUser, rateLimit } from "@/lib/auth";
import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { getLinkPreview } from "@/lib/linkpreview";

/** Prévia (título, descrição e imagem) de um link colado em publicação ou mensagem. */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (!rateLimit(`preview:${user.id}`, 60, 60_000)) return fail("Muitas consultas. Espere um instante.", 429);
  const url = new URL(req.url).searchParams.get("url") ?? "";
  const preview = await getLinkPreview(url);
  return NextResponse.json({ preview }, { headers: { "cache-control": "private, max-age=3600" } });
}
