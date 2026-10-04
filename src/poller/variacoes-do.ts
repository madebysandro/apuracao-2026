import {
	acumularSeries,
	type FonteVariacoesProporcionais,
	type InstantaneoProporcional,
	type SeriesProporcionais,
} from "../dominio/proporcionais/variacoes";

const prefixo = (cargoId: string, qual: "primeiro" | "anterior" | "series") =>
	`prop-var:${qual}:${cargoId}`;

/**
 * Implementação provisória no storage do Durable Object.
 * Chaves próprias (`prop-var:*`) para a #5 trocar pelo histórico de Leituras
 * sem mudar a interface `FonteVariacoesProporcionais`.
 */
export function fonteVariacoesDo(
	storage: DurableObjectStorage,
): FonteVariacoesProporcionais {
	return {
		async obterAnterior(cargoId) {
			return (
				(await storage.get<InstantaneoProporcional>(
					prefixo(cargoId, "anterior"),
				)) ?? null
			);
		},
		async obterPrimeiro(cargoId) {
			return (
				(await storage.get<InstantaneoProporcional>(
					prefixo(cargoId, "primeiro"),
				)) ?? null
			);
		},
		async obterSeries(cargoId) {
			return (
				(await storage.get<SeriesProporcionais>(
					prefixo(cargoId, "series"),
				)) ?? {}
			);
		},
		async registrar(cargoId, atual) {
			const primeiroKey = prefixo(cargoId, "primeiro");
			const jaTem = await storage.get<InstantaneoProporcional>(primeiroKey);
			if (!jaTem) {
				await storage.put(primeiroKey, atual);
			}
			const series = await storage.get<SeriesProporcionais>(
				prefixo(cargoId, "series"),
			);
			await storage.put(
				prefixo(cargoId, "series"),
				acumularSeries(series ?? {}, atual),
			);
			await storage.put(prefixo(cargoId, "anterior"), atual);
		},
	};
}
