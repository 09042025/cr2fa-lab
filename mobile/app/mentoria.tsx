import { Linking, Text, View } from "react-native";
import { API } from "../src/api";
import { C } from "../src/theme";
import { useApi } from "../src/useApi";
import { Card, GoldButton, H2, Muted, Screen, Status } from "../src/ui";

interface Data { price: string; sessions: number; spots: { left: number; limit: number; turma: number; full: boolean }; mine: { id: number; createdAt: number; sessionsDone: number }[] }

const TOPICS = [
  { t: "Sua carteira frente ao Protocolo CR2FA", items: ["Avaliação da situação atual da sua carteira em relação ao Protocolo CR2FA", "Riscos envolvidos na carteira que você tem hoje", "Ajuda na composição da carteira, sempre sem indicar ativos: a decisão do que comprar e o risco são totalmente seus"] },
  { t: "Criptomoedas do zero, na prática", items: ["Cadastro em uma corretora e verificação da conta", "Do Pix até a primeira fração de Bitcoin", "Primeira carteira (hot wallet), as 12/24 palavras e como guardá-las com segurança", "Como transferir ativos para a sua carteira (autocustódia)"] },
  { t: "Pools de liquidez (só o racional)", items: ["Como funcionam, sem recomendar nenhum ativo", "Riscos de Impermanent Loss e de desvalorização dos ativos", "Riscos de hacks e os cuidados para minimizá-los"] },
  { t: "Mercado tradicional (opcional)", items: ["Se você preferir, o básico de ações, FIIs, Tesouro, CDB, LCI e LCA", "O foco da mentoria continua sendo criptomoedas"] },
];
const dia = (t: number) => new Date(t * 1000).toLocaleDateString("pt-BR");

export default function Mentoria() {
  const { data, error, loading, reload } = useApi<Data>("/api/mobile/mentoria");
  return (
    <Screen title="Mentoria com Niza" subtitle="Acompanhamento individual e personalizado, com foco em criptomoedas, para você sair do zero e investir com método e segurança. Aberta a todos: você não precisa ser Premium para contratar.">
      <Status loading={loading && !data} error={error} onRetry={reload} />
      {data && (
        <>
          <Card style={{ borderColor: "rgba(125,190,255,0.4)", gap: 6 }}>
            <Text style={{ color: "#bfe0ff", fontWeight: "800", letterSpacing: 2, fontSize: 11 }}>◆ PLANO DIAMOND</Text>
            <Text style={{ color: C.goldSoft, fontSize: 26, fontWeight: "800" }}>{data.price}</Text>
            <Muted>pagamento único · {data.sessions} aulas particulares de 1 hora (1 por mês) · online, por Google Meet ou Teams</Muted>
            <Text style={{ color: data.spots.full ? C.down : C.up, fontWeight: "700" }}>{data.spots.full ? `Turma ${data.spots.turma} esgotada` : `Turma ${data.spots.turma}: ${data.spots.left} de ${data.spots.limit} vagas`}</Text>
          </Card>
          {data.mine.map((m) => (
            <Card key={m.id} style={{ borderColor: C.up, gap: 6 }}>
              <H2>Sua mentoria está ativa</H2>
              <Muted>Contratada em {dia(m.createdAt)}. Aulas realizadas: {m.sessionsDone} de {data.sessions}. {m.sessionsDone === 0 ? "A aula 01 será agendada pelo Niza e enviada por e-mail com o link do Google Meet ou Teams." : "O próximo encontro é combinado com você por e-mail."}</Muted>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: C.line, overflow: "hidden" }}><View style={{ height: 8, backgroundColor: C.gold, width: `${(m.sessionsDone / data.sessions) * 100}%` }} /></View>
            </Card>
          ))}
          <Card style={{ borderColor: C.gold, gap: 6 }}>
            <H2>Aula 01: descobrindo o seu ponto de partida</H2>
            <Muted>O primeiro encontro serve para avaliar o seu nível de conhecimento e o que você já tem. A partir dele, o Niza monta o seu caminho de aprendizagem nas {data.sessions - 1} aulas seguintes, no seu ritmo e com foco no que faz sentido para você.</Muted>
          </Card>
          {TOPICS.map((s) => (
            <Card key={s.t} style={{ gap: 6 }}>
              <Text style={{ color: C.white, fontWeight: "800", fontSize: 16 }}>{s.t}</Text>
              {s.items.map((i) => <Text key={i} style={{ color: C.muted }}>• {i}</Text>)}
            </Card>
          ))}
          <Card style={{ borderColor: C.down, gap: 4 }}>
            <Text style={{ color: C.white, fontWeight: "700" }}>O que a mentoria não é</Text>
            <Muted>Não há recomendação de compra de ativos. As aulas ensinam método, segurança e riscos; a avaliação da carteira compara a sua situação atual com o Protocolo CR2FA. Toda decisão de investimento, e o risco dela, é exclusivamente sua. Investir em criptomoedas envolve risco de perda total do capital, e a mentoria não garante resultado financeiro.</Muted>
          </Card>
          {!data.spots.full && <GoldButton label="Contratar no site (Pix, cartão ou cripto)" onPress={() => void Linking.openURL(`${API}/painel/mentoria`)} />}
          <Muted>O pagamento é feito com segurança no site. Quer o Premium vitalício junto com a mentoria? Veja o Plano Diamond em Planos e pagamento.</Muted>
        </>
      )}
    </Screen>
  );
}
