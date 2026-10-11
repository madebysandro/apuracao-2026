import { preferirCalmo } from "./calmo.js";

/**
 * Captura a posição Y de elementos com `data-flip` antes do re-render.
 * @returns {Map<string, number>}
 */
export function capturarFlip() {
	const m = new Map();
	for (const el of document.querySelectorAll("[data-flip]")) {
		m.set(el.dataset.flip, el.getBoundingClientRect().top);
	}
	return m;
}

/**
 * FLIP: linhas que trocam de posição deslizam; novas entram com fade.
 * @param {Map<string, number>} antes
 */
export function flip(antes) {
	if (preferirCalmo() || !antes?.size) return;
	for (const el of document.querySelectorAll("[data-flip]")) {
		const y0 = antes.get(el.dataset.flip);
		if (y0 == null) {
			el.animate([{ opacity: 0 }, { opacity: 1 }], {
				duration: 500,
				easing: "ease-out",
			});
			continue;
		}
		const dy = y0 - el.getBoundingClientRect().top;
		if (Math.abs(dy) > 1) {
			el.animate(
				[{ transform: `translateY(${dy}px)` }, { transform: "none" }],
				{ duration: 700, easing: "cubic-bezier(.2,.8,.2,1)" },
			);
		}
	}
}
