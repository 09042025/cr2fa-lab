import { randomInt } from "node:crypto";
import { db, type OrderRow } from "./db";
import { getSpotBrl } from "./market";
import { createOrder } from "./orders";
import type { Period } from "./plans";

export type NetworkId = "bitcoin" | "ethereum" | "arbitrum" | "base" | "polygon" | "optimism" | "solana";
type Family = "evm" | "solana" | "bitcoin";
type PriceId = "bitcoin" | "ethereum" | "solana" | "usd-coin" | "tether";

export interface AssetDef {
  symbol: string;
  kind: "native" | "token";
  decimals: number;
  /** EVM: endereço do contrato. Solana: mint. */
  contract?: string;
  priceId: PriceId;
}

export interface NetworkDef {
  id: NetworkId;
  name: string;
  family: Family;
  rpcEnv?: string;
  rpcDefault?: string;
  confirmations: number;
  assets: AssetDef[];
}

const ETH: AssetDef = { symbol: "ETH", kind: "native", decimals: 18, priceId: "ethereum" };
const usdc = (contract: string): AssetDef => ({ symbol: "USDC", kind: "token", decimals: 6, contract, priceId: "usd-coin" });
const usdt = (contract: string): AssetDef => ({ symbol: "USDT", kind: "token", decimals: 6, contract, priceId: "tether" });

/**
 * Endereços de contratos das stablecoins. Confira cada um em fontes oficiais
 * (Circle e Tether) antes de colocar em produção.
 */
