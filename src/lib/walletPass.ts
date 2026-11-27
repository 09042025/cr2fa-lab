import { generateKeyPairSync, createPrivateKey, randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { getSetting, setSetting } from "./settings";

/**
 * Passe de acesso à Niza Wallet (Black Diamond).
 * Par de chaves Ed25519 próprio, separado do SESSION_SECRET: a carteira recebe só a chave PÚBLICA.
 * Gerado uma vez e guardado na tabela app_settings (volume da Railway).
 */
const PRIV = "wallet_pass_private_pem";
const PUB = "wallet_pass_public_pem";

export const WALLET_URL = process.env.WALLET_URL || "https://wallet.nizainvest.com.br";

function keys(): { privatePem: string; publicPem: string } {
  let privatePem = getSetting(PRIV);
  let publicPem = getSetting(PUB);
  if (!privatePem || !publicPem) {
    const kp = generateKeyPairSync("ed25519");
    privatePem = kp.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    publicPem = kp.publicKey.export({ type: "spki", format: "pem" }).toString();
    setSetting(PRIV, privatePem);
    setSetting(PUB, publicPem);
  }
  return { privatePem, publicPem };
}

export function walletPublicKey(): string {
  return keys().publicPem;
}

/** Passe de 2 minutos. Sem id, nome ou e-mail do usuário. */
export async function issueWalletPass(): Promise<string> {
  const key = createPrivateKey(keys().privatePem);
  return new SignJWT({ vip: true })
    .setProtectedHeader({ alg: "EdDSA" })
    .setIssuer("nizainvest")
    .setAudience("niza-wallet")
    .setIssuedAt()
    .setExpirationTime("2m")
    .setJti(randomUUID())
    .sign(key);
}
