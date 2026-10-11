/**
 * PROTOTYPE — entrada do protótipo do 2º turno (substitui js/app.js de produção).
 * Estado fixo por ?variant=; ?tela=1|2 como em produção. Sem /api: tudo local.
 */
import { atualizarFaixaDados, iniciarFaixaStatus, novidadeStatus } from "./movimento/faixa-status.js";
import { capturarFlip, flip } from "./movimento/flip.js";
import { barraViva, ligarBarras } from "./movimento/fluxo-barras.js";
import { gerar } from "./mock-2t.js";
import { montarSwitcher, varianteAtual } from "./proto-switcher.js";
import { pintarGraficos } from "./tela1-grafico.js";
import { renderizarCartaoMajoritario } from "./tela1-cartao.js";
import { alternarTema, aplicarTema, ativar, conta, definirArquivoCongelado, deltaPp, pf, spark, temaSalvo } from "./tela1-util.js";
import { cartaoComparacao, cartaoDuelo, cartaoEstados, cartaoPara, destaques2t, pintarMargem } from "./tela-2t.js";
import { renderizarTela2 } from "./tela2-proporcionais.js";

const app = document.querySelector("#app");
aplicarTema(temaSalvo());
const variante = varianteAtual();
montarSwitcher();

let tela = Number(new URLSearchParams(location.search).get("tela")) === 2 ? 2 : 1;
const e1 = await (await fetch("dados/estado-1t.json")).json();
const { dados, hist, viradas } = gerar(e1, variante);
const P = dados.cargos.presidente;
const pre = variante === "pre";
const encerrada = variante === "encerrado";

iniciarFaixaStatus({ obterHoraTse: () => (pre ? "17:00" : P.hora), onTema: () => alternarTema() });
atualizarFaixaDados(dados);
// Mantém o anel girando nas variantes ao vivo (o poller real renova proximaConsulta).
if (!encerrada) setInterval(() => {
	if (dados.proximaConsulta < Date.now()) {
		dados.consultadoEm = Date.now();
		dados.proximaConsulta = Date.now() + 50_000;
	}
}, 1000);

function kpi(rot, k, valor, serie, sub, barra = false) {
	const ant = serie.length > 1 ? serie.at(-2) : null;
	return `<div class="db-kpi"><span class="db-kpi-rot">${rot}</span><b class="db-kpi-val">${conta(k, valor, "p")}</b>
    ${barra ? barraViva(k, valor, ant, ant == null ? 0 : Math.min(1, (valor - ant) / 4), "var(--acento)") : ""}
    <span class="db-kpi-sub">${sub}</span>${spark(serie, 72, 22, !encerrada)}</div>`;
}

function kpis() {
	const T1 = e1.cargos.presidente.totais;
	const G1 = e1.cargos.governador.totais;
	const pa = dados.ufs.pa;
	const compPa = pre ? 0 : G1.comparecimento + (P.totais.comparecimento - T1.comparecimento);
	const vs1 = (v, v1) => (pre ? `1º turno: ${pf.format(v1)}%` : `${deltaPp(v - v1, true)} p.p. vs 1º turno (${pf.format(v1)}%)`);
	const ultima = hist.at(-1);
	return `<section class="db-kpis">
    ${kpi("Seções apuradas · Brasil", "k-br", P.apurado, hist.map((h) => h.c.presidente.ap), pre ? "469.329 seções no 2º turno" : `${hist.length > 1 ? deltaPp(P.apurado - hist.at(-2).c.presidente.ap, true) + " p.p. na última leitura" : ""}`, true)}
    ${kpi("Seções apuradas · Pará", "k-pa", pa.apurado, hist.map((h) => h.c.pa.ap), pre ? `${pa.secoes.toLocaleString("pt-BR")} seções no Pará` : "Presidente no Pará", true)}
    ${kpi("Comparecimento · Brasil", "k-cbr", P.totais.comparecimento, [], vs1(P.totais.comparecimento, T1.comparecimento))}
    ${kpi("Comparecimento · Pará", "k-cpa", compPa, [], vs1(compPa, G1.comparecimento))}
    <div class="db-kpi"><span class="db-kpi-rot">${encerrada ? "Última atualização" : "Acompanhamento"}</span>
      <b class="db-kpi-val">${pre ? "—" : encerrada ? P.hora : `${hist.length} leituras`}</b>
      <span class="db-kpi-sub">${pre ? "1ª leitura logo após as 17h" : encerrada ? "resultado final do 2º turno" : `desde ${hist[0].c.presidente.hora.slice(0, 5)} · última ${ultima.c.presidente.hora.slice(0, 5)}`}</span></div>
  </section>`;
}

