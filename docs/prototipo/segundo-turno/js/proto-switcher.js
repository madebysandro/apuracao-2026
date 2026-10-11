/**
 * PROTOTYPE — ?variant= e a barra flutuante. NÃO faz parte do design em avaliação.
 * Técnica do protótipo anterior (branch proto/deltas-arquivo).
 */
export const VARIANTES = {
	pre: { nome: "antes das 17h", detalhe: "arquivo do TSE publicado, zerado" },
	parcial: { nome: "~35% apurado", detalhe: "ao vivo, 22 na frente" },
	virada: { nome: "~76%, liderança mudou", detalhe: "ao vivo, logo após a virada" },
	encerrado: { nome: "100%, eleito", detalhe: "eleito · resultado final" },
};
const CHAVES = Object.keys(VARIANTES);

export function varianteAtual() {
	const v = new URLSearchParams(location.search).get("variant");
	return VARIANTES[v] ? v : "parcial";
}

function ir(v) {
	const url = new URL(location.href);
	url.searchParams.set("variant", v);
	location.assign(url.href);
}

export function montarSwitcher() {
	const atual = varianteAtual();
	document.body.dataset.variant = atual;
	const banner = document.createElement("div");
	banner.id = "proto-banner";
	banner.innerHTML =
		"<b>DADOS DE EXEMPLO</b> · protótipo do 2º turno · números do 2º turno são fictícios · 1º turno e candidatos: dados reais do TSE";
	document.body.prepend(banner);
	// Banner fixo sob a faixa: o conteúdo desce a altura dele.
	const ajustar = () => (document.body.style.paddingTop = `calc(var(--faixa-altura) + ${banner.offsetHeight}px)`);
	ajustar();
	addEventListener("resize", ajustar);

	const bar = document.createElement("div");
	bar.id = "proto-switcher";
	bar.innerHTML = `<button type="button" data-ps="-1" aria-label="Estado anterior">←</button>
    <div class="ps-label"><b>${atual} — ${VARIANTES[atual].nome}</b><small>${VARIANTES[atual].detalhe} · ${CHAVES.indexOf(atual) + 1}/${CHAVES.length}</small></div>
    <button type="button" data-ps="1" aria-label="Próximo estado">→</button>`;
	document.body.append(bar);
	const ciclo = (d) => ir(CHAVES[(CHAVES.indexOf(atual) + d + CHAVES.length) % CHAVES.length]);
	bar.addEventListener("click", (ev) => {
		const b = ev.target.closest("[data-ps]");
		if (b) ciclo(Number(b.dataset.ps));
	});
	document.addEventListener("keydown", (ev) => {
		const t = ev.target;
		if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t?.isContentEditable) return;
		if (ev.key === "ArrowLeft") ciclo(-1);
		if (ev.key === "ArrowRight") ciclo(1);
	});
}
