/** Cartão da Tela 1 — Presidente. Isolado para a issue #4 expandir majoritárias. */

const formatarPct = new Intl.NumberFormat("pt-BR", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});
const formatarInt = new Intl.NumberFormat("pt-BR");

export function renderizarPresidente(cargo) {
	if (!cargo) {
		return `<section class="cartao"><p class="vazio">Aguardando primeira leitura do TSE…</p></section>`;
	}

	const linhas = cargo.candidatos
		.slice(0, 8)
		.map(
			(c) => `<li class="cand">
        <span class="pos">${c.pos}º</span>
        <span class="nome">${escapar(c.nome)}</span>
        <span class="pct">${formatarPct.format(c.pct)}%</span>
        <span class="partido">${escapar(c.partido)}</span>
        <span class="votos">${formatarInt.format(c.votos)} votos</span>
      </li>`,
		)
		.join("");

	return `<section class="cartao" aria-labelledby="titulo-presidente">
    <header>
      <div>
        <h1 id="titulo-presidente">${escapar(cargo.titulo)}</h1>
        <small>${escapar(cargo.local)} · dados oficiais do TSE</small>
      </div>
      <div class="apurado">${formatarPct.format(cargo.apurado)}% das seções</div>
    </header>
    <ol class="ranking">${linhas}</ol>
  </section>`;
}

function escapar(texto) {
	return String(texto)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}
