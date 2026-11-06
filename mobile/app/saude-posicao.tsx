import { useLocalSearchParams } from "expo-router";
import { LpDetailBody } from "../src/LpDetail";
import { ProGate, Screen } from "../src/ui";

export default function Posicao() {
  const { address, rede, id } = useLocalSearchParams<{ address: string; rede: string; id: string }>();
  return (
    <Screen title="Posição" subtitle="Uniswap v3 · somente visualização">
      <ProGate feature="Saúde das pools"><LpDetailBody address={address} rede={rede} id={id} /></ProGate>
    </Screen>
  );
}