export const NETWORKS: NetworkDef[] = [
  { id: "bitcoin", name: "Bitcoin", family: "bitcoin", confirmations: 1, assets: [{ symbol: "BTC", kind: "native", decimals: 8, priceId: "bitcoin" }] },
  {
    id: "ethereum", name: "Ethereum", family: "evm", rpcEnv: "RPC_ETHEREUM", rpcDefault: "https://ethereum-rpc.publicnode.com", confirmations: 3,
    assets: [ETH, usdc("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"), usdt("0xdAC17F958D2ee523a2206206994597C13D831ec7")],
  },
  {
    id: "arbitrum", name: "Arbitrum", family: "evm", rpcEnv: "RPC_ARBITRUM", rpcDefault: "https://arbitrum-one-rpc.publicnode.com", confirmations: 5,
    assets: [ETH, usdc("0xaf88d065e77c8cC2239327C5EDb3A432268e5831"), usdt("0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9")],
  },
  {
    id: "base", name: "Base", family: "evm", rpcEnv: "RPC_BASE", rpcDefault: "https://base-rpc.publicnode.com", confirmations: 5,
    assets: [ETH, usdc("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913")],
  },
  {
    id: "polygon", name: "Polygon", family: "evm", rpcEnv: "RPC_POLYGON", rpcDefault: "https://polygon-bor-rpc.publicnode.com", confirmations: 20,
    assets: [usdc("0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"), usdt("0xc2132D05D31c914a87C6611C10748AEb04B58e8F")],
  },
  {
    id: "optimism", name: "Optimism", family: "evm", rpcEnv: "RPC_OPTIMISM", rpcDefault: "https://optimism-rpc.publicnode.com", confirmations: 5,
    assets: [ETH, usdc("0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"), usdt("0x94b008aA00579c1307B0EF2c499aD98a8ce58e58")],
  },
  {
    id: "solana", name: "Solana", family: "solana", rpcEnv: "RPC_SOLANA", rpcDefault: "https://api.mainnet-beta.solana.com", confirmations: 1,
    assets: [
      { symbol: "SOL", kind: "native", decimals: 9, priceId: "solana" },
      usdc("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
      usdt("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"),
    ],
  },
];

const EVM_ADDR = /^0x[a-fA-F0-9]{40}$/;
const BTC_ADDR = /^(bc1[a-z0-9]{25,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/;
const SOL_ADDR = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function receivingAddress(net: NetworkDef): string | null {
  const raw =
    net.family === "evm" ? process.env.CRYPTO_EVM_ADDRESS : net.family === "solana" ? process.env.CRYPTO_SOL_ADDRESS : process.env.CRYPTO_BTC_ADDRESS;
  const v = raw?.trim();
  if (!v) return null;
  const re = net.family === "evm" ? EVM_ADDR : net.family === "solana" ? SOL_ADDR : BTC_ADDR;
  return re.test(v) ? v : null;
}

export function enabledNetworks(): NetworkDef[] {
  return NETWORKS.filter((n) => receivingAddress(n) !== null);
}

export function findNetwork(id: string): NetworkDef | undefined {
  return NETWORKS.find((n) => n.id === id);
}

export function formatUnits(raw: string | bigint, decimals: number): string {
  const v = BigInt(raw);
  const base = 10n ** BigInt(decimals);
  const whole = v / base;
  const frac = (v % base).toString().padStart(decimals, "0");
  return `${whole}.${frac}`;
}

/** Calcula a quantidade em unidades mínimas, com uma "cauda" aleatória que torna o valor único por pedido. */
export function quoteUnits(brlCents: number, spotBrl: number, asset: AssetDef, tail: number): bigint {
  const amount = brlCents / 100 / spotBrl; // em unidades da moeda
  if (asset.decimals <= 9) {
    return BigInt(Math.ceil(amount * 10 ** asset.decimals)) + BigInt(tail);
  }
  // 18 decimais: calcula em 1e9 para não perder precisão no double e completa com zeros
  return BigInt(Math.ceil(amount * 1e9)) * 10n ** BigInt(asset.decimals - 9) + BigInt(tail) * 10n ** BigInt(asset.decimals - 9 - 3);
}

function tailFor(asset: AssetDef): number {
  if (asset.symbol === "BTC") return randomInt(1, 900); // sats
  if (asset.symbol === "SOL") return randomInt(1000, 90000); // lamports
  if (asset.kind === "token") return randomInt(1, 9000); // até US$ 0,009
  return randomInt(1, 900); // ETH: cauda em 1e-12 ETH
}

export async function createCryptoOrder(params: {
  userId: number;
  period: Period;
  network: string;
  asset: string;
}): Promise<OrderRow> {
  const net = findNetwork(params.network);
  if (!net) throw new Error("Rede inválida.");
  const address = receivingAddress(net);
  if (!address) throw new Error("Esta rede não está habilitada.");
  const asset = net.assets.find((a) => a.symbol === params.asset);
  if (!asset) throw new Error("Ativo inválido para esta rede.");

  // Cotação primeiro: se falhar, nenhum pedido órfão é criado.
  const spot = await getSpotBrl(asset.priceId);
  const order = createOrder({ userId: params.userId, period: params.period, method: "crypto", expiresInSec: 30 * 60 });

  const taken = new Set(
    (
      db()
        .prepare("SELECT crypto_amount FROM orders WHERE status = 'pending' AND crypto_network = ? AND crypto_asset = ? AND crypto_amount IS NOT NULL")
        .all(net.id, asset.symbol) as { crypto_amount: string }[]
    ).map((r) => r.crypto_amount),
  );
  let units = 0n;
  for (let i = 0; i < 20; i++) {
    units = quoteUnits(order.amount_cents, spot, asset, tailFor(asset));
    if (!taken.has(units.toString())) break;
  }

  db()
    .prepare("UPDATE orders SET crypto_network = ?, crypto_asset = ?, crypto_amount = ?, crypto_address = ? WHERE id = ?")
    .run(net.id, asset.symbol, units.toString(), address, order.id);
  return db().prepare("SELECT * FROM orders WHERE id = ?").get(order.id) as OrderRow;
}

/* ============================ Verificação on-chain ============================ */

export interface VerifyResult {
  ok: boolean;
  reason?: string;
}

async function rpc<T>(url: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const json = (await res.json()) as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  return json.result as T;
}

/** keccak256("Transfer(address,address,uint256)") */
export const ERC20_TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function pad32(addr: string): string {
  return "0x" + "0".repeat(24) + addr.slice(2).toLowerCase();
}
export function verifyHashFormat(net: NetworkDef, hash: string): boolean {
  if (net.family === "evm") return /^0x[a-fA-F0-9]{64}$/.test(hash);
  if (net.family === "bitcoin") return /^[a-fA-F0-9]{64}$/.test(hash);
  return /^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(hash);
}

export async function verifyCryptoPayment(order: OrderRow, txHash: string): Promise<VerifyResult> {
  if (order.method !== "crypto" || !order.crypto_network || !order.crypto_asset || !order.crypto_amount || !order.crypto_address) {
    return { ok: false, reason: "Pedido inválido." };
  }
  const net = findNetwork(order.crypto_network);
  const asset = net?.assets.find((a) => a.symbol === order.crypto_asset);
  if (!net || !asset) return { ok: false, reason: "Rede ou ativo não suportado." };
  if (!verifyHashFormat(net, txHash)) return { ok: false, reason: "Formato do hash inválido para esta rede." };
  const expected = BigInt(order.crypto_amount);
  try {
    if (net.family === "evm") return await verifyEvm(net, asset, order, txHash, expected);
    if (net.family === "solana") return await verifySolana(net, asset, order, txHash, expected);
    return await verifyBitcoin(order, txHash, expected, net.confirmations);
  } catch (e) {
    return { ok: false, reason: `Não foi possível consultar a rede agora (${e instanceof Error ? e.message : "erro"}). Tente de novo em instantes.` };
  }
}

function rpcUrl(net: NetworkDef): string {
  return (net.rpcEnv && process.env[net.rpcEnv]) || net.rpcDefault || "";
}

interface EvmReceipt {
  status: string;
  blockNumber: string;
  logs: { address: string; topics: string[]; data: string }[];
}

async function verifyEvm(net: NetworkDef, asset: AssetDef, order: OrderRow, txHash: string, expected: bigint): Promise<VerifyResult> {
  const url = rpcUrl(net);
  const receipt = await rpc<EvmReceipt | null>(url, "eth_getTransactionReceipt", [txHash]);
  if (!receipt) return { ok: false, reason: "Transação ainda não encontrada. Aguarde alguns instantes e tente de novo." };
  if (receipt.status !== "0x1") return { ok: false, reason: "A transação falhou na rede." };

  const tip = parseInt(await rpc<string>(url, "eth_blockNumber", []), 16);
  const confirmations = tip - parseInt(receipt.blockNumber, 16) + 1;
  if (confirmations < net.confirmations) {
    return { ok: false, reason: `Aguardando confirmações (${confirmations}/${net.confirmations}).` };
  }

  const block = await rpc<{ timestamp: string }>(url, "eth_getBlockByNumber", [receipt.blockNumber, false]);
  if (parseInt(block.timestamp, 16) < order.created_at - 60) {
    return { ok: false, reason: "Esta transação é anterior à criação do pedido." };
  }

  const to = order.crypto_address!.toLowerCase();
  if (asset.kind === "native") {
    const tx = await rpc<{ to: string | null; value: string } | null>(url, "eth_getTransactionByHash", [txHash]);
    if (!tx || tx.to?.toLowerCase() !== to) return { ok: false, reason: "O destinatário não confere com o endereço do pedido." };
    if (BigInt(tx.value) !== expected) return { ok: false, reason: "O valor enviado não confere com o valor exato do pedido." };
    return { ok: true };
  }

  const match = receipt.logs.find(
    (l) =>
      l.address.toLowerCase() === asset.contract!.toLowerCase() &&
      l.topics[0]?.toLowerCase() === ERC20_TRANSFER_TOPIC &&
      l.topics[2]?.toLowerCase() === pad32(order.crypto_address!) &&
      BigInt(l.data) === expected,
  );
  if (!match) return { ok: false, reason: `Não encontrei uma transferência de ${asset.symbol} com o valor exato para o endereço do pedido.` };
  return { ok: true };
}

interface SolTokenBalance {
  accountIndex: number;
  mint: string;
  owner?: string;
  uiTokenAmount: { amount: string };
}

interface SolTx {
  blockTime: number | null;
  meta: {
    err: unknown;
    preBalances: number[];
    postBalances: number[];
    preTokenBalances?: SolTokenBalance[];
    postTokenBalances?: SolTokenBalance[];
  } | null;
  transaction: { message: { accountKeys: ({ pubkey: string } | string)[] } };
}

async function verifySolana(net: NetworkDef, asset: AssetDef, order: OrderRow, sig: string, expected: bigint): Promise<VerifyResult> {
  const tx = await rpc<SolTx | null>(rpcUrl(net), "getTransaction", [
    sig,
    { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "finalized" },
  ]);
  if (!tx || !tx.meta) return { ok: false, reason: "Transação ainda não finalizada. Aguarde e tente de novo." };
  if (tx.meta.err) return { ok: false, reason: "A transação falhou na rede." };
  if (tx.blockTime && tx.blockTime < order.created_at - 60) return { ok: false, reason: "Esta transação é anterior à criação do pedido." };

  const address = order.crypto_address!;
  if (asset.kind === "native") {
    const keys = tx.transaction.message.accountKeys.map((k) => (typeof k === "string" ? k : k.pubkey));
    const idx = keys.indexOf(address);
    if (idx < 0) return { ok: false, reason: "O endereço do pedido não participa desta transação." };
    const delta = BigInt(tx.meta.postBalances[idx]) - BigInt(tx.meta.preBalances[idx]);
    return delta === expected ? { ok: true } : { ok: false, reason: "O valor recebido não confere com o valor exato do pedido." };
  }

  const sum = (list: SolTokenBalance[] | undefined) =>
    (list || []).filter((b) => b.owner === address && b.mint === asset.contract).reduce((acc, b) => acc + BigInt(b.uiTokenAmount.amount), 0n);
  const delta = sum(tx.meta.postTokenBalances) - sum(tx.meta.preTokenBalances);
  return delta === expected ? { ok: true } : { ok: false, reason: `Não encontrei ${asset.symbol} com o valor exato recebido no endereço do pedido.` };
}

interface BtcTx {
  status: { confirmed: boolean; block_height?: number; block_time?: number };
  vout: { scriptpubkey_address?: string; value: number }[];
}

async function verifyBitcoin(order: OrderRow, txid: string, expected: bigint, minConfirmations: number): Promise<VerifyResult> {
  const api = (process.env.BTC_API || "https://mempool.space/api").replace(/\/$/, "");
  const get = async <T>(p: string): Promise<T> => {
    const res = await fetch(`${api}${p}`, { signal: AbortSignal.timeout(15000) });
    if (res.status === 404) throw new Error("não encontrada");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  };
  let tx: BtcTx;
  try {
    tx = await get<BtcTx>(`/tx/${txid}`);
  } catch (e) {
    if (e instanceof Error && e.message === "não encontrada") return { ok: false, reason: "Transação não encontrada ainda. Aguarde e tente de novo." };
    throw e;
  }
  if (!tx.status.confirmed || tx.status.block_height === undefined) return { ok: false, reason: "Aguardando a primeira confirmação na rede Bitcoin." };
  const tip = Number(await (await fetch(`${api}/blocks/tip/height`, { signal: AbortSignal.timeout(15000) })).text());
  if (tip - tx.status.block_height + 1 < minConfirmations) return { ok: false, reason: "Aguardando confirmações." };
  if (tx.status.block_time && tx.status.block_time < order.created_at - 60) return { ok: false, reason: "Esta transação é anterior à criação do pedido." };

  const received = tx.vout.filter((o) => o.scriptpubkey_address === order.crypto_address).reduce((a, o) => a + BigInt(o.value), 0n);
  return received === expected ? { ok: true } : { ok: false, reason: "O valor recebido não confere com o valor exato do pedido." };
}

