import { urlFoto, type ConfigTse } from "../../config/tse";
import { numeroTse } from "../numeros";
import type { Cargo, MetaCargo } from "../tipos";

/** Formato bruto do JSON de cargo do TSE (campos usados na normalização). */
export type DadosBrutosCargo = {
	hg?: string;
	s?: { pstn?: string };
	e?: { te?: string; est?: string; pcn?: string; pan?: string };
	v?: { vv?: string; vl?: string; pvbn?: string; ptvnn?: string };
	carg: Array<{
		nv?: string;
		qe?: string;
		agr: Array<{
			com?: string;
			nm?: string;
			tp?: string;
			vag?: string;
			par: Array<{
				sg?: string;
				tvtn?: string;
				tvtl?: string;
				cand: Array<{
					n?: string;
					nmu?: string;
					sqcand?: string;
					vap?: string;
					pvapn?: string;
					e?: string;
					st?: string;
					dvt?: string;
				}>;
			}>;
		}>;
	}>;
};

/**
 * Normaliza o arquivo de Presidente (Brasil) do TSE.
 * Separado por cargo para a issue #4/#6 poderem mexer em arquivos diferentes.
 */
export function normalizarPresidente(
	meta: MetaCargo,
	dados: DadosBrutosCargo,
	cfg: ConfigTse,
): Cargo {
	const carg = dados.carg[0];
	const vagas = Number(carg?.nv) || 1;
	const candidatos = (carg?.agr ?? [])
		.flatMap((agr) =>
			(agr.par ?? []).flatMap((par) =>
				(par.cand ?? []).map((cand) => ({
					n: String(cand.n ?? ""),
					nome: String(cand.nmu ?? ""),
					partido: String(par.sg ?? ""),
					agr: String(agr.com ?? "").replace(/\s+/g, ""),
					votos: Number(cand.vap) || 0,
					pct: numeroTse(cand.pvapn),
					eleito: cand.e === "s",
					situacao: String(cand.st ?? ""),
					valido: cand.dvt === "Válido",
					foto: urlFoto(cfg, meta, String(cand.sqcand ?? "")),
					pos: 0,
				})),
			),
		)
		.sort((a, b) => b.votos - a.votos);

	candidatos.forEach((c, i) => {
		c.pos = i + 1;
	});

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
	};
}
