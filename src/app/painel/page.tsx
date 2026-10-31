import { redirect } from "next/navigation";

/** A porta de entrada do painel é o Feed (o que mais interessa à comunidade). */
export default function PanelHome() {
  redirect("/painel/comunidade/feed");
}
