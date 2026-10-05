/**
 * Issue #7 — Presidente por UF e faixa de destaques.
 * Ponto de teste: GET /api/apuracao (ufs + analise.destaques).
 */
import { runInDurableObject } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PollerApuracao } from "../src/poller/poller";
import { instalarTseFalso } from "./helpers/tse-falso";

type ApuracaoApi = {
	versao: number;
	erro: string | null;
	ufs?: Record<
		string,
		{
			uf: string;
			nome: string;
			apurado: number;
			eleitorado: number;
			candidatos: Array<{ n: string; nome: string; votos: number; pct: number }>;
		}
	>;
	analise?: {
		destaques?: string[];
		proporcionais?: Record<string, unknown>;
	};
};

async function lerApuracao() {
	const resposta = await exports.default.fetch(
		new Request("http://apuracao.test/api/apuracao"),
	);
	expect(resposta.status).toBe(200);
	return (await resposta.json()) as ApuracaoApi;
}

async function forcarConsulta() {
	const stub = env.POLLER.getByName(
		"singleton",
	) as DurableObjectStub<PollerApuracao>;
	await stub.consultarAgora();
}

async function limparPoller() {
	const stub = env.POLLER.getByName("singleton");
	await runInDurableObject(stub, async (_inst, state) => {
		await state.storage.deleteAll();
	});
}

function texto(frases: string[]): string {
	return frases.join(" | ").replace(/<[^>]+>/g, "");
}

