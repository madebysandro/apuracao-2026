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
	/** Variação de posição desde a leitura anterior (positivo = subiu). */
	deltaPos?: number | null;
};

export type Agremiacao = {
	sigla: string;
	nome: string;
	federacao: boolean;
	nominais: number;
	legenda: number;
	votos: number;
	vagas: number;
	/** Variação de cadeiras desde a primeira leitura do acompanhamento. */
	deltaCadeiras?: number | null;
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
	agremiacoes?: Agremiacao[];
};

export type DisputaInterna = {
	sigla: string;
	ultimo: { n: string; nome: string; votos: number };
	proximo: { n: string; nome: string; votos: number };
	diferenca: number;
};

export type AnaliseProporcional = {
	disputaInterna: DisputaInterna[];
};

export type AnaliseApuracao = {
	proporcionais?: Record<string, AnaliseProporcional>;
};

export type EstadoApuracao = {
	versao: number;
	consultadoEm: number | null;
	proximaConsulta: number | null;
	erro: string | null;
	cargos: Record<string, Cargo>;
	analise?: AnaliseApuracao;
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
			/** Agremiações: [votos, vagas] — usado nas proporcionais. */
			a?: Record<string, [number, number]>;
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
