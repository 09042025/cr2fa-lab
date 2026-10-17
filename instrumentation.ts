export async function register() {
  // Só no servidor Node (o banco SQLite não existe no runtime edge).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureAdmin } = await import("./lib/bootstrap");
    try {
      ensureAdmin();
    } catch (e) {
      console.error("[admin] Falha ao garantir o administrador:", e);
    }
  }
}
