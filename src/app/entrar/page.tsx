import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/ui";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ senha?: string }> }) {
  const { senha } = await searchParams;
  const user = await getUser();
  if (user) redirect(user.mustChangePassword ? "/trocar-senha" : "/painel");
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-5">
      <div className="w-full">
        <div className="mb-6 flex justify-center"><Logo size="lg" /></div>
        <div className="card p-6">
          <h1 className="mb-4 font-display text-2xl font-bold text-gold-soft">Entrar</h1>
          {senha === "redefinida" && (
            <p role="status" className="mb-4 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-gold-soft">Senha alterada. Entre com a nova senha.</p>
          )}
          <AuthForm mode="login" />
          <p className="mt-3 text-center text-sm">
            <Link href="/esqueci-senha" className="text-gold-soft underline">Esqueci minha senha</Link>
          </p>
          <p className="mt-4 text-center text-sm text-muted">
            Ainda não tem conta? <Link href="/cadastrar" className="text-gold-soft underline">Criar conta grátis</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
