/** Cartão majoritário da Tela 1 (Presidente, Governador, Senado). */

const formatarPct = new Intl.NumberFormat("pt-BR", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});
const formatarInt = new Intl.NumberFormat("pt-BR");

export function escapar(texto) {
	return String(texto)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

/**
 * @param {object | null | undefined} cargo
 * @param {{ idTitulo?: string, limite?: number }} [opts]
 */
export function renderizarCartaoMajoritario(cargo, opts = {}) {
	const idTitulo = opts.idTitulo ?? `titulo-${cargo?.id ?? "cargo"}`;
	const limite = opts.limite ?? (cargo?.vagas === 2 ? 6 : 8);

	if (!cargo) {
		return `<section class="cartao"><p class="vazio">Aguardando primeira leitura do TSE…</p></section>`;
	}

	const duasVagas = cargo.vagas === 2;
	const rotuloVagas = duasVagas ? "2 vagas" : "1 vaga";
	const linhas = cargo.candidatos
		.slice(0, limite)
		.map((c) => {
			const marcaVaga =
				duasVagas && c.pos <= 2
					? `<span class="vaga-marca">${c.pos}ª vaga</span>`
					: "";
			return `<li class="cand${duasVagas && c.pos <= 2 ? " cand-vaga" : ""}">
        <span class="pos">${c.pos}º</span>
        <span class="nome">${escapar(c.nome)}${marcaVaga}</span>
        <span class="pct">${formatarPct.format(c.pct)}%</span>
        <span class="partido">${escapar(c.partido)}</span>
        <span class="votos">${formatarInt.format(c.votos)} votos</span>
      </li>`;
		})
		.join("");

	return `<section class="cartao" aria-labelledby="${escapar(idTitulo)}">
    <header>
      <div>
        <h2 id="${escapar(idTitulo)}">${escapar(cargo.titulo)}${duasVagas ? "es" : ""}</h2>
        <small>${escapar(cargo.local)} · ${rotuloVagas} · dados oficiais do TSE</small>
      </div>
      <div class="apurado">${formatarPct.format(cargo.apurado)}% das seções</div>
    </header>
    <ol class="ranking">${linhas}</ol>
  </section>`;
}
