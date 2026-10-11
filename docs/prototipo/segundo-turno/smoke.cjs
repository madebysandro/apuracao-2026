// Smoke do protótipo (Playwright/Chromium). Uso, com o servidor de pé em :8765:
//   node smoke.cjs            (procura o playwright em $PW ou /tmp/pw)
const { chromium } = require(require.resolve("playwright", { paths: [process.env.PW || "/tmp/pw"] }));

const BASE = process.env.BASE || "http://localhost:8765/";
const VARIANTES = ["pre", "parcial", "virada", "encerrado"];
const LARGURAS = [1440, 390];
const PROIBIDO = [/Falha/, /undefined/, /NaN/, /Pará/, /Tela 2/];
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
			await page.goto(`${BASE}?variant=${v}`, { waitUntil: "networkidle" });
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
			if (!texto.includes("DADOS DE EXEMPLO")) problemas.push("sem faixa DADOS DE EXEMPLO");
			const rola = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
			if (rola) problemas.push("rolagem horizontal");
			if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/${v}-${w}.png`, fullPage: true });
			console.log(`${problemas.length ? "FALHOU" : "ok"}  ${v.padEnd(9)} ${w}px${problemas.length ? "  " + problemas.join(" | ") : ""}`);
			falhas += problemas.length ? 1 : 0;
			await page.close();
		}
	}
	await browser.close();
	console.log(`${VARIANTES.length * LARGURAS.length - falhas}/${VARIANTES.length * LARGURAS.length} casos ok`);
	process.exit(falhas ? 1 : 0);
})();
