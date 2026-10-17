import { requireUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/ui";

export const metadata = { title: "Trocar senha" };

export default async function ChangePasswordPage() {
  const user = await requireUser({ allowPasswordChange: true });
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-5">
      <div className="w-full">
        <div className="mb-6 flex justify-center"><Logo size="lg" /></div>
        <div className="card p-6">
          <h1 className="mb-1 font-display text-2xl font-bold text-gold-soft">Trocar senha</h1>
          {user.mustChangePassword && <p className="mb-4 text-sm text-muted">Por segurança, defina uma nova senha antes de continuar.</p>}
          <AuthForm mode="change" />
        </div>
      </div>
    </main>
  );
}
