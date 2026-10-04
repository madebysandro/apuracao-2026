/**
 * Ponto de extensão da issue #4.
 * A Tela 1 de produção (Presidente + Governador + Senado) é renderizada por
 * `painel/variante-d.js` (`dbMaj` / `dbTela1`). Este arquivo permanece para
 * o paralelismo documentado no README — não é importado pelo `app.js` atual.
 */

/** @deprecated Use o painel variante D; mantido só como marcador de módulo. */
export function renderizarPresidente() {
	return `<section class="db-card"><p class="db-vazio">Use public/js/painel/variante-d.js</p></section>`;
}
