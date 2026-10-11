import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const BASE = process.argv[2] ?? "http://127.0.0.1:8777/";
const OUT = "/tmp/arcade-shots"; mkdirSync(OUT, { recursive: true });
const tamanhos = [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]];
const movimentos = [["full", "no-preference", ""], ["reduce", "reduce", ""], ["param", "no-preference", "&motion=reduced"]];
const browser = await chromium.launch();
let falhas = 0;
for (const v of ["a", "b", "c"]) for (const [nomeT, viewport] of tamanhos) for (const [mov, rm, q] of movimentos) {
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
  ok((await page.locator("#creditos").innerText()).includes("CC BY-SA 4.0"), "sem crédito das fotos");
  const motion = await page.evaluate(() => document.documentElement.dataset.motion);
  ok(motion === (mov === "full" ? "full" : "reduced"), `data-motion=${motion}`);
  if (v === "b") {
    const f = page.frameLocator("#painel");
    ok(await f.locator(".db-topo").count() === 1, "painel não carregou no iframe");
  }
  await page.screenshot({ path: `${OUT}/${nome}-1-selecao.png` });
  // observa .treme ao longo da luta
  await page.evaluate(() => { window.__treme = 0; new MutationObserver(() => { if (document.querySelector(".treme")) window.__treme++; }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"] }); });
  let cliques = 0, shotMeio = false;
  while ((await page.evaluate(() => window.__arcade.fase)) !== "fim" && cliques < 30) {
    await page.click("#proxima");
    cliques++;
    await page.waitForTimeout(cliques === 1 ? 2200 : 350);
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
  const largura = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(largura <= viewport.width + 1, `rolagem horizontal ${largura}px`);
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
  console.log(`${problemas.length ? "FAIL" : "ok  "} ${nome} · cliques ${cliques} · REVERSAL×${nRev} · PERFECT×${nPerf} · tremidas ${ev.tremidas}${problemas.length ? "\n   " + problemas.join("\n   ") : ""}`);
  falhas += problemas.length ? 1 : 0;
  await ctx.close();
}
// autoplay chega ao fim sozinho (variante a, reduzido, rápido o bastante)
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const erros = []; page.on("pageerror", (e) => erros.push(e.message));
  await page.goto(`${BASE}?variant=a`, { waitUntil: "networkidle" });
  await page.click("#auto");
  await page.waitForFunction(() => window.__arcade.fase === "fim", null, { timeout: 60000 }).catch(() => erros.push("autoplay não terminou"));
  console.log(`${erros.length ? "FAIL" : "ok  "} autoplay a${erros.length ? " " + erros.join("; ") : ""}`);
  falhas += erros.length ? 1 : 0;
}
await browser.close();
console.log(falhas ? `${falhas} caso(s) com falha` : "todos os casos passaram");
process.exit(falhas ? 1 : 0);
