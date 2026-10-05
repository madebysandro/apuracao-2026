/**
 * PROTOTYPE — lê ?variant=A|B|C e monta a barra flutuante.
 * Não faz parte do design em avaliação.
 */
export const VARIANTES = {
	A: { nome: "só confiança", detalhe: "P0 · Encerrada + rodapé arquivo" },
	B: { nome: "A + hierarquia", detalhe: "P0+P1 · Presidente acima · abas PT · rótulos mobile" },
	C: { nome: "B + mobile/a11y", detalhe: "P0+P1+P2 · ARIA · waffle · pausa ticker" },
};

export function varianteAtual() {
	const v = (new URLSearchParams(location.search).get("variant") || "A").toUpperCase();
	return VARIANTES[v] ? v : "A";
}

export function eh(nivel) {
	const ordem = { A: 1, B: 2, C: 3 };
	return ordem[varianteAtual()] >= ordem[nivel];
}

export function irParaVariante(v) {
	const url = new URL(location.href);
	url.searchParams.set("variant", v);
	location.assign(url.href);
}

export function montarSwitcher() {
	if (document.getElementById("proto-switcher")) return;
	const keys = Object.keys(VARIANTES);
	const atual = varianteAtual();
	document.body.dataset.variant = atual;

	const banner = document.createElement("div");
	banner.id = "proto-banner";
	banner.textContent =
		"PROTOTIPO throwaway · deltas mínimos sobre o layout de produção · não é a noite ao vivo · 2º turno 25/10";
	document.body.prepend(banner);

	const bar = document.createElement("div");
	bar.id = "proto-switcher";
	bar.innerHTML = `
		<button type="button" data-ps="-1" aria-label="Variante anterior">←</button>
		<div class="ps-label"><b>${atual} — ${VARIANTES[atual].nome}</b><small>${VARIANTES[atual].detalhe}</small></div>
		<button type="button" data-ps="1" aria-label="Próxima variante">→</button>`;
	document.body.appendChild(bar);

	const ciclo = (dir) => {
		const i = keys.indexOf(varianteAtual());
		irParaVariante(keys[(i + dir + keys.length) % keys.length]);
	};
	bar.addEventListener("click", (ev) => {
		const b = ev.target.closest("[data-ps]");
		if (!b) return;
		ciclo(Number(b.dataset.ps));
	});
	document.addEventListener("keydown", (ev) => {
		if (
			ev.target instanceof HTMLInputElement ||
			ev.target instanceof HTMLTextAreaElement ||
			/** @type {HTMLElement} */ (ev.target).isContentEditable
		)
			return;
		if (ev.key === "ArrowLeft") ciclo(-1);
		if (ev.key === "ArrowRight") ciclo(1);
	});
}
