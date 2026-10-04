import { pintarGraficos } from "./tela1-grafico.js";
import { renderizarPainel } from "./tela1-painel.js";
import {
	alternarTema,
	aplicarTema,
	ativar,
	aviso,
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

function horaAgora() {
	return new Date().toLocaleTimeString("pt-BR", { hour12: false });
}

function idadeConsulta(consultadoEm) {
	if (consultadoEm == null) return "";
	const min = Math.floor((Date.now() - consultadoEm) / 60_000);
	return min < 1 ? "· agora há pouco" : `· há ${min} min`;
}

function atualizarStatusVivo() {
	const rel = document.querySelector("[data-relogio]");
	if (rel) rel.textContent = horaAgora();
	const cont = document.querySelector("[data-contagem]");
	const ciclo = document.querySelector("[data-ciclo]");
	const idade = document.querySelector("[data-idade]");
	const vivo = document.querySelector("[data-vivo]");
	if (!dados) return;
	const prox = dados.proximaConsulta;
	const cons = dados.consultadoEm;
	if (idade) idade.textContent = idadeConsulta(cons);
	if (vivo) {
		vivo.classList.toggle("instavel", Boolean(dados.erro));
		vivo.innerHTML = dados.erro
			? "<i></i>TSE instável"
			: "<i></i>Ao vivo";
	}
	if (cont) {
		if (prox == null) cont.textContent = "—";
		else {
			const s = Math.max(0, Math.round((prox - Date.now()) / 1000));
			cont.textContent = s === 0 ? "···" : `${String(s).padStart(2, "0")}s`;
		}
	}
	if (ciclo && cons != null && prox != null) {
		const total = Math.max(1, prox - cons);
		const andou = Math.min(total, Math.max(0, Date.now() - cons));
		ciclo.style.width = `${Math.round((andou / total) * 100)}%`;
	}
}

function ligarInteracoes() {
	for (const btn of document.querySelectorAll(".db-abas [data-tela]")) {
		btn.addEventListener("click", () => {
			const n = Number(btn.getAttribute("data-tela"));
			if (n === tela) return;
			tela = n;
			const url = new URL(location.href);
			url.searchParams.set("tela", String(tela));
			history.replaceState(null, "", url);
			pintar(false);
		});
	}
	const temaBtn = document.querySelector("[data-tema-toggle]");
	if (temaBtn) {
		temaBtn.addEventListener("click", () => {
			alternarTema();
		});
	}
}

function pintar(animarGraf) {
	if (!dados?.cargos || (!dados.cargos.presidente && !dados.cargos.governador)) {
		if (dados?.erro) {
			app.innerHTML = `<div class="db"><div class="carregando"><b>Contando votos…</b><p class="erro" role="alert">O TSE ainda não respondeu: ${dados.erro}</p></div></div>`;
		} else {
			app.innerHTML = `<div class="db"><div class="carregando"><b>Contando votos…</b><p>Primeira consulta ao TSE em andamento.</p></div></div>`;
		}
		ligarInteracoes();
		atualizarStatusVivo();
		return;
	}
	const graficos = new Map();
	const horaTse =
		dados.cargos.presidente?.hora ??
		dados.cargos.governador?.hora ??
		dados.cargos.senador?.hora ??
		"—";
	app.innerHTML = renderizarPainel({
		cargos: dados.cargos,
		hist,
		tela,
		graficos,
		horaTse,
		erro: dados.erro,
	});
	ativar();
	pintarGraficos(graficos, animarGraf);
	ligarInteracoes();
	atualizarStatusVivo();
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
		dados = novo;
		if (novo.versao !== versao) {
			await puxarHistorico();
			versao = novo.versao;
			pintar(mudou);
			if (mudou) {
				const P = novo.cargos?.presidente;
				const G = novo.cargos?.governador;
				const br =
					antBr != null && P
						? ` · Brasil ${pf2(antBr)}% → ${pf2(P.apurado)}%`
						: "";
				const pa =
					antPa != null && G
						? ` · Pará ${pf2(antPa)}% → ${pf2(G.apurado)}%`
						: "";
				aviso(`Atualizado às ${P?.hora ?? "—"}` + br + pa);
			}
		} else {
			atualizarStatusVivo();
		}
	} catch (erro) {
		if (!dados) {
			app.innerHTML = `<div class="db"><div class="carregando"><b>Contando votos…</b><p class="erro" role="alert">O TSE ainda não respondeu: ${erro.message}</p></div></div>`;
		}
	}
}

function pf2(v) {
	return new Intl.NumberFormat("pt-BR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(v);
}

app.innerHTML = `<div class="db"><div class="carregando"><b>Contando votos…</b><p>Primeira consulta ao TSE em andamento.</p></div></div>`;
document.addEventListener("keydown", (ev) => {
	if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement)
		return;
	if (ev.key === "1" || ev.key === "2") {
		const n = Number(ev.key);
		if (n === tela) return;
		tela = n;
		const url = new URL(location.href);
		url.searchParams.set("tela", String(tela));
		history.replaceState(null, "", url);
		pintar(false);
	}
});

atualizar();
setInterval(atualizar, 5000);
setInterval(atualizarStatusVivo, 1000);
