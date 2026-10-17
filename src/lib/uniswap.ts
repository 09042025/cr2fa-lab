import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

/**
 * Endereço do contrato de um pool da Uniswap, calculado offline (CREATE2),
 * para abrir a página do pool no app oficial. Não depende de nenhuma consulta de rede.
 */

const V3_FACTORY: Record<string, string> = {
  Ethereum: "1F98431c8aD98523631AE4a59f267346ea31F984",
  Arbitrum: "1F98431c8aD98523631AE4a59f267346ea31F984",
  Optimism: "1F98431c8aD98523631AE4a59f267346ea31F984",
  Polygon: "1F98431c8aD98523631AE4a59f267346ea31F984",
  Base: "33128a8fC17869897dcE68Ed026d694621f6FDfD",
};
const V3_INIT_HASH = "e34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54";
const V2_FACTORY = "5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"; // só Ethereum
const V2_INIT_HASH = "96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f";

const ZERO = "0x0000000000000000000000000000000000000000";

const word = (hexNo0x: string) => hexToBytes(hexNo0x.toLowerCase().padStart(64, "0"));
const cat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};

/** Formato EIP-55 (maiúsculas e minúsculas conferem o endereço). */
export function checksumAddress(addr: string): string {
  const lower = addr.toLowerCase().replace(/^0x/, "");
  const hash = bytesToHex(keccak_256(new TextEncoder().encode(lower)));
  let out = "0x";
  for (let i = 0; i < lower.length; i++) out += parseInt(hash[i], 16) >= 8 ? lower[i].toUpperCase() : lower[i];
  return out;
}

function sorted(a: string, b: string): [string, string] | null {
  const x = a.toLowerCase().replace(/^0x/, "");
  const y = b.toLowerCase().replace(/^0x/, "");
  if (x === y || a === ZERO || b === ZERO) return null;
  return x < y ? [x, y] : [y, x];
}

function create2(factory: string, salt: Uint8Array, initHash: string): string {
  const h = keccak_256(cat(hexToBytes("ff"), hexToBytes(factory.toLowerCase()), salt, hexToBytes(initHash)));
  return checksumAddress("0x" + bytesToHex(h.slice(12)));
}

/** Pool v3 (token, token, taxa em centésimos de ponto-base). Devolve null se a rede não for suportada. */
export function uniswapV3Pool(chain: string, tokenA: string, tokenB: string, fee: number): string | null {
  const factory = V3_FACTORY[chain];
  const pair = sorted(tokenA, tokenB);
  if (!factory || !pair || !Number.isInteger(fee) || fee <= 0 || fee > 0xffffff) return null;
  const salt = keccak_256(cat(word(pair[0]), word(pair[1]), word(fee.toString(16))));
  return create2(factory, salt, V3_INIT_HASH);
}

/** Par v2 na Ethereum. */
export function uniswapV2Pair(chain: string, tokenA: string, tokenB: string): string | null {
  const pair = sorted(tokenA, tokenB);
  if (chain !== "Ethereum" || !pair) return null;
  const salt = keccak_256(cat(hexToBytes(pair[0]), hexToBytes(pair[1])));
  return create2(V2_FACTORY, salt, V2_INIT_HASH);
}
