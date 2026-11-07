import { NoticiasTab } from "../src/NoticiasTab";
import { Screen } from "../src/ui";

/** Notícias: as principais do dia sobre economia e investimentos, por tema (igual à página do site). */
export default function Noticias() {
  return (
    <Screen title="Notícias" subtitle="As principais notícias do dia sobre economia e investimentos, por tema. Ao tocar, você lê a matéria completa no site da fonte.">
      <NoticiasTab />
    </Screen>
  );
}
