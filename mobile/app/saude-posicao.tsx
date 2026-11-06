import { useLocalSearchParams } from "expo-router";
import { LpDetailBody } from "../src/LpDetail";
import { ProGate, Screen } from "../src/ui";

export default function Posicao() {
  const { address, rede, id, proto } = useLocalSearchParams<{ address: string; rede: string; id: string; proto?: string }>();
  return (
    <Screen title="Posição" subtitle="Somente visualização">
      <ProGate feature="Saúde das pools"><LpDetailBody address={address} rede={rede} id={id} proto={proto} /></ProGate>
    </Screen>
  );
}
