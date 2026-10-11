// Smoke da variante v2 (three.js). Rode de um diretório com `playwright` instalado, com o servidor de pé:
//   node smoke-v2.mjs http://127.0.0.1:8777/
// O Chromium headless sobe com SwiftShader para o WebGL funcionar sem GPU.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const BASE = process.argv[2] ?? "http://127.0.0.1:8777/";
const OUT = "/tmp/arcade-shots";
mkdirSync(OUT, { recursive: true });
const GL = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
const SELO = "Imagem gerada por IA · sátira";
const RODAPE = "Imagens criadas com IA para fins de humor. Não retratam fatos reais.";
const browser = await chromium.launch({ args: GL });
let falhas = 0;
const casos = [
	["desktop", { width: 1440, height: 900 }, "full", "no-preference", ""],
	["desktop", { width: 1440, height: 900 }, "reduce", "reduce", ""],
	["desktop", { width: 1440, height: 900 }, "param", "no-preference", "&motion=reduced"],
	["mobile", { width: 390, height: 844 }, "full", "no-preference", ""],
	["mobile", { width: 390, height: 844 }, "reduce", "reduce", ""],
];
const selosDOM = (page) =>
	page.evaluate((SELO) => {
		const imgs = [...document.querySelectorAll("img")].filter((i) => i.checkVisibility());
		const ok = imgs.filter((i) => i.closest(".ia-quadro")?.querySelector(".ia-selo")?.textContent === SELO);
		const palco = document.querySelector(".v2-selo");
		return { imgs: imgs.length, selos: ok.length, palco: Boolean(palco?.checkVisibility() && palco.textContent === SELO) };
	}, SELO);

for (const [tam, viewport, mov, rm, q] of casos) {
	const nome = `v2-${tam}-${mov}`;
	const ctx = await browser.newContext({ viewport, reducedMotion: rm });
	const page = await ctx.newPage();
	const erros = [];
	page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
	page.on("pageerror", (e) => erros.push("pageerror: " + e.message));
	page.on("requestfailed", (r) => erros.push("reqfail " + r.url()));
	const p = [];
	const ok = (c, msg) => c || p.push(msg);
	const notas = [];
	await page.goto(`${BASE}${q ? "?" + q.slice(1) : ""}`, { waitUntil: "networkidle" }); // sem ?variant: v2 é o padrão
	await page.waitForFunction(() => window.__v2?.quadros > 0, null, { timeout: 15000 }).catch(() => p.push("3D não desenhou"));
	const reduzido = mov !== "full";
	ok((await page.evaluate(() => document.documentElement.dataset.motion)) === (reduzido ? "reduced" : "full"), "data-motion errado");
	ok((await page.locator("#banner").innerText()).includes("DADOS DE EXEMPLO"), "sem faixa DADOS DE EXEMPLO");
	ok((await page.locator("#som").getAttribute("aria-pressed")) === "false", "som não começa desligado");
	ok((await page.locator("#selecao").innerText()).includes("VS"), "sem VS");
	ok(await page.locator("#creditos").isVisible(), "rodapé invisível");
	ok((await page.locator("#creditos").innerText()).includes(RODAPE), "sem texto do rodapé");
	const v = await page.evaluate(() => ({ webgl: window.__v2.webgl, assados: window.__v2.selosAssados, texturas: window.__v2.texturas, aud: window.__v2.auditar(), am: window.__v2.amostra() }));
	ok(v.webgl, "sem WebGL");
	ok(v.am.desvio > 10 && v.am.media > 10, `canvas em branco? ${JSON.stringify(v.am)}`);
	ok(v.assados === 9 && v.aud.texturas === 9 && v.aud.semSelo === 0, `selo assado: ${v.assados} assados, ${v.aud.texturas} texturas, ${v.aud.semSelo} sem selo`);
	ok(["fundo", "22-guarda", "22-chute", "22-golpeado", "22-vitoria", "13-guarda", "13-chute", "13-golpeado", "13-vitoria"].every((t) => v.texturas.includes(t)), "falta textura assada");
	notas.push(`webgl ${v.am.w}×${v.am.h} desvio ${v.am.desvio.toFixed(0)} · selos assados ${v.assados}/${v.aud.texturas}`);
	let s = await selosDOM(page);
	ok(s.imgs > 0 && s.imgs === s.selos && s.palco, `seleção: ${s.selos}/${s.imgs} selos, palco ${s.palco}`);
	notas.push(`selos DOM seleção ${s.selos}/${s.imgs}`);
	await page.screenshot({ path: `${OUT}/${nome}-1-selecao.png` });
	if (!reduzido) await page.click("#som"); // exercita a síntese (efeitos, voz de robô, trilha) no modo completo
	await page.evaluate(() => {
		window.__zoomMax = 1;
		window.__clarao = 0;
		new MutationObserver(() => document.querySelector(".clarao, body.flash, .treme") && window.__clarao++).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"] });
		const mede = () => {
			window.__zoomMax = Math.max(window.__zoomMax, window.__v2.camera().zoom);
			requestAnimationFrame(mede);
		};
		mede();
	});
	let cliques = 0;
	let viuReversal = false;
	while ((await page.evaluate(() => window.__arcade.fase)) !== "fim" && cliques < 30) {
		await page.click("#proxima");
		cliques++;
		await page.waitForTimeout(cliques === 1 ? 2200 : 700);
		if (cliques === 4) {
			s = await selosDOM(page);
			ok(s.imgs === s.selos && s.palco, `luta: ${s.selos}/${s.imgs} selos`);
		}
		if (!viuReversal && (await page.evaluate(() => window.__arcade.eventos.includes("REVERSAL!")))) {
			viuReversal = true;
			await page.screenshot({ path: `${OUT}/${nome}-2-reversal.png` });
		}
	}
	await page.waitForTimeout(reduzido ? 100 : 900);
	await page.screenshot({ path: `${OUT}/${nome}-3-ko.png` });
	ok(cliques === 14, `cliques até o fim: ${cliques}`);
	await page.locator("#vitoria").waitFor({ state: "visible", timeout: 15000 }).catch(() => p.push("tela final não apareceu"));
	await page.waitForTimeout(400);
	const vit = await page.locator("#vitoria").innerText().catch(() => "");
	ok(vit.includes("YOU WIN") && vit.includes("K.O."), "sem YOU WIN/K.O. na tela final");
	const ev = await page.evaluate(() => window.__arcade.eventos);
	for (const e of ["ROUND 1", "FIGHT!", "REVERSAL!", "K.O.", "YOU WIN"]) ok(ev.includes(e), `evento ausente: ${e}`);
	const nRev = ev.filter((e) => e === "REVERSAL!").length;
	const m = await page.evaluate(() => ({ ...window.__v2, texturas: undefined, zoomMax: window.__zoomMax, clarao: window.__clarao }));
	if (reduzido) ok(m.tremidas + m.zooms + m.flashes + m.lentos + m.faiscas + m.clarao === 0 && m.zoomMax === 1, `reduzido com movimento: ${JSON.stringify(m)}`);
	else ok(m.tremidas > 0 && m.zooms > 0 && m.flashes >= 4 && m.lentos >= 4 && m.faiscas > 0 && m.zoomMax > 1.05, `completo sem efeitos: ${JSON.stringify(m)}`);
	notas.push(`REVERSAL×${nRev} · tremidas ${m.tremidas} · zoom máx ${m.zoomMax.toFixed(2)} · flashes ${m.flashes} · câmera lenta ${m.lentos} · faíscas ${m.faiscas} · quadros ${m.quadros}`);
	s = await selosDOM(page);
	ok(s.imgs === s.selos && s.palco, `vitória: ${s.selos}/${s.imgs} selos`);
	notas.push(`selos DOM vitória ${s.selos}/${s.imgs}`);
	const ko = await page.evaluate(() => window.__v2.auditar());
	ok(ko.semSelo === 0, "textura sem selo no fim");
	const html = await page.evaluate(() => document.documentElement.outerHTML + document.body.innerText);
	ok(!/Par[áa]\b|Bel[ée]m|Ver-o-Peso/.test(html), "texto do Pará na v2");
	ok(!/undefined|NaN|\[object/.test(await page.locator("body").innerText()), "texto suspeito");
	ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= viewport.width + 1, "rolagem horizontal");
	ok(await page.locator("#creditos").isVisible(), "rodapé sumiu no fim");
	await page.screenshot({ path: `${OUT}/${nome}-4-winner.png` });
	await page.click("#reiniciar");
	ok(await page.locator("#selecao").isVisible(), "reiniciar não voltou à seleção");
	const problemas = [...erros, ...p];
	console.log(`${problemas.length ? "FAIL" : "ok  "} ${nome} · ${notas.join(" · ")}${problemas.length ? "\n   " + problemas.join("\n   ") : ""}`);
	falhas += problemas.length ? 1 : 0;
	await ctx.close();
}

