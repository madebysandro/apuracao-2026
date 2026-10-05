export type ModoFaixa = "arquivo" | "ao-vivo" | "instavel";

export type SinaisApuracao = {
	encerrada?: boolean;
	erro?: string | null;
	proximaConsulta?: number | null;
	consultadoEm?: number | null;
};

export type FaixaApresentacao = {
	modo: ModoFaixa;
	rotulo: string;
	consulta: boolean;
	carimbo: string | null;
	rotuloTse: string;
	mostrarIdade: boolean;
};

export type EstadoBarra = {
	v: number;
	vel: number;
	energia: number;
	parts: unknown[];
	acum: number;
};

export function apuracaoArquivada(
	dados: SinaisApuracao | null | undefined,
): boolean;

export function apresentarFaixa(
	dados: SinaisApuracao | null | undefined,
): FaixaApresentacao;

/** `de` da contagem. No arquivo, nasce no valor final (sem 0→100 nem 80→100). */
export function limitesContagem(
	visto: number | null | undefined,
	valor: number,
	arquivada: boolean,
): { de: number; animar: boolean };

/** Barra de fluxo. No arquivo, nasce no alvo, sem energia. */
export function nascerBarra(alvo: number, arquivada: boolean): EstadoBarra;

export function figuraSemLinha(
	encerrada: boolean,
	apurado: number,
	temLinha: boolean,
): boolean;

export const MSG_FIGURA_ARQUIVO: string;

export function textoTendenciaVazia(opts: {
	encerrada: boolean;
	apurado: number;
}): { valor: string; sub: string };

export function kpiAcompanhamento(opts: {
	arquivada: boolean;
	hora: string | null | undefined;
	nLeituras: number;
	inicio: string;
}): { rotulo: string; valor: string; sub: string };

export function htmlRodapeArquivo(): string;
