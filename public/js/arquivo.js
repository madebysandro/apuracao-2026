/** Decisões da variante A (arquivo do 1º turno). Sem document. */

export function apuracaoArquivada(dados) {
	if (!dados || dados.erro) return false;
	if (dados.encerrada) return true;
	return dados.proximaConsulta == null && dados.consultadoEm != null;
}

/** @param {import("./arquivo.js").SinaisApuracao | null | undefined} dados */
export function apresentarFaixa(dados) {
	if (dados?.erro) {
		return {
			modo: "instavel",
			rotulo: "TSE instável",
			consulta: true,
			carimbo: null,
			rotuloTse: "Dados do TSE",
			mostrarIdade: true,
		};
	}
	if (apuracaoArquivada(dados)) {
		return {
			modo: "arquivo",
			rotulo: "Encerrada",
			consulta: false,
			carimbo: "Arquivo · 1º turno",
			rotuloTse: "Última atualização do TSE",
			mostrarIdade: false,
		};
	}
	return {
		modo: "ao-vivo",
		rotulo: "Ao vivo",
		consulta: true,
		carimbo: null,
		rotuloTse: "Dados do TSE",
		mostrarIdade: true,
	};
}

export function limitesContagem(visto, valor, arquivada) {
	if (arquivada) return { de: valor, animar: false };
	const de = visto == null ? 0 : visto;
	return { de, animar: de !== valor };
}

export function nascerBarra(alvo, arquivada) {
	if (arquivada) return { v: alvo, vel: 0, energia: 0, parts: [], acum: 0 };
	return { v: 0, vel: 0, energia: 1, parts: [], acum: 0 };
}

export const MSG_FIGURA_ARQUIVO =
	"Resultado final do 1º turno · evolução por leitura indisponível neste arquivo";

export function figuraSemLinha(encerrada, apurado, temLinha) {
	return (encerrada || apurado === 100) && !temLinha;
}

export function textoTendenciaVazia({ encerrada, apurado }) {
	if (encerrada || apurado === 100) {
		return {
			valor: "tendência encerrada com 100% das seções",
			sub: "não há mais seções a apurar neste turno",
		};
	}
	return {
		valor: "aguardando mais leituras",
		sub: "aparece a partir da 3ª leitura com avanço na apuração",
	};
}

export function kpiAcompanhamento({ arquivada, hora, nLeituras, inicio }) {
	if (arquivada) {
		return {
			rotulo: "Última atualização",
			valor: hora || "—",
			sub: "última atualização do TSE · 1º turno encerrado · 2º turno em 25/10",
		};
	}
	const n = nLeituras;
	return {
		rotulo: "Acompanhamento",
		valor: `${n} ${n === 1 ? "leitura" : "leituras"}`,
		sub: `desde ${inicio} · o TSE publica a cada poucos minutos`,
	};
}

export function htmlRodapeArquivo() {
	return `<span class="db-arquivo">Arquivo do 1º turno (encerrado). Acompanhe o 2º turno em 25/10. Fonte oficial: <a href="https://resultados.tse.jus.br/" target="_blank" rel="noopener">resultados.tse.jus.br</a>.</span>`;
}
