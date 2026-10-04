/** Cartão da Tela 1 — Presidente. Isolado para a issue #4 expandir majoritárias. */
import { conta } from "./movimento/conta.js";
import { escapar } from "./movimento/formato.js";

export function renderizarPresidente(cargo) {
	if (!cargo) {
		return `<section class="cartao"><p class="vazio">Aguardando primeira leitura do TSE…</p></section>`;
	}

	const linhas = cargo.candidatos
		.slice(0, 8)
		.map(
			(c) => `<li class="cand" data-flip="pres-${c.n}">
        <span class="pos">${c.pos}º</span>
        <span class="nome">${escapar(c.nome)}</span>
        <span class="pct">${conta(`pres-${c.n}-pct`, c.pct, "p", true)}</span>
        <span class="partido">${escapar(c.partido)}</span>
        <span class="votos">${conta(`pres-${c.n}-votos`, c.votos, "n")} votos</span>
      </li>`,
		)
		.join("");

	return `<section class="cartao" aria-labelledby="titulo-presidente">
    <header>
      <div>
        <h1 id="titulo-presidente">${escapar(cargo.titulo)}</h1>
        <small>${escapar(cargo.local)} · dados oficiais do TSE</small>
      </div>
      <div class="apurado">${conta("pres-apurado", cargo.apurado, "p")}<br><small>das seções</small></div>
    </header>
    <ol class="ranking">${linhas}</ol>
  </section>`;
}
