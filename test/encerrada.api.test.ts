/**
 * Issue #19 — poller para de consultar o TSE quando a apuração chega a 100%.
 * Seam: GET /api/apuracao + alarme do Durable Object, com fixtures reais (#2) derivadas.
 */
import { runInDurableObject } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PollerApuracao } from "../src/poller/poller";
import { instalarTseFalso } from "./helpers/tse-falso";

type ApuracaoApi = {
	versao: number;
	consultadoEm: number | null;
	proximaConsulta: number | null;
	erro: string | null;
	encerrada?: boolean;
	cargos: {
		presidente?: { apurado: number; hora: string };
		governador?: { apurado: number };
		senador?: { apurado: number };
		depfed?: { apurado: number };
		depest?: { apurado: number };
	};
	ufs?: Record<string, { apurado: number }>;
};

async function lerApuracao(): Promise<ApuracaoApi> {
	const resposta = await exports.default.fetch(
		new Request("http://apuracao.test/api/apuracao"),
	);
	expect(resposta.status).toBe(200);
	return resposta.json() as Promise<ApuracaoApi>;
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

async function cancelarAlarme() {
	const stub = env.POLLER.getByName("singleton");
	await runInDurableObject(stub, async (_inst, state) => {
		await state.storage.deleteAlarm();
	});
}

describe("Poller — encerramento a 100% (#19)", () => {
	let tse: ReturnType<typeof instalarTseFalso>;

	beforeEach(() => {
		tse = instalarTseFalso();
	});

	afterEach(async () => {
		await limparPoller();
	});

	it("com tudo a 100% (pst \"100,00\"), grava encerrada e não agenda alarme", async () => {
		tse.definirVarianteSecoes({ padrao: "100,00", tf: "s" });
		await forcarConsulta();
		const dados = await lerApuracao();

		expect(dados.encerrada).toBe(true);
		expect(dados.proximaConsulta).toBeNull();
		expect(dados.erro).toBeNull();
		expect(dados.cargos.presidente?.apurado).toBe(100);
		expect(dados.cargos.governador?.apurado).toBe(100);
		expect(dados.cargos.senador?.apurado).toBe(100);
		expect(dados.cargos.depfed?.apurado).toBe(100);
		expect(dados.cargos.depest?.apurado).toBe(100);
		expect(Object.keys(dados.ufs ?? {})).toHaveLength(28);
		expect(await lerAlarme()).toBeNull();
	});

	it("com um cargo a 99,99%, continua agendando o alarme", async () => {
		tse.definirVarianteSecoes({
			padrao: "100,00",
			tf: "s",
			porChave: { governador: "99,99" },
		});
		await forcarConsulta();
		const dados = await lerApuracao();

		expect(dados.encerrada).toBeFalsy();
		expect(dados.proximaConsulta).toEqual(expect.any(Number));
		expect(dados.cargos.governador?.apurado).toBeCloseTo(99.99, 5);
		expect(dados.cargos.presidente?.apurado).toBe(100);
		expect(await lerAlarme()).toEqual(expect.any(Number));
	});

	it("visitante depois do fim não religa o alarme", async () => {
		tse.definirVarianteSecoes({ padrao: "100,00", tf: "s" });
		await forcarConsulta();
		expect((await lerApuracao()).encerrada).toBe(true);
		expect(await lerAlarme()).toBeNull();

		// Simula DO sem alarme (como após deleteAlarm) e um visitante batendo na API.
		await cancelarAlarme();
		const pedidosAntes = tse.pedidos.length;
		const dados = await lerApuracao();

		expect(dados.encerrada).toBe(true);
		expect(dados.cargos.presidente?.apurado).toBe(100);
		expect(await lerAlarme()).toBeNull();
		// Não religou consultando o TSE de novo.
		expect(tse.pedidos.length).toBe(pedidosAntes);
	});

	it("com pst a 100% mas tf ainda \"n\", continua consultando", async () => {
		tse.definirVarianteSecoes({ padrao: "100,00", tf: "n" });
		await forcarConsulta();
		const dados = await lerApuracao();

		expect(dados.cargos.presidente?.apurado).toBe(100);
		expect(dados.encerrada).toBeFalsy();
		expect(dados.proximaConsulta).toEqual(expect.any(Number));
		expect(await lerAlarme()).toEqual(expect.any(Number));
	});

	it("erro no ciclo não encerra mesmo com fixtures a 100%", async () => {
		tse.definirVarianteSecoes({ padrao: "100,00", tf: "s" });
		tse.simularErro(503);
		await forcarConsulta();
		const dados = await lerApuracao();

		expect(dados.erro).toMatch(/503/);
		expect(dados.encerrada).toBeFalsy();
		expect(dados.proximaConsulta).toEqual(expect.any(Number));
		expect(await lerAlarme()).toEqual(expect.any(Number));
	});

	it("429 no ciclo não encerra mesmo com fixtures a 100%", async () => {
		tse.definirVarianteSecoes({ padrao: "100,00", tf: "s" });
		tse.simular429(90);
		await forcarConsulta();
		const dados = await lerApuracao();

		expect(dados.erro).toMatch(/429/);
		expect(dados.encerrada).toBeFalsy();
		expect(dados.proximaConsulta).toEqual(expect.any(Number));
		expect(await lerAlarme()).toEqual(expect.any(Number));
	});

	it("ciclo parcial (UF com falha) não encerra mesmo com o resto a 100%", async () => {
		tse.definirVarianteSecoes({ padrao: "100,00", tf: "s" });
		tse.simularErroUf("rr", 503);
		await forcarConsulta();
		const dados = await lerApuracao();

		expect(dados.erro).toBeNull();
		expect(dados.encerrada).toBeFalsy();
		expect(dados.ufs?.rr).toBeUndefined();
		expect(dados.proximaConsulta).toEqual(expect.any(Number));
		expect(await lerAlarme()).toEqual(expect.any(Number));
	});

	it("depois de encerrada, o histórico e o último estado continuam disponíveis", async () => {
		tse.definirVarianteSecoes({ padrao: "100,00", tf: "s" });
		await forcarConsulta();
		const estado = await lerApuracao();
		expect(estado.encerrada).toBe(true);
		expect(estado.versao).toBeGreaterThanOrEqual(1);

		const hist = await exports.default.fetch(
			new Request("http://apuracao.test/api/historico"),
		);
		expect(hist.status).toBe(200);
		const leituras = (await hist.json()) as unknown[];
		expect(leituras.length).toBeGreaterThanOrEqual(1);

		const deNovo = await lerApuracao();
		expect(deNovo.encerrada).toBe(true);
		expect(deNovo.cargos.presidente?.hora).toBe(
			estado.cargos.presidente?.hora,
		);
	});
});
