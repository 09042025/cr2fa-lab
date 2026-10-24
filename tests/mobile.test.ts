import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { bearerToken, signToken, userFromToken } from "../src/lib/auth";

test("token do app: assina, valida e reconhece o usuário", async () => {
  const id = Number(db().prepare("INSERT INTO users (email, name, password_hash) VALUES ('m1@t.com', 'Maria', 'x')").run().lastInsertRowid);
  const tok = await signToken(id, 3600);
  const u = await userFromToken(tok);
  assert.equal(u?.id, id);
  assert.equal(u?.plan, "free");
  assert.equal(await userFromToken(tok + "x"), null);
  assert.equal(await userFromToken(await signToken(999999)), null); // usuário inexistente
  assert.equal(await userFromToken(await signToken(id, -10)), null); // expirado
});

test("bearerToken lê só o formato Bearer <jwt>", () => {
  const h = (v: string | null) => ({ get: () => v });
  assert.equal(bearerToken(h("Bearer aaa.bbb.ccc")), "aaa.bbb.ccc");
  assert.equal(bearerToken(h("bearer aaa.bbb.ccc")), "aaa.bbb.ccc");
  assert.equal(bearerToken(h("Basic abc")), null);
  assert.equal(bearerToken(h("Bearer solto")), null);
  assert.equal(bearerToken(h(null)), null);
});
