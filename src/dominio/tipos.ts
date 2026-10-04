/** Modelo de domínio (formato do protótipo, reduzido ao que a API devolve). */

export type TotaisCargo = {
	eleitorado: number;
	eleitoradoApurado: number;
	comparecimento: number;
	abstencao: number;
	validos: number;
	legenda: number;
	brancos: number;
	nulos: number;
};

export type Candidato = {
	n: string;
	nome: string;
	partido: string;
	agr: string;
	votos: number;
	pct: number;
	pos: number;
	eleito: boolean;
	situacao: string;
	valido: boolean;
	foto: string;
	projetado?: boolean;
	fila?: boolean;
};

export type Cargo = {
	id: string;
	titulo: string;
	local: string;
	vagas: number;
	apurado: number;
	hora: string;
	qe: number | null;
	totais: TotaisCargo;
	candidatos: Candidato[];
};

export type EstadoApuracao = {
	versao: number;
	consultadoEm: number | null;
	proximaConsulta: number | null;
	erro: string | null;
	cargos: Record<string, Cargo>;
};

/** Instantâneo compacto para tendência (formato do protótipo). */
export type Leitura = {
	t: number;
	c: Record<
		string,
		{
			ap: number;
			hora: string;
			vv: number;
			comp: number;
			bra: number;
			nul: number;
			c: Record<string, [number, number, number]>;
		}
	>;
};

export type MetaCargo = {
	id: string;
	titulo: string;
	local: string;
	ele: string;
	uf: string;
	cd: string;
};
