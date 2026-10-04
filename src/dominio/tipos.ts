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
	/** Evolução do % (minilinha), acumulada no módulo de variações proporcionais. */
	seriePct?: number[];
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

export type CandidatoUf = {
	n: string;
	nome: string;
	votos: number;
	pct: number;
};

/** Presidente numa UF (ou exterior) — modelo da spec. */
export type UfPresidente = {
	uf: string;
	nome: string;
	hora: string;
	apurado: number;
	secoes: number;
	secoesApuradas: number;
	eleitorado: number;
	validos: number;
	candidatos: CandidatoUf[];
};

export type {
	AnaliseMajoritaria,
	TendenciaCandidato,
	PrimeiroTurnoAnalise,
	RefCandidatoAnalise,
} from "./majoritarias/analise";

import type { AnaliseMajoritaria } from "./majoritarias/analise";

export type AnaliseApuracao = {
	majoritarias?: Record<string, AnaliseMajoritaria>;
	proporcionais?: Record<string, AnaliseProporcional>;
	/** Frases HTML da faixa DESTAQUES (intercalação 2 Brasil : 1 Pará). */
	destaques?: string[];
};

export type EstadoApuracao = {
	versao: number;
	consultadoEm: number | null;
	proximaConsulta: number | null;
	erro: string | null;
	cargos: Record<string, Cargo>;
	ufs?: Record<string, UfPresidente>;
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
