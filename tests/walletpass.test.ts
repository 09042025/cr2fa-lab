import test from "node:test";
import assert from "node:assert/strict";
import { createPublicKey } from "node:crypto";
import { jwtVerify, decodeJwt } from "jose";
import { issueWalletPass, walletPublicKey } from "../src/lib/walletPass";

test("passe da Niza Wallet: assinado em Ed25519, curto e sem dados do usuário", async () => {
  const pass = await issueWalletPass();
  const { payload, protectedHeader } = await jwtVerify(pass, createPublicKey(walletPublicKey()), {
    issuer: "nizainvest",
    audience: "niza-wallet",
  });
  assert.equal(protectedHeader.alg, "EdDSA");
  assert.equal(payload.vip, true);
  assert.ok(payload.exp! - payload.iat! <= 120);
  assert.equal(payload.sub, undefined);
  assert.deepEqual(Object.keys(decodeJwt(pass)).sort(), ["aud", "exp", "iat", "iss", "jti", "vip"]);
});

test("par de chaves é gerado uma vez e reaproveitado", () => {
  assert.equal(walletPublicKey(), walletPublicKey());
  assert.match(walletPublicKey(), /BEGIN PUBLIC KEY/);
});
