/** Shell da Tela 1 — marcação .db-* quase literal do protótipo (variante D). */

import { renderizarCartaoMajoritario } from "./tela1-cartao.js";
import { barraViva } from "./movimento/fluxo-barras.js";
import { renderizarTela2 } from "./tela2-proporcionais.js";
import {
	conta,
	deltaPp,
	pf,
	pontos,
	spark,
} from "./tela1-util.js";
import { eh, varianteAtual } from "./proto-variant.js";

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
	const v = varianteAtual();
	const encerrada = Boolean(ctx.encerrada) || (P?.apurado === 100 && G?.apurado === 100);

	const cartao = (id) =>
		renderizarCartaoMajoritario(id, cargos[id], hist, graficos, maj[id], { encerrada });

	let telaHtml;
	if (tela === 1) {
		if (eh("B")) {
			telaHtml =
				`<div class="db-pres-acima">${cartao("presidente")}</div>` +
				`__KPIS__` +
				`<div class="db-grade2-resto">${["governador", "senador"].map(cartao).join("")}</div>`;
		} else {
			telaHtml = `<div class="db-grade3">${["presidente", "governador", "senador"].map(cartao).join("")}</div>`;
		}
	} else {
		telaHtml = renderizarTela2({ cargos, analise });
	}

	const abas = eh("B")
		? [
				[1, "Presidente e Pará", "Governador e Senado"],
				[2, "Deputados", "Federais e estaduais"],
			]
		: [
				[1, "Majoritárias", "Presidente · Governador · Senado"],
				[2, "Proporcionais", "Deputados federais e estaduais"],
			];

	const horaFinal = P?.hora || G?.hora || "—";
	const kpiAcompVal = encerrada
		? horaFinal
		: `${leituras.length || "—"} leitura${leituras.length === 1 ? "" : "s"}`;
	const kpiAcompSub = encerrada
		? "última atualização do TSE · 1º turno encerrado · 2º turno em 25/10"
		: `desde ${inicio} · o TSE publica a cada poucos minutos`;

	const kpisHtml = `<section class="db-kpis" ${eh("C") ? 'id="painel-kpis"' : ""}>
      ${kpi("Seções apuradas · Brasil", "presidente", "ap", P?.apurado)}
      ${kpi("Seções apuradas · Pará", "governador", "ap", G?.apurado)}
      ${kpi("Comparecimento · Brasil", "presidente", "comp", P?.totais?.comparecimento, P ? ` · abstenção ${pf.format(P.totais.abstencao)}%` : "")}
      ${kpi("Comparecimento · Pará", "governador", "comp", G?.totais?.comparecimento, G ? ` · abstenção ${pf.format(G.totais.abstencao)}%` : "")}
      <div class="db-kpi"><span class="db-kpi-rot">${encerrada ? "Última atualização" : "Acompanhamento"}</span><b class="db-kpi-val">${kpiAcompVal}</b>
        <span class="db-kpi-sub">${kpiAcompSub}</span></div>
    </section>`;

	if (eh("B") && tela === 1) {
		telaHtml = telaHtml.replace("__KPIS__", kpisHtml);
	}

	const tickerAttrs = eh("C")
		? ' data-pause title="Toque para pausar ou retomar"'
		: "";
	const rodapeExtra = eh("A")
		? `<span class="db-arquivo">Arquivo do 1º turno (encerrado). Acompanhe o 2º turno em 25/10. Fonte oficial: <a href="https://resultados.tse.jus.br/" target="_blank" rel="noopener">resultados.tse.jus.br</a>.</span>`
		: "";

	const kpisNoTopo = !(eh("B") && tela === 1);

	return `<div class="db">
    <header class="db-topo">
      <div class="db-marca"><b>Apuração 2026</b><span>Presidente e Pará · dados oficiais do TSE</span></div>
      <nav class="db-abas" role="tablist" aria-label="Telas do painel">
        ${abas
					.map(
						([n, t, sub]) =>
							`<button type="button" role="tab" id="aba-${n}" aria-selected="${tela === n}" aria-controls="painel-tela" tabindex="${tela === n ? 0 : -1}" data-tela="${n}"><b>${n}</b><span>${t}<small>${sub}</small></span></button>`,
					)
					.join("")}
      </nav>
    </header>
    <div class="db-ticker" aria-label="${encerrada ? "Destaques do 1º turno" : "Destaques ao vivo"}"${tickerAttrs}><b><i></i>DESTAQUES</b>
      <div class="db-janela"><div class="db-rolo">${tickerHtml}</div></div></div>
    ${kpisNoTopo ? kpisHtml : ""}
    <main class="db-tela" id="painel-tela" role="tabpanel" aria-labelledby="aba-${tela}">${telaHtml}</main>
    <p class="db-rodape">Estimativas de votos a apurar, virada e 1º turno supõem que as seções ainda não apuradas têm o mesmo comparecimento das já apuradas. Como a ordem de chegada das urnas não é aleatória, use-as como referência, não como previsão. Nas proporcionais, a distribuição de cadeiras é a calculada pelo TSE com os votos de agora.${rodapeExtra}</p>
  </div>`;

}
