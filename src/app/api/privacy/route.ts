import { json } from "@/lib/http";
import { PRIVACY, PRIVACY_INTRO } from "@/lib/privacy";

/** Política de privacidade em dados (pública, sem login), para a tela nativa do app. */
export async function GET() {
  return json({ intro: PRIVACY_INTRO, blocks: PRIVACY });
}
