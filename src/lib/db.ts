import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const globalForDb = globalThis as unknown as { __db?: Database.Database };

function open(): Database.Database {
  const file = process.env.DATABASE_PATH || "./data/cr2fa.db";
  if (file !== ":memory:") fs.mkdirSync(/* turbopackIgnore: true */ path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
      plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro')),
      plan_expires_at INTEGER,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      period TEXT NOT NULL CHECK (period IN ('monthly','yearly')),
      amount_cents INTEGER NOT NULL,
      method TEXT NOT NULL CHECK (method IN ('mercadopago','crypto')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','expired')),
      provider_ref TEXT,
      crypto_network TEXT,
      crypto_asset TEXT,
      crypto_amount TEXT,
      crypto_address TEXT,
      tx_hash TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      expires_at INTEGER,
      paid_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_tx ON orders(tx_hash) WHERE tx_hash IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_provider ON orders(provider_ref) WHERE provider_ref IS NOT NULL;

    CREATE TABLE IF NOT EXISTS holdings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      block TEXT NOT NULL CHECK (block IN ('cripto','fiis','acoes','renda_fixa','oportunidades')),
      label TEXT NOT NULL,
      value_cents INTEGER NOT NULL CHECK (value_cents >= 0),
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_holdings_user ON holdings(user_id);

    -- Links de recuperação de senha. Guardamos só o hash do token (SHA-256); o token puro vai apenas por e-mail.
    CREATE TABLE IF NOT EXISTS password_resets (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      used_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_resets_user ON password_resets(user_id);

    -- Mensagens da Comunidade (canais fixos definidos em src/lib/community.ts).
    CREATE TABLE IF NOT EXISTS community_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_community_channel ON community_messages(channel, id);

    -- Convites VIP: link de uso único que libera o Pró por um período, criado pelo administrador.
    CREATE TABLE IF NOT EXISTS vip_invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      email TEXT COLLATE NOCASE,
      note TEXT NOT NULL DEFAULT '',
      days INTEGER NOT NULL CHECK (days BETWEEN 1 AND 3660),
      expires_at INTEGER NOT NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      revoked_at INTEGER,
      redeemed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      redeemed_at INTEGER,
      emailed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      fetched_at INTEGER NOT NULL
    );
  `);
  // Origem da posição: 'manual' (digitada) ou 'b3' (importada da planilha da B3). Bancos antigos ganham a coluna aqui.
  const cols = db.prepare("PRAGMA table_info(holdings)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "source")) db.exec("ALTER TABLE holdings ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'");
  // Controle dos lembretes de renovação: para qual vencimento já avisamos e em que etapa (1 = 7 dias antes, 2 = 1 dia antes).
  const userCols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!userCols.some((c) => c.name === "reminder_expiry")) db.exec("ALTER TABLE users ADD COLUMN reminder_expiry INTEGER");
  if (!userCols.some((c) => c.name === "reminder_stage")) db.exec("ALTER TABLE users ADD COLUMN reminder_stage INTEGER NOT NULL DEFAULT 0");
  // Teste grátis do Pró: guarda quando ele termina. Preenchido = o teste já foi usado (cada conta tem direito a um).
  if (!userCols.some((c) => c.name === "trial_ends_at")) db.exec("ALTER TABLE users ADD COLUMN trial_ends_at INTEGER");
  // Comunidade: membro banido não escreve (só o administrador altera).
  if (!userCols.some((c) => c.name === "community_banned")) db.exec("ALTER TABLE users ADD COLUMN community_banned INTEGER NOT NULL DEFAULT 0");
  // Comunidade: resposta a outra mensagem e imagem anexada (guardada no próprio banco).
  const msgCols = db.prepare("PRAGMA table_info(community_messages)").all() as { name: string }[];
  if (!msgCols.some((c) => c.name === "reply_to")) db.exec("ALTER TABLE community_messages ADD COLUMN reply_to INTEGER");
  if (!msgCols.some((c) => c.name === "image_id")) db.exec("ALTER TABLE community_messages ADD COLUMN image_id INTEGER");
  // Perfil público na comunidade: foto (id em community_images) e bio.
  if (!userCols.some((c) => c.name === "avatar_id")) db.exec("ALTER TABLE users ADD COLUMN avatar_id INTEGER");
  if (!userCols.some((c) => c.name === "bio")) db.exec("ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT ''");
  // Perfil estilo rede social: @usuário único, capa, localização e um link.
  if (!userCols.some((c) => c.name === "handle")) db.exec("ALTER TABLE users ADD COLUMN handle TEXT");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_handle ON users(handle) WHERE handle IS NOT NULL");
  if (!userCols.some((c) => c.name === "pinned_post_id")) db.exec("ALTER TABLE users ADD COLUMN pinned_post_id INTEGER");
  if (!userCols.some((c) => c.name === "banner_id")) db.exec("ALTER TABLE users ADD COLUMN banner_id INTEGER");
  if (!userCols.some((c) => c.name === "location")) db.exec("ALTER TABLE users ADD COLUMN location TEXT NOT NULL DEFAULT ''");
  if (!userCols.some((c) => c.name === "website")) db.exec("ALTER TABLE users ADD COLUMN website TEXT NOT NULL DEFAULT ''");
  db.exec(`
    CREATE TABLE IF NOT EXISTS community_follows (
      follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      followed_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (follower_id, followed_id)
    );
    -- Feed de publicações (estilo rede social), com curtidas, comentários e denúncias.
    CREATE TABLE IF NOT EXISTS community_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      topic TEXT NOT NULL DEFAULT 'geral',
      body TEXT NOT NULL,
      image_id INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_posts_id ON community_posts(id);
    CREATE TABLE IF NOT EXISTS community_post_likes (
      post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (post_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS post_reposts (
      post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (post_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS post_bookmarks (
      post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (post_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS post_views (
      post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (post_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS community_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_comments_post ON community_comments(post_id, id);
    CREATE TABLE IF NOT EXISTS community_post_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
      reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE (post_id, reporter_id)
    );
  `);
  if (!msgCols.some((c) => c.name === "audio_id")) db.exec("ALTER TABLE community_messages ADD COLUMN audio_id INTEGER");
  db.exec(`
    CREATE TABLE IF NOT EXISTS community_audios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mime TEXT NOT NULL,
      data BLOB NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
  if (!msgCols.some((c) => c.name === "edited_at")) db.exec("ALTER TABLE community_messages ADD COLUMN edited_at INTEGER");
  db.exec(`
    -- Denúncias de mensagens (a moderação vê no canal moderator-only) e bloqueios entre membros.
    CREATE TABLE IF NOT EXISTS community_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL REFERENCES community_messages(id) ON DELETE CASCADE,
      reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE (message_id, reporter_id)
    );
    CREATE TABLE IF NOT EXISTS community_blocks (
      blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (blocker_id, blocked_id)
    );
    CREATE TABLE IF NOT EXISTS community_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mime TEXT NOT NULL,
      data BLOB NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS community_reactions (
      message_id INTEGER NOT NULL REFERENCES community_messages(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      emoji TEXT NOT NULL,
      PRIMARY KEY (message_id, user_id, emoji)
    );
  `);

  // Mensagens diretas (estilo WhatsApp): imagens e áudios enviados numa conversa ficam marcados como privados
  // e só quem participa da conversa consegue abri-los.
  for (const t of ["community_images", "community_audios"]) {
    const c = db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[];
    if (!c.some((x) => x.name === "private")) db.exec(`ALTER TABLE ${t} ADD COLUMN private INTEGER NOT NULL DEFAULT 0`);
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS dm_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL DEFAULT '',
      image_id INTEGER,
      audio_id INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      read_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_dm_pair ON dm_messages(sender_id, recipient_id, id);
    CREATE INDEX IF NOT EXISTS idx_dm_recipient ON dm_messages(recipient_id, read_at);
    CREATE TABLE IF NOT EXISTS stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      image_id INTEGER NOT NULL,
      caption TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_stories_created ON stories(created_at);
    CREATE TABLE IF NOT EXISTS community_videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mime TEXT NOT NULL,
      data BLOB NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS open_lives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      platform TEXT NOT NULL,
      embed TEXT,
      started_at INTEGER NOT NULL DEFAULT (unixepoch()),
      ended_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_open_lives_active ON open_lives(ended_at, started_at);
    CREATE TABLE IF NOT EXISTS open_live_chat (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      live_id INTEGER NOT NULL REFERENCES open_lives(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_open_live_chat ON open_live_chat(live_id, id);
    CREATE TABLE IF NOT EXISTS story_views (
      story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      viewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      viewed_at INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (story_id, viewer_id)
    );
  `);
  // Stories em vídeo: a imagem do story vira a capa e o vídeo fica em community_videos.
  const storyCols = db.prepare("PRAGMA table_info(stories)").all() as { name: string }[];
  if (!storyCols.some((c) => c.name === "video_id")) db.exec("ALTER TABLE stories ADD COLUMN video_id INTEGER");
}

export function db(): Database.Database {
  if (!globalForDb.__db) globalForDb.__db = open();
  return globalForDb.__db;
}

export type Role = "user" | "admin";
export type PlanName = "free" | "pro";

export interface UserRow {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  role: Role;
  plan: PlanName;
  plan_expires_at: number | null;
  must_change_password: number;
  created_at: number;
  reminder_expiry: number | null;
  reminder_stage: number;
  trial_ends_at: number | null;
}

export interface OrderRow {
  id: string;
  user_id: number;
  period: "monthly" | "yearly";
  amount_cents: number;
  method: "mercadopago" | "crypto";
  status: "pending" | "paid" | "expired";
  provider_ref: string | null;
  crypto_network: string | null;
  crypto_asset: string | null;
  crypto_amount: string | null;
  crypto_address: string | null;
  tx_hash: string | null;
  created_at: number;
  expires_at: number | null;
  paid_at: number | null;
}

export function now(): number {
  return Math.floor(Date.now() / 1000);
}

/** Plano efetivo: Pro só vale enquanto não expirou. Admin sempre tem acesso Pro. */
export function effectivePlan(u: Pick<UserRow, "plan" | "plan_expires_at" | "role">): PlanName {
  if (u.role === "admin") return "pro";
  if (u.plan === "pro" && (u.plan_expires_at === null || u.plan_expires_at > now())) return "pro";
  return "free";
}
