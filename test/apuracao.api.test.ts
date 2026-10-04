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
import { instalarTseFalso } from "./helpers/tse-falso";

async function lerApuracao() {
	const resposta = await exports.default.fetch(
		new Request("http://apuracao.test/api/apuracao"),
	);
	expect(resposta.status).toBe(200);
	return resposta.json() as Promise<{
		versao: number;
		consultadoEm: number | null;
		cargos: {
			presidente?: {
				hora: string;
				apurado: number;
				candidatos: Array<{
					n: string;
					nome: string;
					partido: string;
					votos: number;
					pct: number;
					pos: number;
				}>;
			};
		};
	}>;
}

async function forcarConsulta() {
	const stub = env.POLLER.getByName("singleton") as DurableObjectStub<PollerApuracao>;
	await stub.consultarAgora();
}

describe("GET /api/apuracao — Presidente com TSE falso", () => {
	let tse: ReturnType<typeof instalarTseFalso>;

	beforeEach(() => {
		tse = instalarTseFalso();
	});

	afterEach(async () => {
		// Isolamento: limpa storage do DO entre casos.
		const stub = env.POLLER.getByName("singleton");
		await runInDurableObject(stub, async (_inst, state) => {
			await state.storage.deleteAll();
		});
	});

	it("com a primeira fixture, devolve o Presidente normalizado (vírgula, ordem, hora do TSE)", async () => {
		await forcarConsulta();
		const dados = await lerApuracao();

		expect(dados.versao).toBe(1);
		expect(dados.consultadoEm).toEqual(expect.any(Number));

		const p = dados.cargos.presidente;
		expect(p).toBeTruthy();
		expect(p!.hora).toBe("18:32:24");
		expect(p!.apurado).toBeCloseTo(31.896372144, 6);

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

		// Ordenado por votos decrescente.
		for (let i = 1; i < p!.candidatos.length; i++) {
			expect(p!.candidatos[i - 1].votos).toBeGreaterThanOrEqual(
				p!.candidatos[i].votos,
			);
		}
	});

	it("ao avançar a fixture, a versao muda; repetir a mesma resposta não muda a versao", async () => {
		await forcarConsulta();
		const primeiro = await lerApuracao();
		expect(primeiro.versao).toBe(1);
		expect(primeiro.cargos.presidente!.hora).toBe("18:32:24");

		// Mesma fixture / 304 via If-None-Match: versão estável.
		await forcarConsulta();
		const repetido = await lerApuracao();
		expect(repetido.versao).toBe(1);
		expect(repetido.cargos.presidente!.hora).toBe("18:32:24");

		tse.avancar();
		await forcarConsulta();
		const segundo = await lerApuracao();
		expect(segundo.versao).toBe(2);
		expect(segundo.cargos.presidente!.hora).toBe("18:37:14");
		expect(segundo.cargos.presidente!.apurado).toBeCloseTo(36.604052495, 6);
		expect(segundo.cargos.presidente!.candidatos[0].votos).toBe(21383323);

		// Alarme também consulta sem mudar se o TSE não avançou.
		const stub = env.POLLER.getByName("singleton");
		const rodou = await runDurableObjectAlarm(stub);
		expect(rodou).toBe(true);
		const aposAlarme = await lerApuracao();
		expect(aposAlarme.versao).toBe(2);
	});
});
