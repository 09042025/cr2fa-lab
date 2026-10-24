import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type Plan = "free" | "pro";
export interface User { name: string; plan: Plan }

interface Auth {
  user: User | null;
  isPro: boolean;
  /** MODO DE TESTE: entra sem senha só para validar as telas. Será trocado pelo login real do site. */
  signInDemo: (plan: Plan) => void;
  setPlan: (plan: Plan) => void;
  signOut: () => void;
}

const Ctx = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const value = useMemo<Auth>(() => ({
    user,
    isPro: user?.plan === "pro",
    signInDemo: (plan) => setUser({ name: plan === "pro" ? "Assinante Pró" : "Usuário Grátis", plan }),
    setPlan: (plan) => setUser((u) => (u ? { ...u, plan } : u)),
    signOut: () => setUser(null),
  }), [user]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): Auth {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth fora do AuthProvider");
  return v;
}
