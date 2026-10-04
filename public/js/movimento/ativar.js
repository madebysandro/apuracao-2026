import { preferirCalmo } from "./calmo.js";
import { fmt } from "./formato.js";

/**
 * Após pintar o DOM: dispara contagens e transições de `data-anim`.
 * Telas 1/2 chamam isto depois de `innerHTML = …`.
 */
export function ativar() {
	requestAnimationFrame(() =>
		requestAnimationFrame(() => {
			for (const el of document.querySelectorAll("[data-anim]")) {
				el.style[el.dataset.anim] = el.dataset.para;
			}
		}),
	);

	if (preferirCalmo()) {
		for (const el of document.querySelectorAll(".conta")) {
			const para = +el.dataset.para;
			const t = el.dataset.t;
			el.textContent = fmt(para, t);
		}
		return;
	}

	for (const el of document.querySelectorAll(".conta")) {
		const de = +el.dataset.de;
		const para = +el.dataset.para;
		const t = el.dataset.t;
		const t0 = performance.now();
		if (de === para) {
			el.textContent = fmt(para, t);
			continue;
		}
		const passo = (agora) => {
			const k = Math.min(1, (agora - t0) / 1500);
			el.textContent = fmt(de + (para - de) * (1 - (1 - k) ** 3), t);
			if (k < 1) requestAnimationFrame(passo);
		};
		requestAnimationFrame(passo);
	}
}
