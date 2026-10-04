/**
 * Camada visual reutilizável (issue #8).
 *
 * Telas 1 e 2 plugam assim:
 * 1. CSS: classes em `/css/tema.css` (`.grade-3`, `.grade-2`, `.cartao`, `.rolagem`,
 *    `.barra`, `.cadeira`, `.ping`, `.abas`, `#aviso`, `[data-tema]`).
 * 2. Números: `conta(chave, valor, 'p'|'n', delta?)` no HTML; depois `ativar()`.
 * 3. Barras/props: `animaProp(chave, 'width', pct)` + `ativar()`.
 * 4. Ranking/tabela: `data-flip="id-unico"` → `capturarFlip()` antes do paint, `flip(antes)` depois.
 * 5. Gráfico: `clipRevelacao` + `htmlClipPath` + `animarRevelacao` após inserir o SVG.
 * 6. Cadeiras: `htmlCadeiras` / `attrsCadeira` (transição de cor + onda CSS).
 * 7. Abas: `deslizarAba({ de, para, atual, pintar })`.
 * 8. Tema: `ligarSeletorTema()` uma vez no boot; botão `[data-tema-toggle]`.
 * 9. Aviso: `aviso(resumoAtualizacao({…}))` quando a versão da API muda.
 * 10. Movimento: consulte `preferirCalmo()` antes de `Element.animate`.
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
