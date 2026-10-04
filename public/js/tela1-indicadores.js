/** Indicadores do topo da Tela 1: seções apuradas e comparecimento. */

const formatarPct = new Intl.NumberFormat("pt-BR", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

function item(rotulo, valor, extra = "") {
	const num =
		valor == null || Number.isNaN(valor) ? "—" : `${formatarPct.format(valor)}%`;
	return `<div class="indicador">
    <span class="indicador-rotulo">${rotulo}</span>
    <strong class="indicador-valor">${num}</strong>
    ${extra ? `<span class="indicador-extra">${extra}</span>` : ""}
  </div>`;
}

/**
 * @param {{ presidente?: { apurado: number, totais: { comparecimento: number, abstencao: number } }, governador?: { apurado: number, totais: { comparecimento: number, abstencao: number } } }} cargos
 */
export function renderizarIndicadores(cargos) {
	const P = cargos?.presidente;
	const G = cargos?.governador;
	if (!P && !G) {
		return `<div class="indicadores" data-indicadores>
      <p class="vazio">Indicadores aparecem após a primeira leitura do TSE.</p>
    </div>`;
	}

	const absBr =
		P?.totais?.abstencao != null
			? `abstenção ${formatarPct.format(P.totais.abstencao)}%`
			: "";
	const absPa =
		G?.totais?.abstencao != null
			? `abstenção ${formatarPct.format(G.totais.abstencao)}%`
			: "";

	return `<div class="indicadores" data-indicadores>
    ${item("Seções apuradas · Brasil", P?.apurado)}
    ${item("Seções apuradas · Pará", G?.apurado)}
    ${item("Comparecimento · Brasil", P?.totais?.comparecimento, absBr)}
    ${item("Comparecimento · Pará", G?.totais?.comparecimento, absPa)}
  </div>`;
}
