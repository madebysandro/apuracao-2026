/**
 * Issue #2 — sequência real início → meio → fim, servida em ordem via MSW.
 * Seam: GET /api/apuracao com o TSE interceptado.
 */
import { runInDurableObject } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PollerApuracao } from "../src/poller/poller";
import {
	CICLOS_NOITE,
	instalarTseFalso,
	resolverArquivo,
} from "./helpers/tse-falso";

type ApuracaoApi = {
	versao: number;
	cargos: {
		presidente?: { hora: string; apurado: number };
		governador?: { hora: string; apurado: number };
	};
	ufs?: Record<string, { uf: string }>;
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

describe("GET /api/apuracao — sequência real da noite (#2)", () => {
	let tse: ReturnType<typeof instalarTseFalso>;

	beforeEach(() => {
		tse = instalarTseFalso({ sequenciaNoite: true });
	});

	afterEach(async () => {
		await limparPoller();
	});

	it("serve início → meio → fim em ordem, com UFs e metadados de ETag do índice", async () => {
		expect(CICLOS_NOITE).toHaveLength(3);
		expect(tse.cicloAtual()).toBe(CICLOS_NOITE[0]);

		// Início: leitura completa com 28 UFs (27 + exterior).
		await forcarConsulta();
		const inicio = await lerApuracao();
		expect(inicio.versao).toBe(1);
		expect(inicio.cargos.presidente?.hora).toBe("18:32:24");
		expect(inicio.cargos.presidente?.apurado).toBeCloseTo(31.896372144, 6);
		expect(inicio.cargos.governador?.hora).toBe("18:34:46");
		expect(Object.keys(inicio.ufs ?? {})).toHaveLength(28);
		expect(resolverArquivo("presidente", CICLOS_NOITE[0])?.etag).toMatch(
			/^"/,
		);
		expect(resolverArquivo("pres-sp", CICLOS_NOITE[0])?.cacheControl).toMatch(
			/max-age=/,
		);

		// Meio da noite.
		tse.avancar();
		expect(tse.cicloAtual()).toBe(CICLOS_NOITE[1]);
		await forcarConsulta();
		const meio = await lerApuracao();
		expect(meio.versao).toBe(2);
		expect(meio.cargos.presidente?.hora).toBe("20:16:43");
		expect(meio.cargos.presidente!.apurado).toBeCloseTo(90.04482742, 6);
		expect(meio.cargos.governador!.apurado).toBeGreaterThan(80);
		// UFs acumuladas (as que não mudaram no meio continuam do início).
		expect(Object.keys(meio.ufs ?? {}).length).toBe(28);

		// Fim da cópia (~21h BRT): Governador quase encerrado.
		tse.avancar();
		expect(tse.cicloAtual()).toBe(CICLOS_NOITE[2]);
		await forcarConsulta();
		const fim = await lerApuracao();
		expect(fim.versao).toBe(3);
		expect(fim.cargos.presidente?.hora).toBe("21:00:07");
		expect(fim.cargos.presidente!.apurado).toBeCloseTo(98.196086915, 6);
		expect(fim.cargos.governador?.hora).toBe("20:59:59");
		expect(fim.cargos.governador!.apurado).toBeCloseTo(96.931867288, 6);
	});

	it("entre duas consultas no mesmo ciclo, o Presidente responde 304 (ETag)", async () => {
		await forcarConsulta();
		const pedidosApos = tse.pedidos.length;
		await forcarConsulta();
		const pedidos = tse.pedidos.slice(pedidosApos);
		const pres = pedidos.filter((p) => p.url.includes("/dados/br/"));
		expect(pres.length).toBeGreaterThanOrEqual(1);
		expect(pres.every((p) => p.ifNoneMatch?.startsWith('"'))).toBe(true);
		const apos = await lerApuracao();
		expect(apos.versao).toBe(1);
	});
});
