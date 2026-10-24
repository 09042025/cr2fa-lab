import { PortfolioTab } from "../../src/PortfolioTab";
import { Card, H2, Muted, ProGate, Screen } from "../../src/ui";

export default function Portfolio() {
  return (
    <Screen title="Portfólio" subtitle="Registre suas posições e veja quanto comprar ou vender em cada bloco.">
      <ProGate feature="Portfólio (exclusivo do plano Pró)">
        <PortfolioTab />
        <Card><H2>Carteiras Recomendadas</H2><Muted>Em breve: as teses e aportes do Emerson.</Muted></Card>
      </ProGate>
    </Screen>
  );
}
