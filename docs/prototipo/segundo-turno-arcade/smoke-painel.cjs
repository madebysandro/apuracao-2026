// Smoke do painel/ (cópia do protótipo do 2º turno, adaptada de segundo-turno/smoke.cjs). Uso, com o servidor
// do arcade de pé em :8777:  node smoke-painel.cjs   (procura o playwright em $PW ou /tmp/pw)
// Casos: as 4 variantes a 1440 e 390 px, mais o modo embutido da variante (b): ?embed=1&n=0|24|60 e o postMessage.
const { chromium } = require(require.resolve("playwright", { paths: [process.env.PW || "/tmp/pw"] }));

const BASE = process.env.BASE || "http://localhost:8777/painel/";
const VARIANTES = ["pre", "parcial", "virada", "encerrado", "embed=1&n=0", "embed=1&n=24", "embed=1&n=60"];
const LARGURAS = [1440, 390];
const PROIBIDO = [/Falha/, /undefined/, /NaN/, /Pará/, /Belém/, /Ver-o-Peso/, /Tela 2/];
const BLOCOS = [".t2-duelo", ".t2-exterior", ".t2-compar", ".t2-comp", ".t2-estados", ".t2-colegios"];

(async () => {
	const browser = await chromium.launch();
	let falhas = 0;
	for (const w of LARGURAS) {
		for (const v of VARIANTES) {
			const page = await browser.newPage({ viewport: { width: w, height: 900 } });
			const erros = [];
			page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
			page.on("pageerror", (e) => erros.push(String(e)));
			const embed = v.startsWith("embed");
			await page.goto(`${BASE}?${embed ? v : "variant=" + v}`, { waitUntil: "networkidle" });
			await page.waitForSelector(".t2-colegios");
			const texto = await page.evaluate(() => document.body.innerText);
			// A tabela "Todas as UFs" lista as 27 UFs pelo nome, sem destaque: fica fora da busca por "Pará".
			const semTabelaUf = await page.evaluate(() => {
				const c = document.body.cloneNode(true);
				c.querySelector(".t2-rolagem-uf")?.remove();
				document.body.append(c);
				const t = c.innerText;
				c.remove();
				return t;
			});
			const problemas = [...erros];
			for (const re of PROIBIDO) if (re.test(semTabelaUf)) problemas.push(`texto proibido: ${re}`);
			if ((await page.$$(".t2-rolagem-uf tbody tr")).length !== 28) problemas.push("tabela de UFs != 28 linhas");
			for (const sel of BLOCOS) if (!(await page.$(sel))) problemas.push(`falta ${sel}`);
			if ((await page.$$(".t2-colegios tbody tr")).length !== 10) problemas.push("colégios != 10 linhas");
			if (await page.$("[data-tela], .db-abas")) problemas.push("navegação de telas ainda existe");
			if (!embed && !texto.includes("DADOS DE EXEMPLO")) problemas.push("sem faixa DADOS DE EXEMPLO");
			if (embed && (await page.$("#proto-switcher"))) problemas.push("switcher dentro do iframe");
			if (v.endsWith("n=60") && !texto.includes("Resultado final")) problemas.push("n=60 sem Resultado final");
			if (v.endsWith("n=0")) {
				// a variante (b) avança o painel por postMessage
				await page.evaluate(() => postMessage({ arcadeN: 60 }, location.origin));
				await page.waitForFunction(() => document.body.innerText.includes("Resultado final")).catch(() => problemas.push("postMessage não levou ao fim"));
			}
			const rola = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
			if (rola) problemas.push("rolagem horizontal");
			if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/${v}-${w}.png`, fullPage: true });
			console.log(`${problemas.length ? "FALHOU" : "ok"}  ${v.padEnd(12)} ${w}px${problemas.length ? "  " + problemas.join(" | ") : ""}`);
			falhas += problemas.length ? 1 : 0;
			await page.close();
		}
	}
	await browser.close();
	console.log(`${VARIANTES.length * LARGURAS.length - falhas}/${VARIANTES.length * LARGURAS.length} casos ok`);
	process.exit(falhas ? 1 : 0);
})();
