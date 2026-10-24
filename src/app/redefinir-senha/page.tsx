import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/ui";
import { isResetTokenValid } from "@/lib/reset";

export const metadata = { title: "Criar nova senha" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const valid = isResetTokenValid(token);
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-5">
      <div className="w-full">
        <div className="mb-6 flex justify-center"><Logo size="lg" /></div>
        <div className="card p-6">
          <h1 className="mb-4 font-display text-2xl font-bold text-gold-soft">Criar nova senha</h1>
          {valid ? (
            <AuthForm mode="reset" token={token} />
          ) : (
            <p className="text-sm text-muted">
              Este link expirou ou já foi usado.{" "}
              <Link href="/esqueci-senha" className="text-gold-soft underline">Peça um novo link</Link>.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
