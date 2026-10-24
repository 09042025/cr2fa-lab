import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clearToken, login as apiLogin, me, type Plan, type User } from "./api";

export type { Plan, User };

interface Auth {
  user: User | null;
  /** Carregando o login guardado no celular. */
  loading: boolean;
  /** Aviso quando não deu para conferir a conta (sem internet). */
  offline: boolean;
  isPro: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  /** MODO DE TESTE (só aparece em desenvolvimento): entra sem senha para conferir as telas. */
  signInDemo: (plan: Plan) => void;
  setPlan: (plan: Plan) => void;
}

const Ctx = createContext<Auth | null>(null);
const demo = (plan: Plan): User => ({ id: 0, name: plan === "pro" ? "Assinante Pró" : "Usuário Grátis", email: "teste@exemplo.com", role: "user", plan, planExpiresAt: null, onTrial: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    me().then((r) => {
      if (r && typeof r === "object") setUser(r.user);
      else if (r === "offline") setOffline(true);
    }).finally(() => setLoading(false));
  }, []);

  const value = useMemo<Auth>(() => ({
    user, loading, offline,
    isPro: user?.plan === "pro" || user?.role === "admin",
    signIn: async (email, password) => {
      const r = await apiLogin(email.trim(), password);
      if ("error" in r) return r.error;
      setUser(r.user);
      setOffline(false);
      return null;
    },
    signOut: async () => { await clearToken(); setUser(null); },
    signInDemo: (plan) => setUser(demo(plan)),
    setPlan: (plan) => setUser((u) => (u ? { ...u, plan } : u)),
  }), [user, loading, offline]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): Auth {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth fora do AuthProvider");
  return v;
}
