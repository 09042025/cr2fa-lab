import test from "node:test";
import assert from "node:assert/strict";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { ERC20_TRANSFER_TOPIC, formatUnits, quoteUnits, NETWORKS, findNetwork, verifyHashFormat } from "../src/lib/crypto";

test("tópico Transfer do ERC-20 é o keccak256 da assinatura", () => {
  const h = "0x" + bytesToHex(keccak_256(new TextEncoder().encode("Transfer(address,address,uint256)")));
  assert.equal(ERC20_TRANSFER_TOPIC, h);
});

test("formatUnits", () => {
  assert.equal(formatUnits("1500000", 6), "1.500000");
  assert.equal(formatUnits("1", 8), "0.00000001");
});

test("cotação em stablecoin: R$ 29,90 a R$ 5,00 por dólar ≈ 5,98 USDC", () => {
  const usdc = findNetwork("base")!.assets.find((a) => a.symbol === "USDC")!;
  const units = quoteUnits(2990, 5, usdc, 0);
  assert.equal(units, 5_980_000n);
});

test("cauda torna o valor único e nunca fica abaixo do preço", () => {
  const usdc = findNetwork("solana")!.assets.find((a) => a.symbol === "USDC")!;
  assert.ok(quoteUnits(2990, 5, usdc, 1234) > quoteUnits(2990, 5, usdc, 0));
});

test("ETH usa 18 casas sem perder precisão", () => {
  const eth = findNetwork("arbitrum")!.assets.find((a) => a.symbol === "ETH")!;
  const units = quoteUnits(30000, 15000, eth, 0); // R$ 300 a R$ 15.000/ETH = 0,02 ETH
  assert.equal(formatUnits(units, 18).startsWith("0.020000000"), true);
});

test("redes pedidas existem: Bitcoin, Ethereum, L2s e Solana com dólar", () => {
  const ids = NETWORKS.map((n) => n.id);
  for (const id of ["bitcoin", "ethereum", "arbitrum", "base", "polygon", "optimism", "solana"]) assert.ok(ids.includes(id as never), id);
  assert.ok(findNetwork("solana")!.assets.some((a) => a.symbol === "USDC"));
});

test("formato de hash por rede", () => {
  assert.equal(verifyHashFormat(findNetwork("base")!, "0x" + "a".repeat(64)), true);
  assert.equal(verifyHashFormat(findNetwork("base")!, "abc"), false);
  assert.equal(verifyHashFormat(findNetwork("bitcoin")!, "b".repeat(64)), true);
});
