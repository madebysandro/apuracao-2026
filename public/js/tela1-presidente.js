/** Cartão da Tela 1 — Presidente (classes db-* da variante D). */

const pf = new Intl.NumberFormat("pt-BR", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});
const nf = new Intl.NumberFormat("pt-BR");

function esc(texto) {
	return String(texto)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

function nomeBonito(s) {
	return String(s)
		.toLowerCase()
		.replace(/(^|[\s.-])(\p{L})/gu, (_m, a, b) => a + b.toUpperCase())
		.replace(/ (Da|De|Do|Dos|Das|E) /g, (w) => w.toLowerCase());
}

export function renderizarPresidente(cargo) {
	if (!cargo) {
		return `<div class="db-grade3"><article class="db-card"><p class="db-vazio">Aguardando primeira leitura do TSE…</p></article></div>`;
	}

	const linhas = cargo.candidatos
		.slice(0, 8)
		.map(
			(c, i) => `<li class="db-cand" data-flip="pres-${c.n}">
        <span class="db-sw" style="background:var(--s${(i % 8) + 1})"></span>
        <span class="db-nome"><b>${esc(nomeBonito(c.nome))}</b><small>${esc(c.partido)} · ${nf.format(c.votos)} votos</small></span>
        <span class="db-barra"><i style="width:${Math.min(100, c.pct)}%;background:var(--s${(i % 8) + 1})"></i></span>
        <span class="db-pct">${pf.format(c.pct)}%</span>
        <span class="db-delta">${c.pos}º</span>
      </li>`,
		)
		.join("");

	return `<div class="db-grade3"><article class="db-card">
    <header class="db-card-topo">
      <div><h2>${esc(cargo.titulo)}</h2><span>${esc(cargo.local)} · dados oficiais do TSE</span></div>
      <div class="db-apu">${pf.format(cargo.apurado)}%<small>das seções apuradas</small></div>
    </header>
    <ul class="db-cands">${linhas}</ul>
  </article></div>`;
}
