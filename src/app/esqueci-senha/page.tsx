import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/ui";

export const metadata = { title: "Esqueci minha senha" };

export default async function ForgotPasswordPage() {
  const user = await getUser();
  if (user) redirect("/painel");
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-5">
      <div className="w-full">
        <div className="mb-6 flex justify-center"><Logo size="lg" /></div>
        <div className="card p-6">
          <h1 className="mb-1 font-display text-2xl font-bold text-gold-soft">Esqueci minha senha</h1>
          <p className="mb-4 text-sm text-muted">Informe o e-mail da sua conta. Enviaremos um link para criar uma nova senha.</p>
          <AuthForm mode="forgot" />
          <p className="mt-4 text-center text-sm text-muted">
            <Link href="/entrar" className="text-gold-soft underline">Voltar para entrar</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
