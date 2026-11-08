import { z } from "zod";
import { getUser } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { addLesson, createPlaylist, deleteLesson, deletePlaylist, move, updateLesson, updatePlaylist } from "@/lib/courses";

const lesson = { title: z.string().max(200), description: z.string().max(1000).default(""), url: z.string().max(500).default(""), minutes: z.number().int().min(0).max(600).nullable().default(null), free: z.boolean().default(false) };
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("playlist-add"), title: z.string().max(200), description: z.string().max(500).default("") }),
  z.object({ action: z.literal("playlist-edit"), id: z.number().int().positive(), title: z.string().max(200), description: z.string().max(500).default("") }),
  z.object({ action: z.literal("playlist-delete"), id: z.number().int().positive() }),
  z.object({ action: z.literal("lesson-add"), playlistId: z.number().int().positive(), ...lesson }),
  z.object({ action: z.literal("lesson-edit"), id: z.number().int().positive(), ...lesson }),
  z.object({ action: z.literal("lesson-delete"), id: z.number().int().positive() }),
  z.object({ action: z.literal("move"), kind: z.enum(["lesson", "playlist"]), id: z.number().int().positive(), dir: z.enum(["up", "down"]) }),
]);

/** Gerenciamento da Masterclass: só o administrador cria, edita, apaga e reordena playlists e aulas. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (user.role !== "admin") return fail("Somente o administrador pode gerenciar a Masterclass.", 403);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Confira os dados.");
  const d = parsed.data;
  switch (d.action) {
    case "playlist-add": { const id = createPlaylist(d.title, d.description); return id ? json({ id }, 201) : fail("Dê um nome à playlist."); }
    case "playlist-edit": return updatePlaylist(d.id, d.title, d.description) ? json({ ok: true }) : fail("Não foi possível salvar.");
    case "playlist-delete": return deletePlaylist(d.id) ? json({ ok: true }) : fail("Playlist não encontrada.", 404);
    case "lesson-add": { const r = addLesson(d.playlistId, d); return r.ok ? json({ id: r.id }, 201) : fail(r.error); }
    case "lesson-edit": { const r = updateLesson(d.id, d); return r.ok ? json({ ok: true }) : fail(r.error); }
    case "lesson-delete": return deleteLesson(d.id) ? json({ ok: true }) : fail("Aula não encontrada.", 404);
    case "move": return move(d.kind, d.id, d.dir) ? json({ ok: true }) : json({ ok: true });
  }
}
