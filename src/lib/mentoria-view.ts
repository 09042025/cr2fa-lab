import { enabledNetworks, findNetwork, formatUnits } from "./crypto";
import { now, type OrderRow } from "./db";
import { mercadoPagoEnabled } from "./mercadopago";
import { formatBRL, mentoriaPriceCents } from "./plans";
import type { CryptoOrderView } from "@/components/Checkout";

/** Dados do checkout da mentoria (usados na página da mentoria e em /planos). */
export function mentoriaCheckoutProps(orders: OrderRow[]) {
  const pending: CryptoOrderView[] = orders
    .filter((o) => o.product === "mentoria" && o.method === "crypto" && o.status === "pending" && o.expires_at && o.expires_at > now() && o.crypto_network && o.crypto_amount)
    .map((o) => {
      const net = findNetwork(o.crypto_network!)!;
      const asset = net.assets.find((a) => a.symbol === o.crypto_asset)!;
      return { product: "mentoria", orderId: o.id, network: net.name, asset: asset.symbol, address: o.crypto_address!, amount: formatUnits(o.crypto_amount!, asset.decimals), expiresAt: o.expires_at };
    });
  return { price: formatBRL(mentoriaPriceCents()), mpEnabled: mercadoPagoEnabled(), networks: enabledNetworks().map((n) => ({ id: n.id, name: n.name, assets: n.assets.map((a) => a.symbol) })), pending };
}
