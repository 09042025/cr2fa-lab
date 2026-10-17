import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/ui";

export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  const user = await getUser();
  if (user) redirect(user.mustChangePassword ? "/trocar-senha" : "/painel");
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-5">
      <div className="w-full">
        <div className="mb-6 flex justify-center"><Logo size="lg" /></div>
        <div className="card p-6">
          <h1 className="mb-4 font-display text-2xl font-bold text-gold-soft">Entrar</h1>
          <AuthForm mode="login" />
          <p className="mt-4 text-center text-sm text-muted">
            Ainda não tem conta? <Link href="/cadastrar" className="text-gold-soft underline">Criar conta grátis</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
