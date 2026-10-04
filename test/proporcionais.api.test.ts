/**
 * Aceite da issue #6 — Tela 2 / proporcionais via GET /api/apuracao.
 * Seam: API HTTP; TSE substituído por fixtures (real + derivada).
 */
import { runInDurableObject } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PollerApuracao } from "../src/poller/poller";
import { instalarTseFalso } from "./helpers/tse-falso";

type CandApi = {
	n: string;
	nome: string;
	agr: string;
	votos: number;
	pos: number;
	valido: boolean;
	projetado?: boolean;
	fila?: boolean;
	deltaPos?: number | null;
};

type AgrApi = {
	sigla: string;
	federacao: boolean;
	nominais: number;
	legenda: number;
	votos: number;
	vagas: number;
	deltaCadeiras?: number | null;
};

type CargoProp = {
	id: string;
	vagas: number;
	hora: string;
	apurado: number;
	qe: number | null;
	totais: { validos: number; legenda: number; brancos: number; nulos: number };
	candidatos: CandApi[];
	agremiacoes: AgrApi[];
};

type Apuracao = {
	versao: number;
	cargos: {
		presidente?: unknown;
		depfed?: CargoProp;
		depest?: CargoProp;
	};
	analise?: {
		proporcionais?: Record<
			string,
			{
				disputaInterna: Array<{
					sigla: string;
					ultimo: { n: string; votos: number };
					proximo: { n: string; votos: number };
					diferenca: number;
				}>;
			}
		>;
	};
};

async function lerApuracao(): Promise<Apuracao> {
	const resposta = await exports.default.fetch(
		new Request("http://apuracao.test/api/apuracao"),
	);
	expect(resposta.status).toBe(200);
	return resposta.json() as Promise<Apuracao>;
}

async function forcarConsulta() {
	const stub = env.POLLER.getByName(
		"singleton",
	) as DurableObjectStub<PollerApuracao>;
	await stub.consultarAgora();
}

async function limparDo() {
	const stub = env.POLLER.getByName("singleton");
	await runInDurableObject(stub, async (_inst, state) => {
		await state.storage.deleteAll();
	});
}

