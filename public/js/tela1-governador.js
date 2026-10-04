import { renderizarCartaoMajoritario } from "./tela1-cartao.js";

/** Cartão da Tela 1 — Governador do Pará. */
export function renderizarGovernador(cargo) {
	return renderizarCartaoMajoritario(cargo, {
		idTitulo: "titulo-governador",
		limite: 5,
	});
}
