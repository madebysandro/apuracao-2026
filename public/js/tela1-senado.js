import { renderizarCartaoMajoritario } from "./tela1-cartao.js";

/** Cartão da Tela 1 — Senado do Pará (2 vagas). */
export function renderizarSenado(cargo) {
	return renderizarCartaoMajoritario(cargo, {
		idTitulo: "titulo-senado",
		limite: 6,
	});
}
