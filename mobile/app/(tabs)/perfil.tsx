import { useState } from "react";
import { Text, TextInput } from "react-native";
import { send } from "../../src/api";
import { useAuth } from "../../src/auth";
import { C } from "../../src/theme";
import { Card, GoldButton, H2, Muted, Screen } from "../../src/ui";

const dia = (t: number) => new Date(t * 1000).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

export default function Perfil() {
  const { user, isPro, setPlan, signOut } = useAuth();
  const [asking, setAsking] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  async function excluir() {
    const e = await send("/api/account/delete", { password: pw });
    if (e) return setErr(e);
    await signOut();
  }
  return (
    <Screen title="Perfil">
      <Card>
        <H2>{user?.name}</H2>
        <Text style={{ color: isPro ? C.goldSoft : C.muted, fontWeight: "700" }}>
          Plano: {isPro ? "Pró" : "Grátis"}
          {user?.role !== "admin" && isPro && user?.planExpiresAt ? ` · ${user.onTrial ? "teste grátis até" : "ativo até"} ${dia(user.planExpiresAt)}` : ""}
        </Text>
      </Card>
      {__DEV__ && (
        <Card>
          <H2>Modo de teste</H2>
          <Muted>Só aparece em desenvolvimento. Troca o plano na tela, sem mexer na sua conta.</Muted>
          <GoldButton label={isPro ? "Ver como plano Grátis" : "Ver como plano Pró"} ghost onPress={() => setPlan(isPro ? "free" : "pro")} />
        </Card>
      )}
      <GoldButton label="Sair" ghost onPress={signOut} />
      {user?.role !== "admin" && (
        <Card style={{ gap: 10 }}>
          <H2>Excluir minha conta</H2>
          <Muted>Apaga sua conta e tudo ligado a ela (publicações, mensagens, portfólio). Não dá para desfazer. Se você assina o Pró, cancele a assinatura antes.</Muted>
          {!asking ? <GoldButton label="Excluir minha conta" ghost onPress={() => setAsking(true)} /> : (
            <>
              <TextInput value={pw} onChangeText={setPw} secureTextEntry placeholder="Digite sua senha para confirmar" placeholderTextColor={C.muted} style={{ backgroundColor: C.ink, borderColor: C.line, borderWidth: 1, borderRadius: 10, color: C.white, paddingHorizontal: 12, paddingVertical: 10 }} />
              {err && <Text style={{ color: C.down }}>{err}</Text>}
              <GoldButton label="Confirmar exclusão" onPress={excluir} />
              <GoldButton label="Cancelar" ghost onPress={() => { setAsking(false); setPw(""); setErr(null); }} />
            </>
          )}
        </Card>
      )}
    </Screen>
  );
}