describe("GET /api/apuracao — Deputados proporcionais do Pará", () => {
	let tse: ReturnType<typeof instalarTseFalso>;

	beforeEach(() => {
		tse = instalarTseFalso({ proporcionais: "real" });
	});

	afterEach(async () => {
		await limparDo();
	});

	it("projetados vêm do vag do TSE, inválidos nunca entram e total da agremiação é nominais+legenda", async () => {
		await forcarConsulta();
		const dados = await lerApuracao();
		const fed = dados.cargos.depfed;
		expect(fed).toBeTruthy();
		expect(fed!.vagas).toBe(17);
		expect(fed!.qe).toBe(158039);
		expect(fed!.hora).toBe("18:55:41");
		expect(fed!.apurado).toBeCloseTo(56.758054449, 6);

		const mdb = fed!.agremiacoes.find((a) => a.sigla === "MDB");
		expect(mdb).toMatchObject({
			nominais: 701929,
			legenda: 16957,
			votos: 718886,
			vagas: 6,
			federacao: false,
		});

		const fedPt = fed!.agremiacoes.find((a) => a.sigla === "PCDOB/PT/PV");
		expect(fedPt?.federacao).toBe(true);

		const projetados = fed!.candidatos.filter((c) => c.projetado);
		expect(projetados).toHaveLength(17);
		expect(projetados.every((c) => c.valido)).toBe(true);

		// Contagem por agremiação = vag do TSE (não “os 17 mais votados no geral”).
		for (const agr of fed!.agremiacoes) {
			const n = projetados.filter((c) => c.agr === agr.sigla).length;
			expect(n).toBe(agr.vagas);
		}

		// Em cada agremiação, os projetados são os vag válidos mais votados.
		for (const agr of fed!.agremiacoes.filter((a) => a.vagas > 0)) {
			const doAgr = fed!.candidatos
				.filter((c) => c.agr === agr.sigla && c.valido)
				.sort((a, b) => b.votos - a.votos);
			const esperados = new Set(doAgr.slice(0, agr.vagas).map((c) => c.n));
			const obtidos = new Set(
				projetados.filter((c) => c.agr === agr.sigla).map((c) => c.n),
			);
			expect(obtidos).toEqual(esperados);
			const fila = doAgr.slice(agr.vagas, agr.vagas + 2);
			for (const f of fila) {
				const cand = fed!.candidatos.find((c) => c.n === f.n);
				expect(cand?.fila).toBe(true);
				expect(cand?.projetado).toBeFalsy();
			}
		}

		expect(dados.cargos.depest?.vagas).toBe(41);
		expect(dados.cargos.depest?.qe).toBe(65432);
		expect(
			dados.cargos.depest!.candidatos.filter((c) => c.projetado),
		).toHaveLength(41);
	});

	it("na sequência com troca de cadeira, mostra +1/−1 desde o início, troca de projetado e exclui inválido", async () => {
		tse = instalarTseFalso({ proporcionais: "cadeiras" });

		await forcarConsulta();
		let dados = await lerApuracao();
		let fed = dados.cargos.depfed!;

		const invalido = fed.candidatos.find((c) => c.n === "2299");
		expect(invalido).toBeTruthy();
		expect(invalido!.valido).toBe(false);
		expect(invalido!.projetado).toBeFalsy();
		// Mesmo com mais votos que o líder do PL, a cadeira vai aos válidos.
		const plProj = fed.candidatos.filter(
			(c) => c.agr === "PL" && c.projetado,
		);
		expect(plProj).toHaveLength(3);
		expect(plProj.every((c) => c.valido)).toBe(true);
		expect(plProj.some((c) => c.n === "2299")).toBe(false);

		expect(fed.agremiacoes.find((a) => a.sigla === "PSD")?.vagas).toBe(3);
		expect(fed.agremiacoes.find((a) => a.sigla === "PSB")?.vagas).toBe(0);
		expect(fed.candidatos.find((c) => c.n === "5500")?.projetado).toBe(true);
		expect(fed.candidatos.find((c) => c.n === "4010")?.projetado).toBeFalsy();
		expect(fed.agremiacoes.find((a) => a.sigla === "PSD")?.deltaCadeiras).toBeNull();
		expect(fed.agremiacoes.find((a) => a.sigla === "PSB")?.deltaCadeiras).toBeNull();

		tse.avancarProporcionais();
		await forcarConsulta();
		dados = await lerApuracao();
		fed = dados.cargos.depfed!;

		expect(fed.agremiacoes.find((a) => a.sigla === "PSD")?.vagas).toBe(2);
		expect(fed.agremiacoes.find((a) => a.sigla === "PSB")?.vagas).toBe(1);
		expect(fed.agremiacoes.find((a) => a.sigla === "PSD")?.deltaCadeiras).toBe(
			-1,
		);
		expect(fed.agremiacoes.find((a) => a.sigla === "PSB")?.deltaCadeiras).toBe(
			1,
		);

		expect(fed.candidatos.find((c) => c.n === "5500")?.projetado).toBeFalsy();
		expect(fed.candidatos.find((c) => c.n === "4010")?.projetado).toBe(true);
		expect(fed.candidatos.find((c) => c.n === "2299")).toBeUndefined();
	});

	it("disputa interna vem ordenada pela menor diferença", async () => {
		await forcarConsulta();
		const dados = await lerApuracao();
		const disputa = dados.analise?.proporcionais?.depfed?.disputaInterna;
		expect(disputa?.length).toBeGreaterThan(2);

		for (let i = 1; i < disputa!.length; i++) {
			expect(disputa![i - 1].diferenca).toBeLessThanOrEqual(
				disputa![i].diferenca,
			);
		}

		expect(disputa![0]).toMatchObject({
			sigla: "PCDOB/PT/PV",
			ultimo: { n: "1321", votos: 45598 },
			proximo: { n: "1331", votos: 43394 },
			diferenca: 2204,
		});
	});
});
