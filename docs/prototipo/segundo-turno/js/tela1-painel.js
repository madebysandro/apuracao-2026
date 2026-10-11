/** Shell da Tela 1 — marcação .db-* quase literal do protótipo (variante D). */

import { htmlRodapeArquivo, kpiAcompanhamento } from "./arquivo.js";
import { barraViva } from "./movimento/fluxo-barras.js";
import { renderizarCartaoMajoritario } from "./tela1-cartao.js";
import { renderizarTela2 } from "./tela2-proporcionais.js";
import {
	conta,
	definirArquivoCongelado,
	deltaPp,
	pf,
	pontos,
	spark,
} from "./tela1-util.js";

/** Faixa DESTAQUES — frases prontas do servidor; fallback mínimo se ainda não houver. */
function destaques(dados) {
	const prontas = dados?.analise?.destaques;
	if (Array.isArray(prontas) && prontas.length) return prontas;
	return ["<b>Destaques</b>Aguardando a primeira leitura do TSE…"];
}

/**
 * @param {{
 *   cargos: Record<string, any>,
 *   analise?: any,
 *   hist: any[],
 *   tela: 1|2,
 *   graficos: Map,
 *   horaTse: string,
 *   erro?: string|null,
 *   encerrada?: boolean,
 * }} ctx
 */
export function renderizarPainel(ctx) {
	const { cargos, analise, hist, tela, graficos } = ctx;
	const encerrada = Boolean(ctx.encerrada);
	definirArquivoCongelado(encerrada);
	const P = cargos.presidente;
	const G = cargos.governador;
	const leituras = pontos(hist, "presidente");
	const inicio = leituras[0]
		? new Date(leituras[0].t).toLocaleTimeString("pt-BR", {
				hour: "2-digit",
				minute: "2-digit",
			})
		: "—";

	const kpi = (rot, id, campo, valor, sub = "", neutro = true) => {
		if (valor == null || Number.isNaN(valor)) {
			return `<div class="db-kpi"><span class="db-kpi-rot">${rot}</span><b class="db-kpi-val">—</b>
        <span class="db-kpi-sub">aguardando leitura</span>${spark([], 72, 22, true)}</div>`;
		}
		const serie = pontos(hist, id).map((p) => p.c[id][campo]);
		const ant = serie.length > 1 ? serie.at(-2) : null;
		const ritmoAp =
			campo === "ap" && ant != null
				? Math.min(1, Math.max(0, (valor - ant) / 4))
				: 0;
		return `<div class="db-kpi"><span class="db-kpi-rot">${rot}</span><b class="db-kpi-val">${conta("d-kpi-" + rot, valor, "p")}</b>
      ${campo === "ap" ? barraViva("kpi-" + id, valor, ant, ritmoAp, "var(--acento)") : ""}
      <span class="db-kpi-sub">${ant == null ? "" : deltaPp(valor - ant, neutro) + " p.p. na última leitura"}${sub ? (ant == null ? sub.replace(/^ · /, "") : sub) : ""}</span>${spark(serie, 72, 22, true)}</div>`;
	};

	const tickerHtml = (() => {
		const items = destaques({ cargos, analise })
			.map((d) => `<span>${d}</span>`)
			.join("");
		return items + items;
	})();

	const maj = analise?.majoritarias ?? {};
	const telaHtml =
		tela === 1
			? `<div class="db-grade3">${["presidente", "governador", "senador"]
					.map((id) =>
						renderizarCartaoMajoritario(
							id,
							cargos[id],
							hist,
							graficos,
							maj[id],
							{ encerrada },
						),
					)
					.join("")}</div>`
			: renderizarTela2({ cargos, analise });

	const acomp = kpiAcompanhamento({
		arquivada: encerrada,
		hora: P?.hora || G?.hora,
		nLeituras: leituras.length,
		inicio,
	});
	const rodapeExtra = encerrada ? htmlRodapeArquivo() : "";

	return `<div class="db">
    <header class="db-topo">
      <div class="db-marca"><b>Apuração 2026</b><span>Presidente e Pará · dados oficiais do TSE</span></div>
      <nav class="db-abas" role="tablist" aria-label="Telas do painel">
        ${[
					[1, "Majoritárias", "Presidente · Governador · Senado"],
					[2, "Proporcionais", "Deputados federais e estaduais"],
				]
					.map(
						([n, t, sub]) =>
							`<button type="button" role="tab" aria-selected="${tela === n}" data-tela="${n}"><b>${n}</b><span>${t}<small>${sub}</small></span></button>`,
					)
					.join("")}
      </nav>
    </header>
    <div class="db-ticker" aria-label="${encerrada ? "Destaques do 1º turno" : "Destaques ao vivo"}"><b><i></i>DESTAQUES</b>
      <div class="db-janela"><div class="db-rolo">${tickerHtml}</div></div></div>
    <section class="db-kpis">
      ${kpi("Seções apuradas · Brasil", "presidente", "ap", P?.apurado)}
      ${kpi("Seções apuradas · Pará", "governador", "ap", G?.apurado)}
      ${kpi("Comparecimento · Brasil", "presidente", "comp", P?.totais?.comparecimento, P ? ` · abstenção ${pf.format(P.totais.abstencao)}%` : "")}
      ${kpi("Comparecimento · Pará", "governador", "comp", G?.totais?.comparecimento, G ? ` · abstenção ${pf.format(G.totais.abstencao)}%` : "")}
      <div class="db-kpi"><span class="db-kpi-rot">${acomp.rotulo}</span><b class="db-kpi-val">${acomp.valor}</b>
        <span class="db-kpi-sub">${acomp.sub}</span></div>
    </section>
    <main class="db-tela">${telaHtml}</main>
    <p class="db-rodape">Estimativas de votos a apurar, virada e 1º turno supõem que as seções ainda não apuradas têm o mesmo comparecimento das já apuradas. Como a ordem de chegada das urnas não é aleatória, use-as como referência, não como previsão. Nas proporcionais, a distribuição de cadeiras é a calculada pelo TSE com os votos de agora.${rodapeExtra}</p>
  </div>`;
}
