import { Card, H2, Muted, ProGate, Screen } from "../../src/ui";

export default function Portfolio() {
  return (
    <Screen title="Portfólio" subtitle="Consolidador da sua carteira e Carteiras Recomendadas.">
      <ProGate feature="Portfólio (exclusivo do plano Pró)">
        <Card><H2>Consolidador</H2><Muted>Gráficos de Ações, FIIs, Renda Fixa e Cripto.</Muted></Card>
        <Card><H2>Carteiras Recomendadas</H2><Muted>Teses e aportes do Emerson.</Muted></Card>
      </ProGate>
    </Screen>
  );
}
