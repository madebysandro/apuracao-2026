import { preferirCalmo } from "./calmo.js";

/**
 * Desliza a troca entre telas (abas).
 *
 * @param {object} opts
 * @param {number} opts.de tela atual (1 ou 2)
 * @param {number} opts.para tela destino
 * @param {HTMLElement|null} opts.atual elemento `.tela` atual
 * @param {() => void} opts.pintar callback que redesenha a tela nova
 * @param {string} [opts.seletorNova='.tela']
 */
export async function deslizarAba({ de, para, atual, pintar, seletorNova = ".tela" }) {
	if (para === de) return;
	const dir = para > de ? 1 : -1;
	if (atual && !preferirCalmo()) {
		await atual
			.animate(
				[
					{ opacity: 1, transform: "none" },
					{ opacity: 0, transform: `translateX(${-24 * dir}px)` },
				],
				{ duration: 180, easing: "ease-in", fill: "forwards" },
			)
			.finished.catch(() => {});
	}
	pintar();
	const nova = document.querySelector(seletorNova);
	if (nova && !preferirCalmo()) {
		nova.animate(
			[
				{ opacity: 0, transform: `translateX(${24 * dir}px)` },
				{ opacity: 1, transform: "none" },
			],
			{ duration: 320, easing: "cubic-bezier(.2,.8,.2,1)" },
		);
	}
}
