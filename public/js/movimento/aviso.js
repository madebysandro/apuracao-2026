import { escapar } from "./formato.js";

let timer;

/**
 * Aviso discreto no canto (resume atualização / viradas).
 * Exige `#aviso` no HTML (role=status).
 *
 * @param {string} texto
 * @param {number} [ms=6000]
 */
export function aviso(texto, ms = 6000) {
	const el = document.getElementById("aviso");
	if (!el) return;
	el.innerHTML = `<i></i>${escapar(texto)}`;
	el.classList.add("on");
	clearTimeout(timer);
	timer = setTimeout(() => el.classList.remove("on"), ms);
}

/**
 * Monta o resumo típico da atualização (Presidente + viradas opcionais).
 *
 * @param {{
 *   hora?: string,
 *   apuradoAntes?: number,
 *   apuradoDepois?: number,
 *   viradas?: string[],
 * }} opts
 */
export function resumoAtualizacao(opts) {
	const pf = new Intl.NumberFormat("pt-BR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
	const partes = [];
	if (opts.hora) partes.push(`Atualizado às ${opts.hora}`);
	if (opts.apuradoAntes != null && opts.apuradoDepois != null) {
		partes.push(
			`Brasil ${pf.format(opts.apuradoAntes)}% → ${pf.format(opts.apuradoDepois)}%`,
		);
	}
	let texto = partes.join(" · ");
	if (opts.viradas?.length) {
		texto += ` · mudou a liderança em ${opts.viradas.join(", ")}`;
	}
	return texto;
}
