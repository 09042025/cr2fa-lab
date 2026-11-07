import { StoriesBar } from "../../src/Stories";
import { useAuth } from "../../src/auth";
import { FeedTab } from "../../src/FeedTab";
import { Screen } from "../../src/ui";

/** Primeira tela do app: o Feed, igual ao site no celular. */
export default function Feed() {
  return (
    <Screen title="Feed" subtitle="Publicações dos membros sobre investimentos: análises, dúvidas e ideias.">
      <FeedTab />
    </Screen>
  );
}
