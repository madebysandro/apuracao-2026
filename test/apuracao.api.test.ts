/**
 * Único ponto de teste combinado: a API HTTP (`/api/apuracao`).
 * O TSE é substituído por fixtures provisórias via interceptação do fetch de saída.
 */
import {
	runDurableObjectAlarm,
	runInDurableObject,
} from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PollerApuracao } from "../src/poller/poller";
import { instalarTseFalso, URLS_TSE } from "./helpers/tse-falso";

type CandidatoApi = {
	n: string;
	nome: string;
	partido: string;
	votos: number;
	pct: number;
	pos: number;
};

type CargoApi = {
	titulo: string;
	local: string;
	vagas: number;
	hora: string;
	apurado: number;
	totais: {
		comparecimento: number;
		abstencao: number;
		eleitorado: number;
	};
	candidatos: CandidatoApi[];
};

type ApuracaoApi = {
	versao: number;
	consultadoEm: number | null;
	proximaConsulta: number | null;
	erro: string | null;
	cargos: {
		presidente?: CargoApi;
		governador?: CargoApi;
		senador?: CargoApi;
	};
};

async function lerApuracao(opts?: { headers?: HeadersInit }) {
	const resposta = await exports.default.fetch(
		new Request("http://apuracao.test/api/apuracao", {
			headers: opts?.headers,
		}),
	);
	expect(resposta.status).toBe(200);
	const dados = (await resposta.json()) as ApuracaoApi;
	return { dados, resposta };
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

async function lerAlarme(): Promise<number | null> {
	const stub = env.POLLER.getByName("singleton");
	return runInDurableObject(stub, async (_inst, state) =>
		state.storage.getAlarm(),
	);
}

describe("GET /api/apuracao — Tela 1 (Presidente, Governador, Senado)", () => {
	let tse: ReturnType<typeof instalarTseFalso>;

	beforeEach(() => {
		tse = instalarTseFalso();
	});

	afterEach(async () => {
		await limparPoller();
	});

	it("com a primeira fixture, devolve o Presidente normalizado (vírgula, ordem, hora do TSE)", async () => {
		await forcarConsulta();
		const { dados } = await lerApuracao();

		expect(dados.versao).toBe(1);
		expect(dados.consultadoEm).toEqual(expect.any(Number));
		expect(dados.proximaConsulta).toEqual(expect.any(Number));
		expect(dados.erro).toBeNull();

		const p = dados.cargos.presidente;
		expect(p).toBeTruthy();
		expect(p!.hora).toBe("18:32:24");
		expect(p!.apurado).toBeCloseTo(31.896372144, 6);
		expect(p!.vagas).toBe(1);

		expect(p!.candidatos[0]).toMatchObject({
			n: "22",
			nome: "FLAVIO BOLSONARO",
			partido: "PL",
			votos: 18644760,
			pos: 1,
		});
		expect(p!.candidatos[0].pct).toBeCloseTo(50.743547465, 6);

		expect(p!.candidatos[1]).toMatchObject({
			n: "13",
			nome: "LULA",
			partido: "PT",
			votos: 15117899,
			pos: 2,
		});
		expect(p!.candidatos[1].pct).toBeCloseTo(41.144848497, 6);

		for (let i = 1; i < p!.candidatos.length; i++) {
			expect(p!.candidatos[i - 1].votos).toBeGreaterThanOrEqual(
				p!.candidatos[i].votos,
			);
		}
	});

	it("devolve Governador (1 vaga) e Senado (2 vagas) do Pará com ranking ordenado", async () => {
		await forcarConsulta();
		const { dados } = await lerApuracao();

		const g = dados.cargos.governador;
		expect(g).toBeTruthy();
		expect(g!.titulo).toBe("Governador");
		expect(g!.local).toBe("Pará");
		expect(g!.vagas).toBe(1);
		expect(g!.hora).toBe("18:55:38");
		expect(g!.apurado).toBeCloseTo(56.758054449, 6);
		expect(g!.totais.comparecimento).toBeCloseTo(81.053361787, 6);
		expect(g!.totais.abstencao).toBeCloseTo(18.946638213, 6);
		expect(g!.candidatos[0]).toMatchObject({
			n: "20",
			nome: "DR. DANIEL",
			partido: "PODE",
			votos: 1348271,
			pos: 1,
		});
		expect(g!.candidatos[0].pct).toBeCloseTo(52.473320072, 6);
		expect(g!.candidatos[1]).toMatchObject({
			n: "15",
			nome: "HANA GHASSAN",
			partido: "MDB",
			votos: 1149167,
			pos: 2,
		});

		const s = dados.cargos.senador;
		expect(s).toBeTruthy();
		expect(s!.titulo).toBe("Senador");
		expect(s!.local).toBe("Pará");
		expect(s!.vagas).toBe(2);
		expect(s!.hora).toBe("18:56:09");
		expect(s!.apurado).toBeCloseTo(57.286215009, 6);
		expect(s!.candidatos[0]).toMatchObject({
			n: "151",
			nome: "HELDER",
			partido: "MDB",
			votos: 1269474,
			pos: 1,
		});
		expect(s!.candidatos[1]).toMatchObject({
			n: "222",
			nome: "DELEGADO ÉDER MAURO",
			partido: "PL",
			votos: 1168961,
			pos: 2,
		});
		expect(s!.candidatos[2]).toMatchObject({
			n: "200",
			nome: "ZEQUINHA MARINHO",
			partido: "PODE",
			votos: 1079430,
			pos: 3,
		});
		for (let i = 1; i < s!.candidatos.length; i++) {
			expect(s!.candidatos[i - 1].votos).toBeGreaterThanOrEqual(
				s!.candidatos[i].votos,
			);
		}
	});

	it("ao avançar a fixture, a versao muda; repetir a mesma resposta (304) não muda a versao", async () => {
		await forcarConsulta();
		const { dados: primeiro } = await lerApuracao();
		expect(primeiro.versao).toBe(1);
		expect(primeiro.cargos.presidente!.hora).toBe("18:32:24");

		const pedidosAposPrimeiro = tse.pedidos.length;
		await forcarConsulta();
		const { dados: repetido } = await lerApuracao();
		expect(repetido.versao).toBe(1);
		expect(repetido.cargos.presidente!.hora).toBe("18:32:24");

		const pedidosSegundoCiclo = tse.pedidos.slice(pedidosAposPrimeiro);
		expect(pedidosSegundoCiclo.length).toBeGreaterThanOrEqual(3);
		for (const pedido of pedidosSegundoCiclo) {
			expect(pedido.ifNoneMatch).toMatch(/^"/);
		}
		expect(
			pedidosSegundoCiclo.some((p) => p.url === URLS_TSE.presidente),
		).toBe(true);

		tse.avancar();
		await forcarConsulta();
		const { dados: segundo } = await lerApuracao();
		expect(segundo.versao).toBe(2);
		expect(segundo.cargos.presidente!.hora).toBe("18:37:14");
		expect(segundo.cargos.presidente!.apurado).toBeCloseTo(36.604052495, 6);
		expect(segundo.cargos.presidente!.candidatos[0].votos).toBe(21383323);

		const stub = env.POLLER.getByName("singleton");
		const rodou = await runDurableObjectAlarm(stub);
		expect(rodou).toBe(true);
		const { dados: aposAlarme } = await lerApuracao();
		expect(aposAlarme.versao).toBe(2);
	});

	it("agenda a próxima consulta em max(30 s, max-age) do cache-control", async () => {
		const antes = Date.now();
		tse.definirCacheControlPresidente("max-age=45");
		await forcarConsulta();
		const { dados } = await lerApuracao();
		const alarme = await lerAlarme();

		expect(dados.proximaConsulta).toEqual(expect.any(Number));
		expect(alarme).toEqual(expect.any(Number));
		// Último arquivo do ciclo (senador) traz max-age=58 → espera 58 s.
		expect(dados.proximaConsulta!).toBeGreaterThanOrEqual(antes + 58_000 - 50);
		expect(dados.proximaConsulta!).toBeLessThanOrEqual(Date.now() + 58_000 + 50);
		expect(alarme!).toBeGreaterThanOrEqual(antes + 58_000 - 50);
		expect(alarme!).toBeLessThanOrEqual(Date.now() + 58_000 + 50);
	});

	it("num 429 com Retry-After, a próxima consulta respeita o valor e registra erro", async () => {
		await forcarConsulta();
		const { dados: ok } = await lerApuracao();
		expect(ok.erro).toBeNull();
		const versaoOk = ok.versao;

		const antes = Date.now();
		tse.simular429(90);
		await forcarConsulta();
		const { dados } = await lerApuracao();

		expect(dados.erro).toMatch(/429/);
		expect(dados.versao).toBe(versaoOk);
		expect(dados.proximaConsulta!).toBeGreaterThanOrEqual(antes + 90_000 - 50);
		expect(dados.proximaConsulta!).toBeLessThanOrEqual(Date.now() + 90_000 + 50);
	});

	it("noutros erros, a espera dobra até 10 min e o erro aparece na API", async () => {
		await forcarConsulta();
		const versaoOk = (await lerApuracao()).dados.versao;

		const t1 = Date.now();
		tse.simularErro(503);
		await forcarConsulta();
		const erro1 = (await lerApuracao()).dados;
		expect(erro1.erro).toMatch(/503/);
		expect(erro1.versao).toBe(versaoOk);
		const espera1 = erro1.proximaConsulta! - t1;
		expect(espera1).toBeGreaterThanOrEqual(120_000 - 50);
		expect(espera1).toBeLessThanOrEqual(120_000 + 50);

		const t2 = Date.now();
		tse.simularErro(503);
		await forcarConsulta();
		const erro2 = (await lerApuracao()).dados;
		expect(erro2.erro).toMatch(/503/);
		const espera2 = erro2.proximaConsulta! - t2;
		expect(espera2).toBeGreaterThanOrEqual(240_000 - 50);
		expect(espera2).toBeLessThanOrEqual(240_000 + 50);

		// Acelera o backoff até o teto de 10 min sem precisar de muitas iterações.
		for (let i = 0; i < 4; i++) {
			tse.simularErro(503);
			await forcarConsulta();
		}
		const tTeto = Date.now();
		tse.simularErro(503);
		await forcarConsulta();
		const teto = (await lerApuracao()).dados;
		const esperaTeto = teto.proximaConsulta! - tTeto;
		expect(esperaTeto).toBeGreaterThanOrEqual(600_000 - 50);
		expect(esperaTeto).toBeLessThanOrEqual(600_000 + 50);
	});

	it("responde /api/apuracao com cache curto na borda (s-maxage)", async () => {
		await forcarConsulta();
		const { resposta } = await lerApuracao();
		const cc = resposta.headers.get("cache-control") ?? "";
		expect(cc).toMatch(/s-maxage=\d+/i);
		const sMaxAge = Number(/s-maxage=(\d+)/i.exec(cc)?.[1]);
		expect(sMaxAge).toBeGreaterThan(0);
		expect(sMaxAge).toBeLessThanOrEqual(30);
		// Visitantes podem refrescar; o browser não deve segurar por muito tempo.
		expect(cc).toMatch(/max-age=0|no-cache|must-revalidate/i);
	});
});
