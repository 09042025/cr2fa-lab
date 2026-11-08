import test from "node:test";
import assert from "node:assert/strict";
import { QUESTIONS, recommendedRank, scoreAnswers } from "../src/lib/investor";

const all = (n: number) => QUESTIONS.map(() => n);

test("pontuação define o perfil", () => {
  assert.equal(scoreAnswers(all(0))?.profile, "conservador"); // 10 pontos
  assert.equal(scoreAnswers(all(1))?.profile, "conservador"); // 20 pontos
  assert.equal(scoreAnswers(all(2))?.profile, "moderado"); // 30 pontos
  assert.equal(scoreAnswers(all(3))?.profile, "arrojado"); // 40 pontos
});

test("sem reserva de emergência o perfil não passa de moderado", () => {
  const a = all(3); a[2] = 0;
  const r = scoreAnswers(a)!;
  assert.equal(r.profile, "moderado");
  assert.ok(r.reserveWarning);
});

test("respostas inválidas são recusadas", () => {
  assert.equal(scoreAnswers([0, 1]), null);
  assert.equal(scoreAnswers(all(9)), null);
});

test("playlists recomendadas por perfil", () => {
  assert.equal(recommendedRank("conservador", "Como investir em Renda Fixa"), 0);
  assert.equal(recommendedRank("arrojado", "COMO INVESTIR EM AÇÕES"), 0);
  assert.equal(recommendedRank("arrojado", "Como investir em Criptomoedas"), 1);
  assert.equal(recommendedRank("conservador", "Como investir em Criptomoedas"), -1);
  assert.equal(recommendedRank(null, "Ações"), -1);
});
