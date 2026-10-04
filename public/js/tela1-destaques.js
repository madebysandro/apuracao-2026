/**
 * Faixa DESTAQUES — as frases vêm prontas do servidor (`analise.destaques`).
 * Mantém um fallback mínimo se a API ainda não tiver UFs/destaques.
 */

/** @param {{ analise?: { destaques?: string[] }, cargos?: Record<string, unknown> }} dados */
export function destaques(dados) {
	const prontas = dados?.analise?.destaques;
	if (Array.isArray(prontas) && prontas.length) return prontas;
	return ["<b>Destaques</b>Aguardando a primeira leitura do TSE…"];
}
