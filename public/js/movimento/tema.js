const CHAVE = "tema";

/** @returns {'escuro'|'claro'} */
export function lerTema() {
	try {
		const t = localStorage.getItem(CHAVE);
		if (t === "claro" || t === "escuro") return t;
		/* Compatível com o protótipo ('' = escuro, 'claro' = claro). */
		if (t === "") return "escuro";
	} catch {
		/* private mode */
	}
	return "escuro";
}

/** @param {'escuro'|'claro'} tema */
export function gravarTema(tema) {
	try {
		localStorage.setItem(CHAVE, tema);
	} catch {
		/* private mode */
	}
}

/** Aplica `data-tema` no `<html>` (ou body) a partir do localStorage. */
export function aplicarTemaSalvo(raiz = document.documentElement) {
	raiz.dataset.tema = lerTema();
}

/** Alterna claro ↔ escuro e persiste. @returns {'escuro'|'claro'} */
export function alternarTema(raiz = document.documentElement) {
	const prox = lerTema() === "claro" ? "escuro" : "claro";
	raiz.dataset.tema = prox;
	gravarTema(prox);
	return prox;
}

/**
 * Liga o botão `[data-tema-toggle]` (ou o seletor passado).
 * @param {string} [seletor='[data-tema-toggle]']
 */
export function ligarSeletorTema(seletor = "[data-tema-toggle]") {
	aplicarTemaSalvo();
	document.addEventListener("click", (e) => {
		const btn = e.target.closest?.(seletor);
		if (!btn) return;
		alternarTema();
	});
}
