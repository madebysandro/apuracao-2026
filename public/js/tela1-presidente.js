import { renderizarCartaoMajoritario } from "./tela1-cartao.js";

/** Cartão da Tela 1 — Presidente. Isolado para a issue #4 expandir majoritárias. */
export function renderizarPresidente(cargo) {
	return renderizarCartaoMajoritario(cargo, {
		idTitulo: "titulo-presidente",
		limite: 8,
	});
}
