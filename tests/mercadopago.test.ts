import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyWebhookSignature } from "../src/lib/mercadopago";

test("assinatura válida passa e adulterada falha", () => {
  process.env.MERCADOPAGO_WEBHOOK_SECRET = "segredo-de-teste";
  const ts = "1700000000";
  const requestId = "req-123";
  const dataId = "ABC123";
  const v1 = createHmac("sha256", "segredo-de-teste").update(`id:abc123;request-id:${requestId};ts:${ts};`).digest("hex");
  assert.equal(verifyWebhookSignature({ signatureHeader: `ts=${ts},v1=${v1}`, requestId, dataId }), true);
  assert.equal(verifyWebhookSignature({ signatureHeader: `ts=${ts},v1=${"0".repeat(64)}`, requestId, dataId }), false);
  assert.equal(verifyWebhookSignature({ signatureHeader: null, requestId, dataId }), false);
});

test("sem segredo configurado, nada é aceito", () => {
  delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
  assert.equal(verifyWebhookSignature({ signatureHeader: "ts=1,v1=aa", requestId: "x", dataId: "1" }), false);
});
