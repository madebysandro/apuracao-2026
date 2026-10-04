/** Formatação pt-BR usada pelas contagens e deltas. */

const nf = new Intl.NumberFormat("pt-BR");
const pf = new Intl.NumberFormat("pt-BR", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

/** @param {number} v @param {'n'|'p'} t */
export function fmt(v, t = "n") {
	return t === "p" ? `${pf.format(v)}%` : nf.format(Math.round(v));
}

export function escapar(texto) {
	return String(texto ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

/** Delta em pontos percentuais (▲/▼). */
export function deltaPp(v, neutro = false) {
	const r = Math.round(v * 100) / 100;
	if (!r) return '<span class="delta">= 0,00</span>';
	const cls = neutro ? "" : r > 0 ? "sobe" : "desce";
	return `<span class="delta ${cls}">${r > 0 ? "▲" : "▼"} ${pf.format(Math.abs(r))}</span>`;
}

export function deltaInt(v) {
	if (!v) return '<span class="delta">=</span>';
	return `<span class="delta ${v > 0 ? "sobe" : "desce"}">${v > 0 ? "▲" : "▼"} ${Math.abs(v)}</span>`;
}
