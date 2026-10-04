import { memoria } from "./memoria.js";
import { fmt } from "./formato.js";

/**
 * HTML de um número que conta do valor antigo ao novo.
 * Se mudou, ganha realce ~3 s; com `delta`, mostra ▲/▼.
 *
 * @param {string} k chave estável (ex.: "pres-22-pct")
 * @param {number} v valor novo
 * @param {'n'|'p'} [t='n'] inteiro ou percentual
 * @param {boolean} [delta=false] mostrar variação
 */
export function conta(k, v, t = "n", delta = false) {
	const tinha = memoria.has(k);
	const de = tinha ? memoria.get(k) : v;
	memoria.set(k, v);
	const mudou = tinha && fmt(de, t) !== fmt(v, t);
	const dif = Math.abs(v - de);
	const num = t === "p" ? fmt(dif, "p").replace("%", "") : fmt(dif, "n");
	return (
		`<span class="conta ${mudou ? "mudou" : ""}" data-de="${de}" data-para="${v}" data-t="${t}">${fmt(de, t)}</span>` +
		(mudou && delta
			? `<small class="delta ${v > de ? "sobe" : "desce"}">${v > de ? "▲" : "▼"} ${num}</small>`
			: "")
	);
}

/**
 * Atributos para animar uma propriedade CSS (ex.: width de barra).
 *
 * @param {string} k
 * @param {string} prop
 * @param {number} v
 * @param {string} [extra='']
 * @param {string} [un='%']
 */
export function animaProp(k, prop, v, extra = "", un = "%") {
	const de = memoria.has(k) ? memoria.get(k) : un === "%" ? 0 : v;
	memoria.set(k, v);
	return `data-anim="${prop}" data-para="${v}${un}" style="${prop}:${de}${un};${extra}"`;
}
