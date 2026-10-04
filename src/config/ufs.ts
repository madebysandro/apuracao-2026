import type { ConfigTse } from "./tse";

/** 27 UFs + exterior (zz). Ordem estável para a consulta sequencial. */
export const NOMES_UF: Record<string, string> = {
	ac: "Acre",
	al: "Alagoas",
	am: "Amazonas",
	ap: "Amapá",
	ba: "Bahia",
	ce: "Ceará",
	df: "Distrito Federal",
	es: "Espírito Santo",
	go: "Goiás",
	ma: "Maranhão",
	mg: "Minas Gerais",
	ms: "Mato Grosso do Sul",
	mt: "Mato Grosso",
	pa: "Pará",
	pb: "Paraíba",
	pe: "Pernambuco",
	pi: "Piauí",
	pr: "Paraná",
	rj: "Rio de Janeiro",
	rn: "Rio Grande do Norte",
	ro: "Rondônia",
	rr: "Roraima",
	rs: "Rio Grande do Sul",
	sc: "Santa Catarina",
	se: "Sergipe",
	sp: "São Paulo",
	to: "Tocantins",
	zz: "Exterior",
};

export const SIGLAS_UF = Object.keys(NOMES_UF);

export const REGIOES: Record<string, string[]> = {
	Norte: ["ac", "am", "ap", "pa", "ro", "rr", "to"],
	Nordeste: ["al", "ba", "ce", "ma", "pb", "pe", "pi", "rn", "se"],
	"Centro-Oeste": ["df", "go", "ms", "mt"],
	Sudeste: ["es", "mg", "rj", "sp"],
	Sul: ["pr", "rs", "sc"],
};

export function urlPresidenteUf(cfg: ConfigTse, uf: string): string {
	const ele = cfg.eleicaoFederal;
	const ele6 = ele.padStart(6, "0");
	return `${cfg.base}/ele2026/${ele}/dados/${uf}/${uf}-c0001-e${ele6}-u.json`;
}
