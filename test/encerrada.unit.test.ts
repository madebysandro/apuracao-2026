/**
 * Seam puro da #19: decidir se o estado já tem 100% em todos os escopos.
 */
import { describe, expect, it } from "vitest";
import { apuracaoTotalizada } from "../src/poller/encerrada";
import { numeroTse } from "../src/dominio/numeros";

const CARGOS = [
	"presidente",
	"governador",
	"senador",
	"depfed",
	"depest",
] as const;

const UFS = ["ac", "al", "zz"] as const;

function estadoCom(pct: number | Record<string, number>) {
	const valor = (id: string) =>
		typeof pct === "number" ? pct : (pct[id] ?? 100);
	return {
		cargos: Object.fromEntries(
			CARGOS.map((id) => [id, { apurado: valor(id) }]),
		),
		ufs: Object.fromEntries(UFS.map((uf) => [uf, { apurado: valor(uf) }])),
	};
}

describe("apuracaoTotalizada", () => {
	it("aceita pst \"100,00\" convertido via numeroTse", () => {
		expect(numeroTse("100,00")).toBe(100);
		expect(
			apuracaoTotalizada(estadoCom(numeroTse("100,00")), CARGOS, UFS),
		).toBe(true);
	});

	it("rejeita 99,99 em um cargo", () => {
		expect(
			apuracaoTotalizada(
				estadoCom({ governador: numeroTse("99,99") }),
				CARGOS,
				UFS,
			),
		).toBe(false);
	});

	it("rejeita UF faltando", () => {
		const e = estadoCom(100);
		delete e.ufs.zz;
		expect(apuracaoTotalizada(e, CARGOS, UFS)).toBe(false);
	});

	it("rejeita cargo faltando", () => {
		const e = estadoCom(100);
		delete e.cargos.depest;
		expect(apuracaoTotalizada(e, CARGOS, UFS)).toBe(false);
	});
});
