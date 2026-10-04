import { preferirCalmo } from "./calmo.js";
import { memoria } from "./memoria.js";

/**
 * Calcula o clip inicial do gráfico (revela só o trecho novo).
 * Guarda o último X (ex.: % apurado) em `memoria` sob `graf-${id}`.
 *
 * @param {string} id id estável do gráfico
 * @param {number} xAtual último valor no eixo X (ex.: apurado)
 * @param {(x: number) => number} paraPx converte X → pixels
 * @param {number} larguraSvg
 * @param {number} margemEsq
 * @param {boolean} [animar=true]
 * @returns {{ de: number, para: number }}
 */
export function clipRevelacao(
	id,
	xAtual,
	paraPx,
	larguraSvg,
	margemEsq,
	animar = true,
) {
	const chave = `graf-${id}`;
	const apAnt = memoria.get(chave);
	const de =
		!animar || preferirCalmo()
			? larguraSvg
			: apAnt == null
				? margemEsq
				: Math.min(larguraSvg, paraPx(apAnt) + 1);
	memoria.set(chave, xAtual);
	return { de, para: larguraSvg };
}

/**
 * Anima atributos `data-tw` (ex.: width do clipPath) com ease-out cúbico.
 * Chamar após inserir o SVG no DOM.
 */
export function animarRevelacao(raiz = document) {
	if (preferirCalmo()) {
		for (const r of raiz.querySelectorAll("[data-tw]")) {
			r.setAttribute(r.dataset.tw, r.dataset.para);
		}
		return;
	}
	for (const r of raiz.querySelectorAll("[data-tw]")) {
		const attr = r.dataset.tw;
		const de = +r.getAttribute(attr);
		const para = +r.dataset.para;
		const t0 = performance.now();
		if (de === para) continue;
		const passo = (agora) => {
			const k = Math.min(1, (agora - t0) / 1100);
			r.setAttribute(attr, String(de + (para - de) * (1 - (1 - k) ** 3)));
			if (k < 1) requestAnimationFrame(passo);
		};
		requestAnimationFrame(passo);
	}
}

/**
 * HTML de um `<clipPath>` que revela o trecho novo.
 * @param {string} id
 * @param {number} altura
 * @param {number} de
 * @param {number} para
 */
export function htmlClipPath(id, altura, de, para) {
	return `<clipPath id="cl-${id}"><rect x="0" y="0" height="${altura}" width="${de}" data-tw="width" data-para="${para}"/></clipPath>`;
}