describe("GET /api/apuracao — Presidente por UF e faixa de destaques (#7)", () => {
	let tse: ReturnType<typeof instalarTseFalso>;

	beforeEach(() => {
		tse = instalarTseFalso({ proporcionais: "cadeiras" });
	});

	afterEach(async () => {
		await limparPoller();
	});

	it("com uma UF respondendo erro, o ciclo termina e as demais UFs atualizam", async () => {
		tse.simularErroUf("rr", 503);
		await forcarConsulta();
		const dados = await lerApuracao();

		expect(dados.erro).toBeNull();
		expect(dados.ufs).toBeTruthy();
		expect(dados.ufs!.sp).toMatchObject({ uf: "sp", nome: "São Paulo" });
		expect(dados.ufs!.ba).toMatchObject({ uf: "ba", nome: "Bahia" });
		expect(dados.ufs!.zz).toMatchObject({ uf: "zz", nome: "Exterior" });
		// Roraima falhou: não entra no estado (ou fica ausente).
		expect(dados.ufs!.rr).toBeUndefined();
		// 27 UFs + exterior (br fica de fora — é o arquivo nacional).
		const pedidosUf = tse.pedidos.filter((p) =>
			/\/dados\/(?!br\/)[a-z]{2}\/[a-z]{2}-c0001-/.test(p.url),
		);
		expect(pedidosUf.length).toBe(28);
		expect(
			pedidosUf.some((p) => p.url.includes("/dados/rr/")),
		).toBe(true);
		expect(
			pedidosUf.some((p) => p.url.includes("/dados/sp/")),
		).toBe(true);
	});

	it("com 429 no meio do loop de UFs, o ciclo seguinte mantém as UFs já buscadas", async () => {
		// Ordem estável: ac, al, am, ap, ba, … — 429 em ba após 4 UFs com 200.
		tse.simular429Uf("ba", 90);
		await forcarConsulta();
		const apos429 = await lerApuracao();
		expect(apos429.erro).toMatch(/429/);
		// Dados das UFs já consultadas precisam ter sido persistidos com a ETag.
		expect(apos429.ufs?.ac).toMatchObject({ uf: "ac", nome: "Acre" });
		expect(apos429.ufs?.al).toMatchObject({ uf: "al", nome: "Alagoas" });
		expect(apos429.ufs?.am).toMatchObject({ uf: "am", nome: "Amazonas" });
		expect(apos429.ufs?.ap).toMatchObject({ uf: "ap", nome: "Amapá" });
		expect(apos429.ufs?.ba).toBeUndefined();

		const pedidosApos429 = tse.pedidos.length;
		await forcarConsulta();
		const depois = await lerApuracao();
		expect(depois.erro).toBeNull();
		// As UFs do primeiro trecho continuam presentes (não “sumiram” por 304 sem dado).
		expect(depois.ufs?.ac).toMatchObject({ uf: "ac", nome: "Acre" });
		expect(depois.ufs?.al).toMatchObject({ uf: "al", nome: "Alagoas" });
		expect(depois.ufs?.am).toMatchObject({ uf: "am", nome: "Amazonas" });
		expect(depois.ufs?.ap).toMatchObject({ uf: "ap", nome: "Amapá" });
		expect(depois.ufs?.ba).toMatchObject({ uf: "ba", nome: "Bahia" });
		expect(Object.keys(depois.ufs!).length).toBe(28);

		// UFs já buscadas no ciclo do 429 devem ter ido com If-None-Match.
		const pedidosSegundo = tse.pedidos.slice(pedidosApos429);
		for (const uf of ["ac", "al", "am", "ap"] as const) {
			const pedido = pedidosSegundo.find((p) =>
				p.url.includes(`/dados/${uf}/`),
			);
			expect(pedido?.ifNoneMatch).toMatch(/^"/);
		}
	});

	it("a partir das fixtures, a API traz placar, regiões, colégios, disputa, ritmo, exterior e intercalação 2:1 com o Pará", async () => {
		await forcarConsulta();
		// Segunda leitura: Presidente avança (vantagem muda) e proporcionais reais (cadeiras).
		tse.avancar();
		tse.avancarProporcionais();
		await forcarConsulta();

		const dados = await lerApuracao();
		expect(dados.ufs).toBeTruthy();
		expect(Object.keys(dados.ufs!).length).toBe(28);

		const frases = dados.analise?.destaques ?? [];
		expect(frases.length).toBeGreaterThan(10);
		const t = texto(frases);

		// Placar dos estados (exterior fora da conta) — gravação real.
		expect(t).toMatch(/placar dos estados/i);
		expect(t).toMatch(/Flavio Bolsonaro lidera em 16 UFs/i);
		expect(t).toMatch(/Lula lidera em 11 UFs/i);

		// 5 regiões.
		for (const reg of [
			"Norte",
			"Nordeste",
			"Centro-Oeste",
			"Sudeste",
			"Sul",
		]) {
			expect(t).toContain(`Presidente · ${reg}`);
		}

		// 8 maiores colégios (por eleitorado real do TSE).
		for (const nome of [
			"São Paulo",
			"Minas Gerais",
			"Rio de Janeiro",
			"Bahia",
			"Paraná",
			"Rio Grande do Sul",
			"Pernambuco",
			"Ceará",
		]) {
			expect(t).toContain(`Presidente · ${nome}`);
		}

		// Disputa mais apertada / maior vantagem (só UFs com ≥5% apurado).
		expect(t).toMatch(/disputa mais apertada/i);
		expect(t).toMatch(/Pará/);
		expect(t).toMatch(/maior vantagem/i);
		expect(t).toMatch(/Roraima/);

		// Mais adiantado / mais atrasado.
		expect(t).toMatch(/mais adiantado:\s*Distrito Federal/i);
		expect(t).toMatch(/mais atrasado:\s*Alagoas/i);

		// Exterior.
		expect(t).toMatch(/Presidente · Exterior/);

		// Itens do Pará.
		expect(t).toMatch(/Apuração.*Brasil.*Pará/i);
		expect(t).toMatch(/Presidente · Brasil/i);
		expect(t).toMatch(/Governador · Pará/i);
		// Variação da vantagem do Presidente entre as duas leituras das fixtures.
		expect(t).toMatch(/vantagem caiu [\d,]+ p\.p\. na última leitura/i);
		expect(t).toMatch(/Senado · Pará/i);
		expect(t).toMatch(/2ª vaga/i);
		expect(t).toMatch(/Comparecimento.*Brasil.*Pará/i);
		// Cadeiras que mudaram (ciclo real: PSD ganhou / PSB perdeu).
		expect(t).toMatch(/Dep\. Federal/i);
		expect(t).toMatch(/(ganhou|perdeu) \d+ cadeira/i);
		// Disputa interna mais apertada.
		expect(t).toMatch(/disputa interna mais apertada/i);

		// Intercalação 2 Brasil : 1 Pará.
		const rotulos = frases.map((f) => {
			const m = /<b>([^<]+)<\/b>/.exec(f);
			return m?.[1] ?? f;
		});
		let i = 0;
		while (i < rotulos.length) {
			const loteBr = [];
			while (
				i < rotulos.length &&
				loteBr.length < 2 &&
				!ehPara(rotulos[i]!)
			) {
				loteBr.push(rotulos[i]!);
				i++;
			}
			if (loteBr.length === 0 && i < rotulos.length && ehPara(rotulos[i]!)) {
				// Sobrou só Pará no fim — ok.
				i++;
				continue;
			}
			expect(loteBr.length).toBeGreaterThan(0);
			expect(loteBr.every((r) => !ehPara(r))).toBe(true);
			if (i < rotulos.length && ehPara(rotulos[i]!)) {
				i++;
			}
		}
	});
});

function ehPara(rotulo: string): boolean {
	if (rotulo === "Apuração" || rotulo === "Comparecimento") return true;
	if (rotulo === "Presidente · Brasil") return true;
	if (rotulo.startsWith("Governador")) return true;
	if (rotulo.startsWith("Senado")) return true;
	if (rotulo.startsWith("Dep.")) return true;
	return false;
}
