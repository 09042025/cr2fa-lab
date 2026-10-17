import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/ui";

export const metadata = { title: "Criar conta" };

export default async function RegisterPage() {
  const user = await getUser();
  if (user) redirect("/painel");
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-5">
      <div className="w-full">
        <div className="mb-6 flex justify-center"><Logo size="lg" /></div>
        <div className="card p-6">
          <h1 className="mb-4 font-display text-2xl font-bold text-gold-soft">Criar conta grátis</h1>
          <AuthForm mode="register" />
          <p className="mt-4 text-center text-sm text-muted">
            Já tem conta? <Link href="/entrar" className="text-gold-soft underline">Entrar</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
