import { urlFoto, type ConfigTse } from "../../config/tse";
import { numeroTse } from "../numeros";
import type { Agremiacao, Candidato, Cargo, MetaCargo } from "../tipos";
import type { DadosBrutosCargo } from "./presidente";

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
		const cands: Candidato[] = (agr.par ?? [])
			.flatMap((par) =>
				(par.cand ?? []).map((cand) => ({
					n: String(cand.n ?? ""),
					nome: String(cand.nmu ?? ""),
					partido: String(par.sg ?? ""),
					agr: sigla,
					votos: Number(cand.vap) || 0,
					pct: numeroTse(cand.pvapn),
					eleito: cand.e === "s",
					situacao: String(cand.st ?? ""),
					valido: cand.dvt === "Válido",
					foto: urlFoto(cfg, meta, String(cand.sqcand ?? "")),
					pos: 0,
				})),
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
		totais: {
			eleitorado: Number(dados.e?.te) || 0,
			eleitoradoApurado: Number(dados.e?.est) || 0,
			comparecimento: numeroTse(dados.e?.pcn),
			abstencao: numeroTse(dados.e?.pan),
			validos: Number(dados.v?.vv) || 0,
			legenda: Number(dados.v?.vl) || 0,
			brancos: numeroTse(dados.v?.pvbn),
			nulos: numeroTse(dados.v?.ptvnn),
		},
		candidatos,
		agremiacoes,
	};
}

export function ehCargoProporcional(id: string): boolean {
	return id === "depfed" || id === "depest";
}
