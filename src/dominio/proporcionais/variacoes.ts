import type {
	AnaliseProporcional,
	Cargo,
	DisputaInterna,
} from "../tipos";

/**
 * Instantâneo mínimo para variação de posição e de cadeiras.
 * A issue #5 pode substituir esta fonte pelo histórico de Leituras.
 */
export type InstantaneoProporcional = {
	posPorCandidato: Record<string, number>;
	cadeirasPorAgr: Record<string, number>;
};

/**
 * Interface pequena que a #5 pode trocar: hoje o poller guarda primeiro/anterior
 * em chaves próprias do Durable Object; depois pode ler do histórico de Leituras.
 */
export interface FonteVariacoesProporcionais {
	obterAnterior(cargoId: string): Promise<InstantaneoProporcional | null>;
	obterPrimeiro(cargoId: string): Promise<InstantaneoProporcional | null>;
	registrar(
		cargoId: string,
		atual: InstantaneoProporcional,
	): Promise<void>;
}

export function instantaneoDe(cargo: Cargo): InstantaneoProporcional {
	return {
		posPorCandidato: Object.fromEntries(
			cargo.candidatos.map((c) => [c.n, c.pos]),
		),
		cadeirasPorAgr: Object.fromEntries(
			(cargo.agremiacoes ?? []).map((a) => [a.sigla, a.vagas]),
		),
	};
}

/** Anexa deltaPos (leitura anterior) e deltaCadeiras (primeira leitura). */
export function aplicarVariacoes(
	cargo: Cargo,
	anterior: InstantaneoProporcional | null,
	primeiro: InstantaneoProporcional | null,
): Cargo {
	const candidatos = cargo.candidatos.map((c) => {
		const posAnt = anterior?.posPorCandidato[c.n];
		return {
			...c,
			deltaPos:
				anterior == null
					? null
					: posAnt == null
						? null
						: posAnt - c.pos,
		};
	});

	const agremiacoes = (cargo.agremiacoes ?? []).map((a) => {
		const ini = primeiro?.cadeirasPorAgr[a.sigla];
		return {
			...a,
			deltaCadeiras:
				primeiro == null ? null : a.vagas - (ini ?? 0),
		};
	});

	return { ...cargo, candidatos, agremiacoes };
}

/**
 * Por agremiação com cadeira: último projetado × 1º válido fora da projeção,
 * ordenado pela menor diferença de votos.
 */
export function disputaInterna(cargo: Cargo): DisputaInterna[] {
	const projetados = cargo.candidatos.filter((c) => c.projetado);
	const itens: DisputaInterna[] = [];

	for (const agr of cargo.agremiacoes ?? []) {
		if (agr.vagas <= 0) continue;
		const doAgr = projetados
			.filter((c) => c.agr === agr.sigla)
			.sort((a, b) => b.votos - a.votos);
		const ultimo = doAgr.at(-1);
		const proximo = cargo.candidatos
			.filter((c) => c.agr === agr.sigla && !c.projetado && c.valido)
			.sort((a, b) => b.votos - a.votos)[0];
		if (!ultimo || !proximo) continue;
		itens.push({
			sigla: agr.sigla,
			ultimo: { n: ultimo.n, nome: ultimo.nome, votos: ultimo.votos },
			proximo: {
				n: proximo.n,
				nome: proximo.nome,
				votos: proximo.votos,
			},
			diferenca: ultimo.votos - proximo.votos,
		});
	}

	return itens.sort((a, b) => a.diferenca - b.diferenca);
}

export function analiseProporcional(cargo: Cargo): AnaliseProporcional {
	return { disputaInterna: disputaInterna(cargo) };
}
