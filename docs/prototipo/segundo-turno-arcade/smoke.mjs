import { chromium } from "playwright";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
const BASE = process.argv[2] ?? "http://127.0.0.1:8777/";
const OUT = "/tmp/arcade-shots"; mkdirSync(OUT, { recursive: true });
const tamanhos = [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]];
const movimentos = [["full", "no-preference", ""], ["reduce", "reduce", ""], ["param", "no-preference", "&motion=reduced"]];
const browser = await chromium.launch();
let falhas = 0;
// ia/: só os arquivos do manifesto, nenhum quadro de K.O. no chão (a semelhança de pixels é conferida por ia-recortar.py)
{
  const dir = new URL(process.argv[3] ?? "./ia/", import.meta.url); // 2º argumento: caminho de ia/ (o smoke costuma rodar copiado)
  const man = JSON.parse(readFileSync(new URL("manifesto.json", dir)));
  const esperados = new Set(["manifesto.json", ...JSON.stringify(man).match(/ia\/[^"]+/g).map((a) => a.slice(3))]);
  const arqs = readdirSync(dir);
  const extras = arqs.filter((a) => !esperados.has(a) || /ko|ch[aã]o|floor/i.test(a));
  const poses = Object.values(man.poses).flatMap((p) => Object.keys(p)).sort().join();
  const ok = !extras.length && poses === "chute,chute,golpeado,golpeado,guarda,guarda,vitoria,vitoria";
  console.log(`${ok ? "ok  " : "FAIL"} ia/ sem quadro de K.O. no chão · ${arqs.length} arquivos · poses ${poses}${extras.length ? " · extras " + extras : ""}`);
  falhas += ok ? 0 : 1;
}
// só nacional: nada de Pará/Belém/Tela 2 na página nem no painel do iframe (b), fora a tabela neutra "Todas as UFs"
const PROIBIDO = /Pará|Belém|Ver-o-Peso|Tela 2/;
const textoNacional = async (page) => {
  let t = await page.locator("body").innerText();
  if (await page.locator("#painel:not([hidden])").count())
    t += await page.frameLocator("#painel").locator("body").evaluate((b) => { const c = b.cloneNode(true); c.querySelector(".t2-rolagem-uf")?.remove(); return c.textContent; });
  return t.match(PROIBIDO)?.[0];
};
// selo em toda imagem renderizada da variante ia
const selos = (page) => page.evaluate(() => {
  const imgs = [...document.querySelectorAll("img")].filter((i) => i.checkVisibility());
  const comSelo = imgs.filter((i) => {
    const s = i.closest(".ia-quadro")?.querySelector(".ia-selo");
    return s && s.checkVisibility() && s.textContent === "Imagem gerada por IA · sátira" && i.closest(".ia-quadro").contains(s);
  });
  return { imgs: imgs.length, selos: comSelo.length };
});
for (const v of ["a", "b", "c", "ia"]) for (const [nomeT, viewport] of tamanhos) for (const [mov, rm, q] of movimentos) {
  if (mov === "param" && nomeT === "mobile") continue;
  const ctx = await browser.newContext({ viewport, reducedMotion: rm });
  const page = await ctx.newPage();
  const erros = [];
  page.on("console", (m) => { if (m.type() === "error") erros.push(m.text()); });
  page.on("pageerror", (e) => erros.push("pageerror: " + e.message));
  page.on("requestfailed", (r) => erros.push("reqfail " + r.url()));
  const p = [];
  const ok = (c, msg) => { if (!c) p.push(msg); };
  const nome = `${v}-${nomeT}-${mov}`;
  await page.goto(`${BASE}?variant=${v}${q}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  ok(await page.locator("#banner").isVisible(), "banner invisível");
  ok((await page.locator("#banner").innerText()).includes("DADOS DE EXEMPLO"), "banner sem texto");
  ok(await page.locator("#som").isVisible(), "sem botão de som");
  ok((await page.locator("#som").getAttribute("aria-pressed")) === "false", "som não começa desligado");
  ok(await page.evaluate(() => typeof AudioContext === "function"), "sem AudioContext?");
  ok(await page.locator("#selecao").isVisible(), "seleção invisível");
  ok((await page.locator("#selecao").innerText()).includes("VS"), "sem VS");
  if (v === "ia") {
    ok(await page.locator("#creditos").isVisible(), "rodapé IA invisível");
    ok((await page.locator("#creditos").innerText()).includes("Imagens criadas com IA para fins de humor. Não retratam fatos reais."), "sem texto do rodapé IA");
  } else ok((await page.locator("#creditos").innerText()).includes("CC BY-SA 4.0"), "sem crédito das fotos");
  const checaSelos = async (onde) => {
    if (v !== "ia") return;
    const r = await selos(page);
    ok(r.imgs > 0 && r.imgs === r.selos, `${onde}: ${r.imgs} imagens, ${r.selos} com selo`);
    contagem.push(`${onde} ${r.selos}/${r.imgs}`);
  };
  const contagem = [];
  await checaSelos("seleção");
  const motion = await page.evaluate(() => document.documentElement.dataset.motion);
  ok(motion === (mov === "full" ? "full" : "reduced"), `data-motion=${motion}`);
  if (v === "b") {
    const f = page.frameLocator("#painel");
    ok(await f.locator(".db-topo").count() === 1, "painel não carregou no iframe");
  }
  ok(!(await textoNacional(page)), `texto não nacional na seleção: ${await textoNacional(page)}`);
  await page.screenshot({ path: `${OUT}/${nome}-1-selecao.png` });
  // observa .treme ao longo da luta
  await page.evaluate(() => { window.__treme = 0; new MutationObserver(() => { if (document.querySelector(".treme")) window.__treme++; }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"] }); });
  let cliques = 0, shotMeio = false;
  while ((await page.evaluate(() => window.__arcade.fase)) !== "fim" && cliques < 30) {
    await page.click("#proxima");
    cliques++;
    await page.waitForTimeout(cliques === 1 ? 2200 : 350);
    if (cliques === 4) await checaSelos("luta");
    if (!shotMeio && (await page.evaluate(() => window.__arcade.eventos.includes("REVERSAL!")))) {
      await page.waitForTimeout(200);
      await page.screenshot({ path: `${OUT}/${nome}-2-reversal.png` });
      shotMeio = true;
    }
  }
  ok(cliques === 14, `cliques até o fim: ${cliques}`);
  await page.locator("#vitoria").waitFor({ state: "visible", timeout: 15000 }).catch(() => p.push("vitória não apareceu"));
  const vit = await page.locator("#vitoria").innerText().catch(() => "");
  ok(vit.includes("WINNER") && vit.includes("K.O."), "sem WINNER/K.O. na tela final");
  const ev = await page.evaluate(() => window.__arcade);
  for (const e of ["ROUND 1", "FIGHT!", "REVERSAL!", "K.O.", "WINNER"]) ok(ev.eventos.includes(e), `evento ausente: ${e}`);
  const nRev = ev.eventos.filter((e) => e === "REVERSAL!").length;
  const nPerf = ev.eventos.filter((e) => e === "PERFECT").length;
  const treme = await page.evaluate(() => window.__treme);
  if (mov === "full") ok(ev.tremidas > 0 && treme > 0, "modo completo sem tremor");
  else ok(ev.tremidas === 0 && ev.flashes === 0 && treme === 0, `reduzido com tremor/flash: ${ev.tremidas}/${ev.flashes}/${treme}`);
  const txt = await page.locator("body").innerText();
  ok(!/undefined|NaN|\[object/.test(txt), "texto suspeito");
  ok(!(await textoNacional(page)), `texto não nacional no fim: ${await textoNacional(page)}`);
  const largura = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(largura <= viewport.width + 1, `rolagem horizontal ${largura}px`);
  await checaSelos("vitória");
  if (v === "ia") {
    const ko = await page.evaluate(() => [...document.querySelectorAll(".lutador.ko")].map((l) => ({ n: l.dataset.n, pose: l.dataset.pose, anim: getComputedStyle(l).animationName })));
    ok(ko.length === 1 && ko[0].pose === "golpeado", `K.O. sem quadro golpeado: ${JSON.stringify(ko)}`);
    ok(mov === "full" ? ko[0]?.anim.startsWith("cai-") : ko[0]?.anim === "none", `animação do K.O. ${ko[0]?.anim} em ${mov}`);
    ok(await page.locator("#creditos").isVisible(), "rodapé IA sumiu no fim");
    contagem.push(`K.O. ${ko[0]?.n} (${ko[0]?.anim})`);
  }
  await page.screenshot({ path: `${OUT}/${nome}-3-winner.png` });
  if (v === "b") {
    await page.click("#modo-arcade");
    ok(!(await page.locator("#arena").isVisible()) && !(await page.locator("#vitoria").isVisible()), "modo arcade desligado ainda mostra HUD");
    ok((await page.locator("#modo-arcade").getAttribute("aria-pressed")) === "false", "toggle não mudou aria-pressed");
    const f = page.frameLocator("#painel");
    ok((await f.locator("body").innerText()).includes("Resultado final"), "painel não chegou ao fim junto");
    await page.screenshot({ path: `${OUT}/${nome}-4-arcade-off.png` });
    await page.click("#modo-arcade");
    ok(await page.locator("#arena").isVisible(), "modo arcade não voltou");
  }
  // reiniciar volta à seleção
  await page.click("#reiniciar");
  ok(await page.locator("#selecao").isVisible(), "reiniciar não voltou à seleção");
  // som liga só no clique
  await page.click("#som");
  ok((await page.locator("#som").getAttribute("aria-pressed")) === "true", "som não ligou");
  await page.click("#som");
  const problemas = [...erros, ...p];
  console.log(`${problemas.length ? "FAIL" : "ok  "} ${nome} · cliques ${cliques} · REVERSAL×${nRev} · PERFECT×${nPerf} · tremidas ${ev.tremidas}${contagem.length ? " · selos " + contagem.join(", ") : ""}${problemas.length ? "\n   " + problemas.join("\n   ") : ""}`);
  falhas += problemas.length ? 1 : 0;
  await ctx.close();
}
// autoplay chega ao fim sozinho (reduzido, rápido o bastante)
for (const v of ["a", "ia"]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const erros = []; page.on("pageerror", (e) => erros.push(e.message));
  await page.goto(`${BASE}?variant=${v}`, { waitUntil: "networkidle" });
  await page.click("#auto");
  await page.waitForFunction(() => window.__arcade.fase === "fim", null, { timeout: 60000 }).catch(() => erros.push("autoplay não terminou"));
  await page.locator("#vitoria").waitFor({ state: "visible", timeout: 10000 }).catch(() => erros.push("WINNER não apareceu"));
  console.log(`${erros.length ? "FAIL" : "ok  "} autoplay ${v}${erros.length ? " " + erros.join("; ") : ""}`);
  falhas += erros.length ? 1 : 0;
}
await browser.close();
console.log(falhas ? `${falhas} caso(s) com falha` : "todos os casos passaram");
process.exit(falhas ? 1 : 0);
