import { db } from "./db";

export type Profile = "conservador" | "moderado" | "arrojado";

export interface Question { q: string; options: string[] }

/** 10 perguntas, 4 respostas cada (da mais cautelosa, 1 ponto, à mais agressiva, 4 pontos). */
export const QUESTIONS: Question[] = [
  { q: "Qual é o seu principal objetivo ao investir?", options: ["Preservar o meu patrimônio", "Ter uma renda estável", "Fazer o patrimônio crescer no médio e longo prazo", "Multiplicar o capital, aceitando oscilações fortes"] },
  { q: "Por quanto tempo você pretende deixar o dinheiro investido?", options: ["Menos de 1 ano", "De 1 a 3 anos", "De 3 a 10 anos", "Mais de 10 anos"] },
  { q: "Você tem reserva de emergência?", options: ["Não tenho", "Tenho menos de 3 meses de despesas", "Tenho de 3 a 6 meses de despesas", "Tenho mais de 6 meses de despesas"] },
  { q: "Quanto você vai depender desse dinheiro?", options: ["Vou precisar dele em breve", "Parte dele será usada em alguns anos", "É poupança para o longo prazo", "É um dinheiro que posso deixar parado por muito tempo"] },
  { q: "Seus investimentos caem 20% em um mês. O que você faz?", options: ["Vendo tudo para não perder mais", "Vendo uma parte", "Mantenho e espero a recuperação", "Aproveito para comprar mais"] },
  { q: "Qual é a sua experiência com investimentos?", options: ["Só poupança", "Renda fixa (CDB, Tesouro)", "Ações e fundos imobiliários", "Ações, fundos imobiliários e cripto"] },
  { q: "Quanto do seu patrimônio você aceitaria colocar em ativos de risco (ações, FIIs, cripto)?", options: ["Nada", "Até 20%", "De 20% a 50%", "Mais de 50%"] },
  { q: "Como você descreve o seu conhecimento sobre investimentos?", options: ["Estou começando", "Entendo o básico", "Acompanho e analiso os ativos", "Analiso com método e acompanho de perto"] },
  { q: "O que você pensa sobre criptomoedas e DeFi?", options: ["Prefiro não ter", "Tenho curiosidade, só uma parcela pequena", "Já tenho Bitcoin como parte da carteira", "Cripto e DeFi são uma parte relevante da minha carteira"] },
  { q: "Entre retorno e risco, qual frase combina mais com você?", options: ["Prefiro ganhar menos e não perder", "Aceito pequenas perdas por um retorno melhor", "Aceito perdas relevantes por um retorno maior", "Aceito grandes perdas na busca por retornos altos"] },
];

export interface Result { profile: Profile; score: number; reserveWarning: boolean }

/** Soma os pontos (10 a 40). Até 21 = conservador, de 22 a 31 = moderado, 32 ou mais = arrojado. Sem reserva de emergência, o perfil nunca passa de moderado. */
export function scoreAnswers(answers: number[]): Result | null {
  if (answers.length !== QUESTIONS.length) return null;
  if (answers.some((a, i) => !Number.isInteger(a) || a < 0 || a >= QUESTIONS[i].options.length)) return null;
  const score = answers.reduce((s, a) => s + a + 1, 0);
  let profile: Profile = score <= 21 ? "conservador" : score <= 31 ? "moderado" : "arrojado";
  const reserveWarning = answers[2] === 0;
  if (reserveWarning && profile === "arrojado") profile = "moderado";
  return { profile, score, reserveWarning };
}

export const PROFILE_INFO: Record<Profile, { label: string; summary: string; cr2fa: string; focus: string[] }> = {
  conservador: {
    label: "Conservador",
    summary: "Você valoriza segurança e previsibilidade, e se incomoda com perdas. Isso é um ponto forte: a base da sua carteira tende a ser renda fixa e reserva de emergência.",
    cr2fa: "O CR2FA divide a carteira em cinco blocos de 20%, e parte deles é de renda variável e cripto, que oscilam bastante. Pode ser mais agressivo do que você aceita hoje. Estude o protocolo antes de aplicar e comece pelos blocos de menor risco.",
    focus: ["Renda fixa", "Fundos imobiliários"],
  },
  moderado: {
    label: "Moderado",
    summary: "Você busca equilíbrio: aceita alguma oscilação em troca de retorno melhor, mas não quer correr riscos exagerados.",
    cr2fa: "O CR2FA pode combinar com você, com atenção ao tamanho das posições mais voláteis (cripto e DeFi) e à sua reserva de emergência. Os blocos de renda fixa e fundos imobiliários ajudam a dar estabilidade.",
    focus: ["Fundos imobiliários", "Ações", "Renda fixa"],
  },
  arrojado: {
    label: "Arrojado",
    summary: "Você aceita oscilações fortes em busca de retornos maiores e tem prazo longo para esperar. Disciplina é o que mais importa para esse perfil.",
    cr2fa: "O CR2FA tende a combinar com o seu perfil. Mesmo assim, quedas de 30% a 50% em cripto e ações podem acontecer. Mantenha o rebalanceamento e nunca invista o dinheiro de que vai precisar.",
    focus: ["Ações", "Cripto", "DeFi"],
  },
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const TAGS: Record<string, RegExp> = {
  "Renda fixa": /renda fixa|tesouro|cdb/,
  "Fundos imobiliários": /fii|fundos? imobiliari/,
  "Ações": /acoes|acao\b/,
  "Cripto": /cripto|bitcoin/,
  "DeFi": /defi|stable|onchain|on chain/,
};

/** Posição (0 = primeira) da playlist entre as recomendadas para o perfil, ou -1 se não for destaque. */
export function recommendedRank(profile: Profile | null, playlistTitle: string): number {
  if (!profile) return -1;
  const t = norm(playlistTitle);
  return PROFILE_INFO[profile].focus.findIndex((f) => TAGS[f]?.test(t));
}

export interface Saved extends Result { updatedAt: number }

export function getProfile(userId: number): Saved | null {
  const r = db().prepare("SELECT profile, score, reserve_warning rw, updated_at updatedAt FROM investor_profiles WHERE user_id = ?").get(userId) as { profile: Profile; score: number; rw: number; updatedAt: number } | undefined;
  return r ? { profile: r.profile, score: r.score, reserveWarning: !!r.rw, updatedAt: r.updatedAt } : null;
}

export function saveProfile(userId: number, answers: number[]): Result | null {
  const res = scoreAnswers(answers);
  if (!res) return null;
  db().prepare(`INSERT INTO investor_profiles (user_id, profile, score, reserve_warning, answers, updated_at) VALUES (?, ?, ?, ?, ?, unixepoch())
    ON CONFLICT(user_id) DO UPDATE SET profile = excluded.profile, score = excluded.score, reserve_warning = excluded.reserve_warning, answers = excluded.answers, updated_at = unixepoch()`)
    .run(userId, res.profile, res.score, res.reserveWarning ? 1 : 0, JSON.stringify(answers));
  return res;
}
