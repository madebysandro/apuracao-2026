import { renderizarPresidente } from "./tela1-presidente.js";
import { renderizarTela2 } from "./tela2-proporcionais.js";

const raiz = document.querySelector("[data-app]");

function telaInicial() {
	const params = new URLSearchParams(location.search);
	return params.get("tela") === "2" ? 2 : 1;
}

let tela = telaInicial();
let ultimoDados = null;

function esc(texto) {
	return String(texto ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

function abasHtml() {
	return [
		[1, "Majoritárias", "Presidente · Governador · Senado"],
		[2, "Proporcionais", "Deputados federais e estaduais"],
	]
		.map(
			([n, t, sub]) =>
				`<button type="button" role="tab" aria-selected="${tela === n}" data-tela="${n}"><b>${n}</b><span>${t}<small>${sub}</small></span></button>`,
		)
		.join("");
}

const pf = new Intl.NumberFormat("pt-BR", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

function kpisHtml(dados) {
	const P = dados?.cargos?.presidente;
	const pa = dados?.cargos?.depfed; // mesmo ciclo estadual do Pará até #4 trazer Governador
	if (!P && !pa) return "";
	const kpi = (rot, valor, sub = "") =>
		`<div class="db-kpi"><span class="db-kpi-rot">${rot}</span><b class="db-kpi-val">${valor == null ? "—" : pf.format(valor) + "%"}</b><span class="db-kpi-sub">${sub}</span></div>`;
	return `<section class="db-kpis">
    ${kpi("Seções apuradas · Brasil", P?.apurado)}
    ${kpi("Seções apuradas · Pará", pa?.apurado)}
    ${kpi("Comparecimento · Brasil", P?.totais?.comparecimento, P ? `· abstenção ${pf.format(P.totais.abstencao)}%` : "")}
    ${kpi("Comparecimento · Pará", pa?.totais?.comparecimento, pa ? `· abstenção ${pf.format(pa.totais.abstencao)}%` : "")}
    <div class="db-kpi"><span class="db-kpi-rot">Acompanhamento</span><b class="db-kpi-val">versão ${dados.versao}</b>
      <span class="db-kpi-sub">o TSE publica a cada poucos minutos</span></div>
  </section>`;
}

function tickerHtml(dados) {
	const fed = dados?.cargos?.depfed;
	const est = dados?.cargos?.depest;
	const P = dados?.cargos?.presidente;
	const itens = [];
	if (P?.candidatos?.[0]) {
		itens.push(
			`<span><b>Presidente</b>${esc(P.candidatos[0].nome)} ${pf.format(P.candidatos[0].pct)}%</span>`,
		);
	}
	if (fed) {
		itens.push(
			`<span><b>Dep. Federal</b>Pará ${pf.format(fed.apurado)}% das seções · ${fed.vagas} cadeiras</span>`,
		);
	}
	if (est) {
		itens.push(
			`<span><b>Dep. Estadual</b>Pará ${pf.format(est.apurado)}% das seções · ${est.vagas} cadeiras</span>`,
		);
	}
	const disputa = dados?.analise?.proporcionais?.depfed?.disputaInterna?.[0];
	if (disputa) {
		itens.push(
			`<span><b>Disputa interna</b>${esc(disputa.sigla)}: diferença de ${disputa.diferenca.toLocaleString("pt-BR")} votos</span>`,
		);
	}
	if (!itens.length) return "";
	const rolo = itens.join("") + itens.join("");
	return `<div class="db-ticker" aria-label="Destaques ao vivo"><b><i></i>Destaques</b>
    <div class="db-janela"><div class="db-rolo">${rolo}</div></div></div>`;
}

function pintar() {
	const dados = ultimoDados;
	const P = dados?.cargos?.presidente;
	const hora = P?.hora ?? dados?.cargos?.depfed?.hora ?? "—";
	const prox = dados?.proximaConsulta
		? Math.max(0, Math.round((dados.proximaConsulta - Date.now()) / 1000))
		: "—";
	const corpo = !dados
		? `<p class="db-vazio">carregando…</p>`
		: tela === 1
			? renderizarPresidente(P)
			: renderizarTela2(dados);

	raiz.innerHTML = `<div class="db">
    <header class="db-topo">
      <div class="db-marca"><b>Apuração 2026</b><span>Presidente e Pará · dados oficiais do TSE</span></div>
      <nav class="db-abas" data-abas role="tablist" aria-label="Telas do painel">${abasHtml()}</nav>
      <div class="db-status">
        <span class="db-vivo"><i></i>Ao vivo</span>
        <span>TSE ${esc(hora)}</span>
        <span>versão ${dados?.versao ?? "—"}</span>
        <span>próxima consulta em ${prox}s</span>
        ${dados?.erro ? `<span class="d desce">${esc(dados.erro)}</span>` : ""}
      </div>
    </header>
    <div class="db-ciclo" title="Tempo até a próxima consulta ao TSE"><i data-ciclo></i></div>
    ${dados ? tickerHtml(dados) : ""}
    ${dados ? kpisHtml(dados) : ""}
    <main class="db-tela">${corpo}</main>
    <p class="db-rodape">Estimativas de votos a apurar, virada e 1º turno supõem que as seções ainda não apuradas têm o mesmo comparecimento das já apuradas. Como a ordem de chegada das urnas não é aleatória, use-as como referência, não como previsão. Nas proporcionais, a distribuição de cadeiras é a calculada pelo TSE com os votos de agora.</p>
  </div>`;

	raiz.querySelector("[data-abas]")?.addEventListener("click", (ev) => {
		const botao = ev.target.closest("[data-tela]");
		if (!botao) return;
		irPara(Number(botao.dataset.tela));
	});
}

function irPara(n, { empurrar = true } = {}) {
	if (n !== 1 && n !== 2) return;
	tela = n;
	const url = new URL(location.href);
	if (tela === 1) url.searchParams.delete("tela");
	else url.searchParams.set("tela", "2");
	if (empurrar) history.pushState({ tela }, "", url);
	else history.replaceState({ tela }, "", url);
	pintar();
}

async function atualizar() {
	try {
		const res = await fetch("/api/apuracao", { cache: "no-store" });
		if (!res.ok) throw new Error(`API ${res.status}`);
		ultimoDados = await res.json();
		pintar();
	} catch (erro) {
		raiz.innerHTML = `<div class="db"><p class="d desce">Falha ao ler a API: ${esc(erro.message)}</p></div>`;
	}
}

addEventListener("keydown", (ev) => {
	if (ev.target && /input|textarea|select/i.test(ev.target.tagName)) return;
	if (ev.key === "1") irPara(1);
	if (ev.key === "2") irPara(2);
});

addEventListener("popstate", () => {
	tela = telaInicial();
	pintar();
});

atualizar();
setInterval(atualizar, 5000);
