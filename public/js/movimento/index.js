/**
 * Utilitários de movimento (issue #8) — API estável para Telas 1/2.
 *
 * A UI de alta fidelidade da variante D vive em `public/js/painel/variante-d.js`
 * (port quase literal do protótipo). Estes módulos continuam disponíveis para
 * #4/#6 plugarem contagem, FLIP, tema etc. sem depender do monólito do painel.
 *
 * Uso típico:
 * 1. CSS: classes `.db-*` em `/css/tema.css` (tokens, aurora, grades, ticker…)
 * 2. Números: `conta(chave, valor, 'p'|'n', delta?)` + `ativar()`
 * 3. Ranking: `data-flip` → `capturarFlip()` / `flip(antes)`
 * 4. Gráfico: `clipRevelacao` + `htmlClipPath` + `animarRevelacao`
 * 5. Cadeiras / abas / tema / aviso: ver exports abaixo
 */

export { preferirCalmo } from "./calmo.js";
export { memoria } from "./memoria.js";
export { fmt, escapar, deltaPp, deltaInt } from "./formato.js";
export { conta, animaProp } from "./conta.js";
export { ativar } from "./ativar.js";
export { aviso, resumoAtualizacao } from "./aviso.js";
export { capturarFlip, flip } from "./flip.js";
export {
	clipRevelacao,
	animarRevelacao,
	htmlClipPath,
} from "./revela-grafico.js";
export { attrsCadeira, htmlCadeiras } from "./cadeiras.js";
export { deslizarAba } from "./abas.js";
export {
	lerTema,
	gravarTema,
	aplicarTemaSalvo,
	alternarTema,
	ligarSeletorTema,
} from "./tema.js";