function telaUm(graficos) {
	const ctx = { P, an: dados.analise.majoritarias.presidente, hist, viradas, ufs: dados.ufs, e1, pre, encerrada };
	return `<div class="t2-grade">
      ${cartaoDuelo(ctx)}
      ${cartaoPara(ctx)}
      ${cartaoComparacao(ctx)}
      ${cartaoEstados(ctx)}
    </div>`;
}

function telaDois(graficos) {
	const maj = e1.analise.majoritarias;
	return `<p class="t2-aviso-arquivo"><b>Arquivo do 1º turno · 04/10 · resultado final.</b> No Pará, Governador e Senado foram decididos no 1º turno e não há 2º turno para eles; os deputados foram eleitos em 04/10.</p>
    <div class="db-grade2">${["governador", "senador"].map((id) => renderizarCartaoMajoritario(id, e1.cargos[id], [], graficos, maj[id], { encerrada: true })).join("")}</div>
    <h2 class="t2-titulo-sec">Proporcionais · Pará</h2>
    ${renderizarTela2(e1)}`;
}

function pintar(entrada) {
	const antes = capturarFlip();
	const graficos = new Map();
	// Tela 1 ao vivo anima; Tela 2 é arquivo (congelado), como na produção pós-1º turno.
	definirArquivoCongelado(tela === 2 || encerrada);
	const corpo = tela === 1 ? telaUm(graficos) : telaDois(graficos);
	const itens = (tela === 1 ? destaques2t({ P, ufs: dados.ufs, viradas, pre, encerrada }) : e1.analise.destaques).map((d) => `<span>${d}</span>`).join("");
	app.classList.toggle("db-entrada", entrada);
	app.innerHTML = `<div class="db">
    <header class="db-topo">
      <div class="db-marca"><b>Apuração 2026 · 2º turno</b><span>Presidente · 25/10 · dados oficiais do TSE</span></div>
      <nav class="db-abas" role="tablist" aria-label="Telas do painel">
        ${[
					[1, "2º turno", "Presidente · Brasil e estados"],
					[2, "1º turno · Pará", "Governador, Senado e Deputados · final"],
				]
					.map(([n, t, sub]) => `<button type="button" role="tab" aria-selected="${tela === n}" data-tela="${n}"><b>${n}</b><span>${t}<small>${sub}</small></span></button>`)
					.join("")}
      </nav>
    </header>
    <div class="db-ticker" aria-label="${tela === 1 ? "Destaques do 2º turno" : "Destaques do 1º turno"}"><b><i></i>${tela === 1 ? "DESTAQUES" : "1º TURNO"}</b>
      <div class="db-janela"><div class="db-rolo">${itens}${itens}</div></div></div>
    ${tela === 1 ? kpis() : ""}
    <main class="db-tela">${corpo}</main>
    <p class="db-rodape">Estimativas de votos a apurar, virada e "para onde foram os votos" supõem que as seções ainda não apuradas se comportam como as já apuradas; o TSE não publica transferência de votos entre turnos. Use-as como referência, não como previsão.
      <span class="db-arquivo">${tela === 2 ? "Arquivo do 1º turno (encerrado em 04/10). " : ""}Fonte oficial: <a href="https://resultados.tse.jus.br/" target="_blank" rel="noopener">resultados.tse.jus.br</a>.</span></p>
  </div>`;
	ativar();
	pintarGraficos(graficos, entrada);
	if (tela === 1) pintarMargem(hist, viradas);
	ligarBarras();
	for (const b of app.querySelectorAll("[data-tela]")) b.addEventListener("click", () => irPara(Number(b.dataset.tela)));
	flip(antes);
	app.classList.remove("db-entrada");
}

function irPara(n) {
	if (n === tela) return;
	tela = n;
	const url = new URL(location.href);
	if (n === 1) url.searchParams.delete("tela");
	else url.searchParams.set("tela", "2");
	history.pushState({}, "", url);
	scrollTo(0, 0);
	pintar(true);
}

document.addEventListener("keydown", (ev) => {
	if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) return;
	if (ev.key === "1" || ev.key === "2") irPara(Number(ev.key));
});
addEventListener("popstate", () => {
	tela = Number(new URLSearchParams(location.search).get("tela")) === 2 ? 2 : 1;
	pintar(false);
});
let redim;
addEventListener("resize", () => {
	clearTimeout(redim);
	redim = setTimeout(() => tela === 1 && pintarMargem(hist, viradas), 150);
});

pintar(true);
if (variante === "virada" && viradas.length) {
	const a = hist.at(-2).c.presidente.ap;
	setTimeout(() => novidadeStatus(`Atualizado às ${P.hora} · Brasil ${pf.format(a)}% → ${pf.format(P.apurado)}% · mudou a liderança em Presidente`), 900);
}
