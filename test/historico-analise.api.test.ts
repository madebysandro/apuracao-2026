/**
 * Aceite da issue #5 — histórico de leituras e análises das majoritárias.
 * Seam: API HTTP (`/api/historico`, `/api/apuracao` → analise.majoritarias).
 */
import { runInDurableObject } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PollerApuracao } from "../src/poller/poller";
import { instalarTseFalso } from "./helpers/tse-falso";

type LeituraApi = {
	t: number;
	c: Record<
		string,
		{
			ap: number;
			hora: string;
			vv: number;
			c: Record<string, [number, number, number]>;
		}
	>;
};

type TendenciaApi = { n: string; nome: string; ppPor10pct: number };

type AnaliseMajApi = {
	defensor: { n: string; nome: string; votos: number; pct: number };
	perseguidor: { n: string; nome: string; votos: number; pct: number };
	vantagemVotos: number;
	vantagemPp: number;
	evolucaoVantagemPp: number[];
	validosAApurar: number | null;
	margemParaVirarPp: number | null;
	foraDeAlcance: boolean;
	primeiroTurno: null | {
		fatiaPct: number | null;
		status: "ok" | "maioria" | "fora";
	};
	tendencias: TendenciaApi[];
};

type ApuracaoApi = {
	versao: number;
	cargos: {
		presidente?: {
			apurado: number;
			hora: string;
			totais: {
				validos: number;
				eleitorado: number;
				eleitoradoApurado: number;
			};
			candidatos: Array<{ n: string; nome: string; votos: number; pct: number }>;
		};
		governador?: {
			hora: string;
			apurado: number;
			candidatos: Array<{ n: string; votos: number; pct: number }>;
		};
		senador?: {
			candidatos: Array<{ n: string; nome: string; votos: number; pct: number }>;
		};
	};
	analise?: {
		majoritarias?: Record<string, AnaliseMajApi>;
	};
};

async function lerApuracao(): Promise<ApuracaoApi> {
	const resposta = await exports.default.fetch(
		new Request("http://apuracao.test/api/apuracao"),
	);
	expect(resposta.status).toBe(200);
	return resposta.json() as Promise<ApuracaoApi>;
}

