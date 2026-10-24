import test from "node:test";
import assert from "node:assert/strict";
import { mergeNews, parseFeed, topicById, TOPICS } from "../src/lib/news";

const NOW = 1_800_000_000;
const rss = `<?xml version="1.0"?><rss><channel>
<item><title><![CDATA[Bitcoin sobe &amp; renova máxima]]></title><link>https://ex.com/a</link><pubDate>Sat, 24 Oct 2026 12:00:00 GMT</pubDate><description><![CDATA[<p>Texto <b>com</b> tags</p>]]></description><source url="https://x">Fonte X</source></item>
<item><title>Link ruim</title><link>javascript:alert(1)</link></item>
<item><title>Sem data</title><link>https://ex.com/b</link></item>
</channel></rss>`;
const atom = `<feed><entry><title>Atom título</title><link href="https://ex.com/c"/><updated>2026-10-24T10:00:00Z</updated><summary>&lt;p&gt;Resumo&lt;/p&gt;</summary></entry></feed>`;

test("parseFeed lê RSS, limpa HTML e rejeita links não http", () => {
  const it = parseFeed(rss, "Padrão", NOW);
  assert.equal(it.length, 2);
  assert.equal(it[0].title, "Bitcoin sobe & renova máxima");
  assert.equal(it[0].summary, "Texto com tags");
  assert.equal(it[0].source, "Fonte X");
  assert.equal(it[1].at, NOW);
  assert.equal(it[1].source, "Padrão");
});

test("parseFeed lê Atom", () => {
  const it = parseFeed(atom, "A", NOW);
  assert.equal(it[0].url, "https://ex.com/c");
  assert.equal(it[0].summary, "Resumo");
});

test("mergeNews filtra, remove duplicadas e ordena", () => {
  const a = parseFeed(rss, "A", NOW);
  const b = [{ title: "Bitcoin sobe & renova máxima - Fonte Y", url: "https://y.com/1", source: "Y", at: 5, summary: "" }, { title: "Tesouro Selic rende", url: "https://y.com/2", source: "Y", at: NOW + 10, summary: "" }];
  const out = mergeNews([{ feed: { url: "", source: "A" }, items: a }, { feed: { url: "", source: "Y", only: /tesouro/i }, items: b }]);
  assert.equal(out[0].title, "Tesouro Selic rende");
  assert.equal(out.length, 3);
  assert.ok(out[0].at >= out[1].at && out[1].at >= out[2].at);
});

test("temas", () => {
  assert.equal(topicById("fiis").label, "Fundos imobiliários");
  assert.equal(topicById("xxx").id, TOPICS[0].id);
});

import { videoId } from "../src/lib/lives";
test("videoId reconhece links do YouTube", () => {
  assert.equal(videoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3"), "dQw4w9WgXcQ");
  assert.equal(videoId("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(videoId("https://example.com/"), null);
});

test("resumo que só repete o título é descartado", () => {
  const xml = `<rss><channel><item><title>Polícia descobre mineração ilegal de bitcoin - DOL</title><link>https://a.com/1</link><description>Polícia descobre mineração ilegal de bitcoin DOL</description></item><item><title>Outro título</title><link>https://a.com/2</link><description>Texto diferente e útil sobre a notícia.</description></item></channel></rss>`;
  const it = parseFeed(xml, "X", 1_800_000_000);
  assert.equal(it[0].summary, "");
  assert.equal(it[1].summary, "Texto diferente e útil sobre a notícia.");
});
