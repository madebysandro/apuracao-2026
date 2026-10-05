import type { ConfigTse } from "../../config/tse";
import { numeroTse } from "../numeros";
import type { Agremiacao, Cargo, MetaCargo } from "../tipos";
import type { DadosBrutosCargo } from "./dados-brutos";
import { candidatoDe, totaisDe } from "./majoritario";

/**
 * Normaliza Deputado Federal / Estadual a partir do JSON do TSE.
 * Cadeiras = `vag` da agremiação (calculado pelo TSE). Projetados = os `vag`
 * mais votados com `dvt` "Válido". Total da agremiação = nominais + legenda.
 */
export function normalizarProporcional(
	meta: MetaCargo,
	dados: DadosBrutosCargo,
	cfg: ConfigTse,
): Cargo {
	const carg = dados.carg[0];
	const vagas = Number(carg?.nv) || 1;

	const agremiacoesComCands = (carg?.agr ?? []).map((agr) => {
		const sigla = String(agr.com ?? "").replace(/\s+/g, "");
		const cands = (agr.par ?? [])
			.flatMap((par) =>
				(par.cand ?? []).map((cand) =>
					candidatoDe(cand, par, sigla, meta, cfg),
				),
			)
			.sort((a, b) => b.votos - a.votos);

		const vag = Number(agr.vag) || 0;
		const validos = cands.filter((c) => c.valido);
		for (const c of validos.slice(0, vag)) c.projetado = true;
		for (const c of validos.slice(vag, vag + 2)) c.fila = true;

		const nominais = (agr.par ?? []).reduce(
			(s, p) => s + (Number(p.tvtn) || 0),
			0,
		);
		const legenda = (agr.par ?? []).reduce(
			(s, p) => s + (Number(p.tvtl) || 0),
			0,
		);

		const resumo: Agremiacao = {
			sigla,
			nome: String(agr.nm ?? ""),
			federacao: agr.tp === "f",
			nominais,
			legenda,
			votos: nominais + legenda,
			vagas: vag,
		};
		return { resumo, cands };
	});

	const todos = agremiacoesComCands
		.flatMap((a) => a.cands)
		.sort((a, b) => b.votos - a.votos);
	todos.forEach((c, i) => {
		c.pos = i + 1;
	});

	const agremiacoes = agremiacoesComCands
		.map((a) => a.resumo)
		.sort((a, b) => b.vagas - a.vagas || b.votos - a.votos);

	// Ponytail: top vagas+15, todos os projetados e os 2 da fila de cada agr.
	const candidatos = todos.filter(
		(c, i) => i < vagas + 15 || c.projetado || c.fila,
	);

	return {
		id: meta.id,
		titulo: meta.titulo,
		local: meta.local,
		vagas,
		apurado: numeroTse(dados.s?.pstn),
		hora: String(dados.hg ?? ""),
		qe: Number(carg?.qe) || null,
		totais: totaisDe(dados),
		candidatos,
		agremiacoes,
	};
}

export function ehCargoProporcional(id: string): boolean {
	return id === "depfed" || id === "depest";
}