// autoplay chega ao fim sozinho
{
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	const erros = [];
	page.on("pageerror", (e) => erros.push(e.message));
	page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
	await page.goto(`${BASE}?variant=v2`, { waitUntil: "networkidle" });
	await page.click("#auto");
	await page.waitForFunction(() => window.__arcade.fase === "fim", null, { timeout: 90000 }).catch(() => erros.push("autoplay não terminou"));
	await page.locator("#vitoria").waitFor({ state: "visible", timeout: 10000 }).catch(() => erros.push("YOU WIN não apareceu"));
	console.log(`${erros.length ? "FAIL" : "ok  "} v2 autoplay${erros.length ? " " + erros.join("; ") : ""}`);
	falhas += erros.length ? 1 : 0;
	await page.close();
}
await browser.close();

// sem WebGL: aviso no palco e o resto do simulador funcionando
{
	const b = await chromium.launch({ args: ["--disable-webgl", "--disable-3d-apis"] });
	const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
	const erros = [];
	page.on("pageerror", (e) => erros.push(e.message));
	page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
	await page.goto(BASE, { waitUntil: "networkidle" });
	if (!(await page.locator(".v2-sem-webgl").isVisible())) erros.push("sem aviso de WebGL");
	for (let i = 0; i < 14; i++) await page.click("#proxima");
	await page.locator("#vitoria").waitFor({ state: "visible", timeout: 15000 }).catch(() => erros.push("YOU WIN não apareceu sem WebGL"));
	await page.screenshot({ path: `${OUT}/v2-sem-webgl.png` });
	console.log(`${erros.length ? "FAIL" : "ok  "} v2 sem WebGL (aviso + simulador)${erros.length ? " " + erros.join("; ") : ""}`);
	falhas += erros.length ? 1 : 0;
	await b.close();
}
console.log(falhas ? `${falhas} caso(s) com falha` : "todos os casos passaram");
process.exit(falhas ? 1 : 0);
