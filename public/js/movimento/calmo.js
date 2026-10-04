/** Respeita prefers-reduced-motion — todas as animações consultam isto. */

const mq = matchMedia("(prefers-reduced-motion: reduce)");

/** @returns {boolean} preferência atual (não congela no boot). */
export function preferirCalmo() {
	return mq.matches;
}
