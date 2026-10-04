import { animaProp } from "./conta.js";
import { escapar } from "./formato.js";

/**
 * Atributos para uma cadeira trocar de cor com transição CSS.
 * Use com `.cadeira` e `--i` para a onda contínua.
 *
 * @param {string} k chave estável (ex.: "depfed-seat-3")
 * @param {string} cor cor CSS (hex da agremiação)
 * @param {number} i índice na onda
 */
export function attrsCadeira(k, cor, i = 0) {
	return `${animaProp(k, "background", cor, `--i:${i}`, "")}`;
}

/**
 * HTML de um waffle de cadeiras.
 *
 * @param {string} prefixo chave (ex.: "depfed")
 * @param {{ cor: string, titulo?: string }[]} ocupantes
 */
export function htmlCadeiras(prefixo, ocupantes) {
	return ocupantes
		.map(
			(x, i) =>
				`<span class="cadeira" title="${escapar(x.titulo ?? "")}" ${attrsCadeira(`${prefixo}-seat-${i}`, x.cor, i)}></span>`,
		)
		.join("");
}
