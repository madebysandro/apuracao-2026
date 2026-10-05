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

	it("escopos a 100% em ciclos diferentes + ciclo seguinte todo 304 → encerra", async () => {
		// Ciclo 1: só o governador atrasa — os demais já estão a 100% com tf final.
		tse.definirVarianteSecoes({
			padrao: "100,00",
			tf: "s",
			porChave: { governador: "99,99" },
		});
		await forcarConsulta();
		const parcial = await lerApuracao();
		expect(parcial.encerrada).toBeFalsy();
		expect(parcial.cargos.governador?.apurado).toBeCloseTo(99.99, 5);
		expect(parcial.cargos.presidente?.apurado).toBe(100);
		expect(await lerAlarme()).toEqual(expect.any(Number));

		// Ciclo 2: governador chega a 100%; os outros respondem 304 (etag igual).
		tse.definirVarianteSecoes({ padrao: "100,00", tf: "s" });
		await forcarConsulta();
		const aposUltimo = await lerApuracao();
		// Pode encerrar já aqui (304 nos demais + dado guardado) ou no ciclo 304.
		if (!aposUltimo.encerrada) {
			expect(aposUltimo.cargos.governador?.apurado).toBe(100);
			expect(await lerAlarme()).toEqual(expect.any(Number));
		}

		// Ciclo 3: tudo 304 — com o dado guardado, tem de encerrar e não reagendar.
		const pedidosAntes = tse.pedidos.length;
		await forcarConsulta();
		const fim = await lerApuracao();
		expect(fim.encerrada).toBe(true);
		expect(fim.proximaConsulta).toBeNull();
		expect(fim.cargos.governador?.apurado).toBe(100);
		expect(Object.keys(fim.ufs ?? {})).toHaveLength(28);
		expect(await lerAlarme()).toBeNull();
		// Se já tinha encerrado no ciclo 2, consultar() retorna cedo (sem novos pedidos).
		if (aposUltimo.encerrada) {
			expect(tse.pedidos.length).toBe(pedidosAntes);
		} else {
			expect(tse.pedidos.length).toBeGreaterThan(pedidosAntes);
		}
	});

	it("ciclo todo 304 com escopo guardado em tf \"n\" ou < 100% continua", async () => {
		// 100% mas tf ainda "n": guarda o marcador e não encerra.
		tse.definirVarianteSecoes({ padrao: "100,00", tf: "n" });
		await forcarConsulta();
		expect((await lerApuracao()).encerrada).toBeFalsy();

		const pedidosApos200 = tse.pedidos.length;
		await forcarConsulta(); // tudo 304, tf "n" permanece no estado
		const apos304Tf = await lerApuracao();
		expect(apos304Tf.encerrada).toBeFalsy();
		expect(apos304Tf.proximaConsulta).toEqual(expect.any(Number));
		expect(await lerAlarme()).toEqual(expect.any(Number));
		expect(tse.pedidos.length).toBeGreaterThan(pedidosApos200);

		await limparPoller();
		tse = instalarTseFalso();

		// < 100% com tf "s": 304 seguinte também não encerra.
		tse.definirVarianteSecoes({ padrao: "99,99", tf: "s" });
		await forcarConsulta();
		expect((await lerApuracao()).cargos.presidente?.apurado).toBeCloseTo(
			99.99,
			5,
		);
		await forcarConsulta();
		const apos304Pct = await lerApuracao();
		expect(apos304Pct.encerrada).toBeFalsy();
		expect(apos304Pct.proximaConsulta).toEqual(expect.any(Number));
		expect(await lerAlarme()).toEqual(expect.any(Number));
	});
});
