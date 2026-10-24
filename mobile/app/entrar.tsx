import { useState } from "react";
import { ActivityIndicator, Linking, Text, TextInput, View } from "react-native";
import { useAuth } from "../src/auth";
import { API } from "../src/api";
import { C } from "../src/theme";
import { Card, GoldButton, Muted, Screen } from "../src/ui";

const input = { backgroundColor: C.ink, borderColor: C.line, borderWidth: 1, borderRadius: 10, color: C.white, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 } as const;

export default function Entrar() {
  const { signIn, signInDemo, offline } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function entrar() {
    if (!email.trim() || !senha) return setErro("Digite o e-mail e a senha.");
    setBusy(true); setErro(null);
    const e = await signIn(email, senha);
    if (e) setErro(e);
    setBusy(false);
  }

  return (
    <Screen>
      <View style={{ alignItems: "center", marginTop: 40, marginBottom: 16 }}>
        <Text style={{ color: C.goldSoft, fontSize: 30, fontWeight: "800", letterSpacing: 4 }}>NIZA <Text style={{ color: C.gold }}>INVEST</Text></Text>
        <Muted>Hub de investimentos</Muted>
      </View>
      <Card>
        <Text style={{ color: C.white, fontWeight: "600", fontSize: 16 }}>Entrar</Text>
        <Muted>Use o mesmo e-mail e senha do site.</Muted>
        {offline && <Text style={{ color: C.down }}>Sem conexão para conferir sua conta. Verifique a internet.</Text>}
        <View style={{ gap: 10, marginTop: 8 }}>
          <TextInput style={input} placeholder="E-mail" placeholderTextColor={C.muted} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" value={email} onChangeText={setEmail} />
          <TextInput style={input} placeholder="Senha" placeholderTextColor={C.muted} secureTextEntry autoCapitalize="none" textContentType="password" value={senha} onChangeText={setSenha} onSubmitEditing={entrar} />
          {erro ? <Text style={{ color: C.down }}>{erro}</Text> : null}
          {busy ? <ActivityIndicator color={C.gold} /> : <GoldButton label="Entrar" onPress={entrar} />}
        </View>
      </Card>
      <Card>
        <Muted>Ainda não tem conta? Crie no site e depois volte aqui.</Muted>
        <GoldButton label="Criar conta no site" ghost onPress={() => Linking.openURL(`${API}/cadastrar`)} />
        <GoldButton label="Esqueci minha senha" ghost onPress={() => Linking.openURL(`${API}/esqueci-senha`)} />
      </Card>
      {__DEV__ && (
        <Card>
          <Text style={{ color: C.white, fontWeight: "600" }}>Modo de teste (só aparece no desenvolvimento)</Text>
          <View style={{ gap: 10, marginTop: 6 }}>
            <GoldButton label="Ver como plano Grátis" ghost onPress={() => signInDemo("free")} />
            <GoldButton label="Ver como plano Pró" ghost onPress={() => signInDemo("pro")} />
          </View>
        </Card>
      )}
    </Screen>
  );
}
