import { FeedTab } from "../src/FeedTab";
import { Screen } from "../src/ui";

/** Posts Salvos: o mesmo feed, só com as publicações que você guardou. */
export default function Salvos() {
  return (
    <Screen title="Posts Salvos" subtitle="As publicações que você guardou ficam aqui.">
      <FeedTab only="salvos" />
    </Screen>
  );
}
