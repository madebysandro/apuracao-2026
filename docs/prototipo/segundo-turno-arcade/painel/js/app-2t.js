/**
 * PROTOTYPE — entrada do protótipo do 2º turno (substitui js/app.js de produção).
 * Estado fixo por ?variant=. Só Presidente · Brasil (uma tela). Sem /api: tudo local.
 */
import { atualizarFaixaDados, iniciarFaixaStatus, novidadeStatus } from "./movimento/faixa-status.js";
import { capturarFlip, flip } from "./movimento/flip.js";
import { barraViva, ligarBarras } from "./movimento/fluxo-barras.js";
import { gerar } from "./mock-2t.js";
import { montarSwitcher, varianteAtual } from "./proto-switcher.js";
import { alternarTema, aplicarTema, ativar, conta, definirArquivoCongelado, deltaPp, pf, spark, temaSalvo } from "./tela1-util.js";
import { cartaoColegios, cartaoComparacao, cartaoComparecimento, cartaoDuelo, cartaoEstados, cartaoExterior, destaques2t, pintarMargem } from "./tela-2t.js";

const app = document.querySelector("#app");
aplicarTema(temaSalvo());
const variante = varianteAtual();
montarSwitcher();

const [e1, col] = await Promise.all(["../dados/estado-1t.json", "../dados/colegios-1t.json"].map(async (u) => (await fetch(u)).json()));
// ARCADE: ?n= (leitura do simulador) e postMessage({arcadeN}) da variante (b); antes eram const fixos por ?variant=.
const nUrl = new URLSearchParams(location.search).get("n");
let dados, hist, viradas, P, pre, encerrada;
function carregar(n) {
	({ dados, hist, viradas } = gerar(e1, col, variante, n));
	P = dados.cargos.presidente;
	pre = n == null ? variante === "pre" : n === 0;
	encerrada = dados.encerrada;
}
carregar(nUrl == null ? null : Number(nUrl));

iniciarFaixaStatus({ obterHoraTse: () => (pre ? "17:00" : P.hora), onTema: () => alternarTema() });
atualizarFaixaDados(dados);
// Mantém o anel girando nas variantes ao vivo (o poller real renova proximaConsulta).
setInterval(() => {
	if (!dados.encerrada && dados.proximaConsulta < Date.now()) { // ARCADE: checa a cada tick (o estado muda)
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
	const zz = dados.ufs.zz;
	const vs1 = (v, v1) => (pre ? `1º turno: ${pf.format(v1)}%` : `${deltaPp(v - v1, true)} p.p. vs 1º turno (${pf.format(v1)}%)`);
	const ultima = hist.at(-1);
	return `<section class="db-kpis">
    ${kpi("Seções apuradas · Brasil", "k-br", P.apurado, hist.map((h) => h.c.presidente.ap), pre ? "469.329 seções no 2º turno" : `${hist.length > 1 ? deltaPp(P.apurado - hist.at(-2).c.presidente.ap, true) + " p.p. na última leitura" : ""}`, true)}
    ${kpi("Comparecimento · Brasil", "k-cbr", P.totais.comparecimento, [], vs1(P.totais.comparecimento, T1.comparecimento))}
    ${kpi("Abstenção · Brasil", "k-abr", P.totais.abstencao, [], vs1(P.totais.abstencao, T1.abstencao))}
    ${kpi("Seções apuradas · Exterior", "k-zz", zz.apurado, hist.map((h) => h.c.zz.ap), pre ? `${zz.secoes.toLocaleString("pt-BR")} seções fora do país` : "o exterior apura por último", true)}
    <div class="db-kpi"><span class="db-kpi-rot">${encerrada ? "Última atualização" : "Acompanhamento"}</span>
      <b class="db-kpi-val">${pre ? "—" : encerrada ? P.hora : `${hist.length} leituras`}</b>
      <span class="db-kpi-sub">${pre ? "1ª leitura logo após as 17h" : encerrada ? "resultado final do 2º turno" : `desde ${hist[0].c.presidente.hora.slice(0, 5)} · última ${ultima.c.presidente.hora.slice(0, 5)}`}</span></div>
  </section>`;
}

function corpo() {
	const ctx = { P, an: dados.analise.majoritarias.presidente, hist, viradas, ufs: dados.ufs, colegios: dados.colegios, compExterior: dados.compExterior, e1, col, pre, encerrada };
	return `<div class="t2-grade">
      ${cartaoDuelo(ctx)}
      ${cartaoExterior(ctx)}
      ${cartaoComparecimento(ctx)}
      ${cartaoComparacao(ctx)}
      ${cartaoEstados(ctx)}
      ${cartaoColegios(ctx)}
    </div>`;
}

function pintar(entrada) {
	const antes = capturarFlip();
	definirArquivoCongelado(encerrada);
	const itens = destaques2t({ P, ufs: dados.ufs, colegios: dados.colegios, viradas, pre, encerrada }).map((d) => `<span>${d}</span>`).join("");
	app.classList.toggle("db-entrada", entrada);
	app.innerHTML = `<div class="db">
    <header class="db-topo">
      <div class="db-marca"><b>Apuração 2026 · 2º turno</b><span>Presidente · Brasil · 25/10 · dados oficiais do TSE</span></div>
    </header>
    <div class="db-ticker" aria-label="Destaques do 2º turno"><b><i></i>DESTAQUES</b>
      <div class="db-janela"><div class="db-rolo">${itens}${itens}</div></div></div>
    ${kpis()}
    <main class="db-tela">${corpo()}</main>
    <p class="db-rodape">Estimativas de votos a apurar, virada e "para onde foram os votos" supõem que as seções ainda não apuradas se comportam como as já apuradas; o TSE não publica transferência de votos entre turnos. Use-as como referência, não como previsão.
      <span class="db-arquivo">Fonte oficial: <a href="https://resultados.tse.jus.br/" target="_blank" rel="noopener">resultados.tse.jus.br</a>.</span></p>
  </div>`;
	ativar();
	pintarMargem(hist, viradas);
	ligarBarras();
	flip(antes);
	app.classList.remove("db-entrada");
}

let redim;
addEventListener("resize", () => {
	clearTimeout(redim);
	redim = setTimeout(() => pintarMargem(hist, viradas), 150);
});

pintar(true);
addEventListener("message", (ev) => {
	if (ev.origin !== location.origin || typeof ev.data?.arcadeN !== "number") return;
	carregar(ev.data.arcadeN);
	atualizarFaixaDados(dados);
	pintar(false);
});
if (variante === "virada" && viradas.length) {
	const a = hist.at(-2).c.presidente.ap;
	setTimeout(() => novidadeStatus(`Atualizado às ${P.hora} · Brasil ${pf.format(a)}% → ${pf.format(P.apurado)}% · mudou a liderança em Presidente`), 900);
}
