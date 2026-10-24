import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/ui";
import { trialDays } from "@/lib/trial";
import { CODE_RE } from "@/lib/invites";

export const metadata = { title: "Criar conta" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ convite?: string }> }) {
  const { convite } = await searchParams;
  const after = convite && CODE_RE.test(convite) ? `/convite/${convite}` : undefined;
  const user = await getUser();
  if (user) redirect(after ?? "/painel");
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-5">
      <div className="w-full">
        <div className="mb-6 flex justify-center"><Logo size="lg" /></div>
        <div className="card p-6">
          <h1 className="mb-4 font-display text-2xl font-bold text-gold-soft">Criar conta grátis</h1>
          <p className="mb-4 rounded-lg border border-gold/60 bg-gold/10 px-3 py-2 text-sm text-gold-soft">
            🎁 Ao criar sua conta você pode ativar <strong>{trialDays()} dias de Pró grátis</strong>, sem cartão. Depois, se não assinar, volta para o plano Grátis, sem cobrança.
          </p>
          <AuthForm mode="register" after={after} />
          <p className="mt-4 text-center text-sm text-muted">
            Já tem conta? <Link href={after ? `/entrar?convite=${convite}` : "/entrar"} className="text-gold-soft underline">Entrar</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
