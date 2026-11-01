"use client";

import { useEffect } from "react";
import { langFromCookie, SOURCE_LANG } from "@/lib/languages";

declare global {
  interface Window { googleTranslateElementInit?: () => void; google?: { translate: { TranslateElement: new (o: object, id: string) => unknown } } }
}

/**
 * Só carrega o Google Tradutor quando a pessoa escolheu um idioma diferente do original.
 * Em português nada é carregado nem enviado ao Google.
 */
export function TranslateLoader() {
  useEffect(() => {
    if (langFromCookie(document.cookie) === SOURCE_LANG) return;

    // O tradutor troca textos do DOM por <font>; sem isto o React pode quebrar ao atualizar a tela.
    const rm = Node.prototype.removeChild;
    Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
      if (child.parentNode !== this) return child;
      return rm.call(this, child) as T;
    };
    const ins = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function <T extends Node>(this: Node, node: T, ref: Node | null): T {
      if (ref && ref.parentNode !== this) return node;
      return ins.call(this, node, ref) as T;
    };

    window.googleTranslateElementInit = () => {
      if (!window.google) return;
      new window.google.translate.TranslateElement({ pageLanguage: SOURCE_LANG, autoDisplay: false }, "google_translate_element");
    };
    const s = document.createElement("script");
    s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    document.body.appendChild(s);
  }, []);
  return <div id="google_translate_element" aria-hidden className="hidden" />;
}
