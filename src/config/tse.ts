import type { MetaCargo } from "../dominio/tipos";

export type ConfigTse = {
	base: string;
	eleicaoFederal: string;
	eleicaoEstadual: string;
};

export function configTseDeEnv(env: {
	TSE_BASE: string;
	ELEICAO_FEDERAL: string;
	ELEICAO_ESTADUAL: string;
}): ConfigTse {
	return {
		base: env.TSE_BASE.replace(/\/$/, ""),
		eleicaoFederal: env.ELEICAO_FEDERAL,
		eleicaoEstadual: env.ELEICAO_ESTADUAL,
	};
}

/** Metas dos cargos monitorados: majoritários (#4) e proporcionais (#6). */
export function metasCargos(cfg: ConfigTse): MetaCargo[] {
	return [
		{
			id: "presidente",
			titulo: "Presidente",
			local: "Brasil",
			ele: cfg.eleicaoFederal,
			uf: "br",
			cd: "0001",
		},
		{
			id: "governador",
			titulo: "Governador",
			local: "Pará",
			ele: cfg.eleicaoEstadual,
			uf: "pa",
			cd: "0003",
		},
		{
			id: "senador",
			titulo: "Senador",
			local: "Pará",
			ele: cfg.eleicaoEstadual,
			uf: "pa",
			cd: "0005",
		},
		{
			id: "depfed",
			titulo: "Deputado Federal",
			local: "Pará",
			ele: cfg.eleicaoEstadual,
			uf: "pa",
			cd: "0006",
		},
		{
			id: "depest",
			titulo: "Deputado Estadual",
			local: "Pará",
			ele: cfg.eleicaoEstadual,
			uf: "pa",
			cd: "0007",
		},
	];
}

export function urlArquivoCargo(cfg: ConfigTse, cargo: MetaCargo): string {
	const ele6 = cargo.ele.padStart(6, "0");
	return `${cfg.base}/ele2026/${cargo.ele}/dados/${cargo.uf}/${cargo.uf}-c${cargo.cd}-e${ele6}-u.json`;
}

export function urlFoto(
	cfg: ConfigTse,
	cargo: MetaCargo,
	sqcand: string,
): string {
	return `${cfg.base}/ele2026/${cargo.ele}/fotos/${cargo.uf}/${sqcand}.jpeg`;
}
