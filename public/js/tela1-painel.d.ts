export function renderizarPainel(ctx: {
	cargos: Record<string, unknown>;
	analise?: unknown;
	hist: unknown[];
	tela: 1 | 2;
	graficos: Map<string, unknown>;
	horaTse: string;
	erro?: string | null;
	encerrada?: boolean;
}): string;
