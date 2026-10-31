import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { checkUrl, decodeEntities, fetchPreview, isPrivateIp, parseOEmbed, parsePreview } from "../src/lib/linkpreview";

test("endereços internos são bloqueados (IPv4 e IPv6), públicos passam", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.5", "172.31.255.1", "192.168.0.10", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "::", "fe80::1", "fc00::1", "fd12:3456::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:169.254.169.254", "2001:db8::1", "not-an-ip"])
    assert.equal(isPrivateIp(ip), true, ip);
  for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "104.18.2.3", "2606:4700:4700::1111", "::ffff:8.8.8.8"])
    assert.equal(isPrivateIp(ip), false, ip);
});

test("checkUrl aceita só http/https públicos nas portas padrão", () => {
  assert.ok(checkUrl("https://example.com/a?b=1"));
  assert.ok(checkUrl("http://example.com"));
  for (const u of ["ftp://example.com", "javascript:alert(1)", "file:///etc/passwd", "https://user:pw@example.com", "http://localhost/x", "http://127.0.0.1/", "http://[::1]/", "http://2130706433/", "http://0x7f.1/", "http://169.254.169.254/latest/meta-data", "https://example.com:8443/", "http://intranet/", "http://printer.local/", "http://10.0.0.1/", "not a url"])
    assert.equal(checkUrl(u), null, u);
});

test("parsePreview lê og:*, twitter:* e cai no <title>", () => {
  const base = new URL("https://site.com/materia/1");
  const p = parsePreview(`<html><head><title>Título da aba</title>
    <meta property="og:title" content="Aave &amp; Cia: &quot;mercados&quot;">
    <meta property='og:description' content="Resumo   da
    matéria&hellip;">
    <meta property="og:image" content="/img/capa.jpg">
    <meta property="og:site_name" content="Portal"></head></html>`, base)!;
  assert.equal(p.title, 'Aave & Cia: "mercados"');
  assert.equal(p.description, "Resumo da matéria…");
  assert.equal(p.image, "https://site.com/img/capa.jpg");
  assert.equal(p.site, "Portal");
  const q = parsePreview("<head><title>Só título</title></head>", base)!;
  assert.equal(q.title, "Só título");
  assert.equal(q.image, null);
  assert.equal(q.site, "site.com");
  assert.equal(parsePreview("<html><body>nada</body></html>", base), null);
  assert.equal(parsePreview('<meta property="og:title" content="x"><meta property="og:image" content="javascript:alert(1)">', base)!.image, null);
  assert.equal(decodeEntities("&#8364; &#x41; &amp;amp;"), "€ A &amp;");
});

test("oEmbed do X vira prévia com autor e texto", () => {
  const html = '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Excelente!!! <a href="https://t.co/x">pic.twitter.com/x</a></p>&mdash; Emerson Niza (@emersonmniza) <a href="https://twitter.com/emersonmniza/status/1">October 31, 2026</a></blockquote>';
  const p = parseOEmbed({ author_name: "Emerson Niza", author_url: "https://twitter.com/emersonmniza", html }, new URL("https://x.com/emersonmniza/status/1"))!;
  assert.equal(p.site, "X");
  assert.equal(p.title, "Emerson Niza (@emersonmniza) no X");
  assert.ok(p.description.startsWith("Excelente!!!"));
  assert.equal(parseOEmbed({}, new URL("https://x.com/a/status/1")), null);
});

test("fetchPreview: baixa a página, limita o tamanho e bloqueia destino interno", async () => {
  const srv = http.createServer((req, res) => {
    if (req.url === "/ok") { res.setHeader("content-type", "text/html; charset=utf-8"); res.end('<head><meta property="og:title" content="Olá"><meta property="og:image" content="/i.png"></head>'); }
    else if (req.url === "/redir") { res.statusCode = 302; res.setHeader("location", "/ok"); res.end(); }
    else if (req.url === "/interno") { res.statusCode = 302; res.setHeader("location", "http://127.0.0.1:1/segredo"); res.end(); }
    else if (req.url === "/img") { res.setHeader("content-type", "image/png"); res.end("PNG"); }
    else if (req.url === "/grande") { res.setHeader("content-type", "text/html"); res.write('<head><meta property="og:title" content="Grande"></head>'); res.end("x".repeat(2_000_000)); }
    else { res.statusCode = 404; res.end("nada"); }
  });
  await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
  const port = (srv.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;
  try {
    // sem a permissão de teste, o servidor local é recusado (trava contra endereços internos)
    assert.equal(await fetchPreview(`${base}/ok`), null);
    const ok = await fetchPreview(`${base}/ok`, { allowPrivate: true });
    assert.equal(ok?.title, "Olá");
    assert.equal(ok?.image, `${base}/i.png`);
    assert.equal(await fetchPreview(`${base}/interno`, { allowPrivate: true }), null); // redireciona para endereço interno
    assert.equal(await fetchPreview(`${base}/img`, { allowPrivate: true }), null); // não é página
    assert.equal(await fetchPreview(`${base}/404`, { allowPrivate: true }), null);
    assert.equal((await fetchPreview(`${base}/grande`, { allowPrivate: true }))?.title, "Grande"); // corta o download
  } finally { srv.close(); }
});
