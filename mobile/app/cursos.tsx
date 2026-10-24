import { Card, H2, Muted, ProGate, Screen } from "../src/ui";

export default function Cursos() {
  return (
    <Screen subtitle="Aulas em vídeo. A introdução é livre no Grátis.">
      <Card><H2>Introdução ao investimento</H2><Muted>Liberada para todos.</Muted></Card>
      <ProGate feature="Aulas completas (exclusivo do plano Pró)"><Card><H2>Módulos avançados</H2><Muted>Conteúdo completo do curso.</Muted></Card></ProGate>
    </Screen>
  );
}
