import {
	atualizarFaixaDados,
	iniciarFaixaStatus,
	novidadeStatus,
} from "./movimento/faixa-status.js";
import { ligarBarras } from "./movimento/fluxo-barras.js";
import { pintarGraficos } from "./tela1-grafico.js";
import { renderizarPainel } from "./tela1-painel.js";
import {
	alternarTema,
	aplicarTema,
	ativar,
	pf,
	temaSalvo,
} from "./tela1-util.js";

const app = document.querySelector("#app");

aplicarTema(temaSalvo());

let tela = Number(new URLSearchParams(location.search).get("tela")) || 1;
if (tela !== 1 && tela !== 2) tela = 1;

/** @type {any} */
let dados = null;
/** @type {any[]} */
let hist = [];
let versao = -1;
let ultimoDesde = 0;

function horaTseAtual() {
	return (
		dados?.cargos?.presidente?.hora ??
		dados?.cargos?.governador?.hora ??
		dados?.cargos?.senador?.hora ??
		dados?.cargos?.depfed?.hora ??
		dados?.cargos?.depest?.hora ??
		null
	);
}

iniciarFaixaStatus({
	obterHoraTse: horaTseAtual,
	onTema: () => alternarTema(),
});

function ligarInteracoes() {
	for (const btn of document.querySelectorAll(".db-abas [data-tela]")) {
		btn.addEventListener("click", () => {
			const n = Number(btn.getAttribute("data-tela"));
			if (n === tela) return;
			tela = n;
			const url = new URL(location.href);
			if (tela === 1) url.searchParams.delete("tela");
			else url.searchParams.set("tela", String(tela));
			history.pushState({ tela }, "", url);
			pintar(false);
		});
	}
}

function pintar(animarGraf) {
	if (
		!dados?.cargos ||
		(!dados.cargos.presidente &&
			!dados.cargos.governador &&
			!dados.cargos.depfed)
	) {
		if (dados?.erro) {
			app.innerHTML = `<div class="db"><div class="carregando"><b>Contando votos…</b><p class="erro" role="alert">O TSE ainda não respondeu: ${dados.erro}</p></div></div>`;
		} else {
			app.innerHTML = `<div class="db"><div class="carregando"><b>Contando votos…</b><p>Primeira consulta ao TSE em andamento.</p></div></div>`;
		}
		ligarInteracoes();
		return;
	}
	const graficos = new Map();
	const horaTse = horaTseAtual() ?? "—";
	app.innerHTML = renderizarPainel({
		cargos: dados.cargos,
		analise: dados.analise,
		hist,
		tela,
		graficos,
		horaTse,
		erro: dados.erro,
	});
	ativar();
	pintarGraficos(graficos, animarGraf);
	ligarBarras();
	ligarInteracoes();
}

async function puxarHistorico() {
	try {
		const res = await fetch(`/api/historico?desde=${ultimoDesde}`, {
			cache: "no-store",
		});
		if (!res.ok) return;
		const novos = await res.json();
		if (!Array.isArray(novos) || !novos.length) return;
		hist = hist.concat(novos);
		ultimoDesde = hist.at(-1).t;
	} catch {
		/* histórico é best-effort na Tela 1 */
	}
}

async function atualizar() {
	try {
		const res = await fetch("/api/apuracao", { cache: "no-store" });
		if (!res.ok) throw new Error(`API ${res.status}`);
		const novo = await res.json();
		const mudou = novo.versao !== versao && versao >= 0;
		const antBr = dados?.cargos?.presidente?.apurado;
		const antPa = dados?.cargos?.governador?.apurado;
		const liderAnt = dados?.cargos?.presidente?.candidatos?.[0]?.n;
		dados = novo;
		atualizarFaixaDados(dados);
		if (novo.versao !== versao) {
			await puxarHistorico();
			versao = novo.versao;
			pintar(mudou);
			if (mudou) {
				const P = novo.cargos?.presidente;
				const G = novo.cargos?.governador;
				const br =
					antBr != null && P
						? ` · Brasil ${pf.format(antBr)}% → ${pf.format(P.apurado)}%`
						: "";
				const pa =
					antPa != null && G
						? ` · Pará ${pf.format(antPa)}% → ${pf.format(G.apurado)}%`
						: "";
				const virada =
					liderAnt != null &&
					P?.candidatos?.[0]?.n != null &&
					liderAnt !== P.candidatos[0].n
						? " · mudou a liderança em Presidente"
						: "";
				novidadeStatus(
					`Atualizado às ${P?.hora ?? "—"}` + br + pa + virada,
				);
			}
		}
	} catch (erro) {
		if (!dados) {
			app.innerHTML = `<div class="db"><div class="carregando"><b>Contando votos…</b><p class="erro" role="alert">O TSE ainda não respondeu: ${erro.message}</p></div></div>`;
		}
	}
}

app.innerHTML = `<div class="db"><div class="carregando"><b>Contando votos…</b><p>Primeira consulta ao TSE em andamento.</p></div></div>`;
document.addEventListener("keydown", (ev) => {
	if (
		ev.target instanceof HTMLInputElement ||
		ev.target instanceof HTMLTextAreaElement
	)
		return;
	if (ev.key === "1" || ev.key === "2") {
		const n = Number(ev.key);
		if (n === tela) return;
		tela = n;
		const url = new URL(location.href);
		if (tela === 1) url.searchParams.delete("tela");
		else url.searchParams.set("tela", String(tela));
		history.pushState({ tela }, "", url);
		pintar(false);
	}
});

addEventListener("popstate", () => {
	tela = Number(new URLSearchParams(location.search).get("tela")) || 1;
	if (tela !== 1 && tela !== 2) tela = 1;
	pintar(false);
});

atualizar();
setInterval(atualizar, 5000);