async function lerHistorico(desde = 0): Promise<LeituraApi[]> {
	const resposta = await exports.default.fetch(
		new Request(`http://apuracao.test/api/historico?desde=${desde}`),
	);
	expect(resposta.status).toBe(200);
	return resposta.json() as Promise<LeituraApi[]>;
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

describe("GET /api/historico — leituras das majoritárias (#5)", () => {
	let tse: ReturnType<typeof instalarTseFalso>;

	beforeEach(() => {
		tse = instalarTseFalso();
	});

	afterEach(async () => {
		await limparPoller();
	});

	it("avançando as fixtures, cada mudança gera uma Leitura; repetir a mesma resposta não gera; desde devolve só as novas", async () => {
		await forcarConsulta();
		const h1 = await lerHistorico();
		expect(h1).toHaveLength(1);
		expect(h1[0].c.presidente?.hora).toBe("18:32:24");
		expect(h1[0].c.presidente?.c["22"]?.[0]).toBe(18644760);
		expect(h1[0].c.governador).toBeTruthy();
		expect(h1[0].c.senador).toBeTruthy();
		const t0 = h1[0].t;

		// Mesma resposta (304): não grava leitura nova.
		await forcarConsulta();
		expect(await lerHistorico()).toHaveLength(1);
		expect(await lerHistorico(t0)).toHaveLength(0);

		tse.avancar();
		await forcarConsulta();
		const h2 = await lerHistorico();
		expect(h2).toHaveLength(2);
		expect(h2[1].c.presidente?.hora).toBe("18:37:14");
		expect(h2[1].c.presidente?.c["22"]?.[0]).toBe(21383323);
		expect(h2[1].t).toBeGreaterThan(t0);

		const soNovas = await lerHistorico(t0);
		expect(soNovas).toHaveLength(1);
		expect(soNovas[0].t).toBe(h2[1].t);
		expect(soNovas[0].c.presidente?.hora).toBe("18:37:14");

		// Persiste no storage do DO (sobrevive a nova leitura do estado).
		const stub = env.POLLER.getByName("singleton");
		const gravado = await runInDurableObject(stub, async (_inst, state) =>
			state.storage.get<LeituraApi[]>("historico"),
		);
		expect(gravado).toHaveLength(2);
	});
});

describe("GET /api/apuracao — analise.majoritarias (#5)", () => {
	let tse: ReturnType<typeof instalarTseFalso>;

	beforeEach(() => {
		tse = instalarTseFalso();
	});

	afterEach(async () => {
		await limparPoller();
	});

	it("na primeira leitura, devolve votos a apurar, margem e 1º turno; tendência ainda aguarda", async () => {
		await forcarConsulta();
		const dados = await lerApuracao();
		const p = dados.analise?.majoritarias?.presidente;
		expect(p).toBeTruthy();

		// Literais independentes das fórmulas (fixtures 18:32).
		expect(p!.defensor.n).toBe("22");
		expect(p!.perseguidor.n).toBe("13");
		expect(p!.vantagemVotos).toBe(3_526_861);
		expect(p!.vantagemPp).toBeCloseTo(9.598698968, 6);
		expect(p!.validosAApurar).toBeCloseTo(83_541_013.27083544, 2);
		expect(p!.margemParaVirarPp).toBeCloseTo(4.221712021335087, 6);
		expect(p!.foraDeAlcance).toBe(false);
		expect(p!.primeiroTurno?.status).toBe("ok");
		expect(p!.primeiroTurno?.fatiaPct).toBeCloseTo(49.67297200584066, 6);
		expect(p!.tendencias).toEqual([]);
		expect(p!.evolucaoVantagemPp).toHaveLength(1);

		const g = dados.analise?.majoritarias?.governador;
		expect(g!.defensor.n).toBe("20");
		expect(g!.perseguidor.n).toBe("15");
		expect(g!.vantagemVotos).toBe(173_113);
		expect(g!.validosAApurar).toBeCloseTo(2_590_976.053396561, 2);
		expect(g!.margemParaVirarPp).toBeCloseTo(6.681381704514898, 6);
		expect(g!.primeiroTurno?.status).toBe("ok");

		// Senado: disputa 2º × 3º; sem 1º turno.
		const s = dados.analise?.majoritarias?.senador;
		expect(s!.defensor.n).toBe("222");
		expect(s!.defensor.nome).toBe("DELEGADO ÉDER MAURO");
		expect(s!.perseguidor.n).toBe("200");
		expect(s!.perseguidor.nome).toBe("ZEQUINHA MARINHO");
		expect(s!.vantagemVotos).toBe(78_211);
		expect(s!.margemParaVirarPp).toBeCloseTo(1.5568563271092684, 6);
		expect(s!.primeiroTurno).toBeNull();
	});

	it("com 3 leituras e avanço real na apuração, a tendência aparece com sinal e ordem de grandeza da regressão", async () => {
		await forcarConsulta();
		expect(
			(await lerApuracao()).analise?.majoritarias?.presidente?.tendencias,
		).toEqual([]);

		tse.avancar();
		await forcarConsulta();
		expect(
			(await lerApuracao()).analise?.majoritarias?.presidente?.tendencias,
		).toEqual([]);

		tse.avancar();
		await forcarConsulta();
		const p = (await lerApuracao()).analise?.majoritarias?.presidente;
		expect(p!.tendencias.length).toBeGreaterThanOrEqual(2);

		const t22 = p!.tendencias.find((t) => t.n === "22");
		const t13 = p!.tendencias.find((t) => t.n === "13");
		expect(t22).toBeTruthy();
		expect(t13).toBeTruthy();
		// Flavio cai ~0,35 p.p. a cada 10% apurado; Lula sobe ~0,30.
		// (regressão sobre % arredondados do histórico, como no protótipo)
		expect(t22!.ppPor10pct).toBeCloseTo(-0.34623498054450036, 6);
		expect(t13!.ppPor10pct).toBeCloseTo(0.3039779242303382, 6);

		expect(p!.evolucaoVantagemPp).toHaveLength(3);
		expect(p!.vantagemVotos).toBe(4_309_702);
		expect(p!.validosAApurar).toBeCloseTo(72_068_643.47001496, 2);
		expect(p!.margemParaVirarPp).toBeCloseTo(5.97999600449411, 6);
	});

	it("no Governador quase no fim, margem fica fora de alcance e o líder já tem a maioria (est.)", async () => {
		await forcarConsulta();
		tse.avancarGovernador();
		await forcarConsulta();

		const g = (await lerApuracao()).analise?.majoritarias?.governador;
		expect(g).toBeTruthy();
		expect(g!.foraDeAlcance).toBe(true);
		expect(g!.margemParaVirarPp).toBeGreaterThan(100);
		expect(g!.primeiroTurno?.status).toBe("maioria");
		expect(g!.primeiroTurno?.fatiaPct).toBeLessThanOrEqual(0);
		expect(
			(await lerApuracao()).cargos.governador?.hora,
		).toBe("20:59:59");
	});
});
