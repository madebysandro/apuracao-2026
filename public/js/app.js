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

function atualizarStatusVivo() {
	const rel = document.querySelector("[data-relogio]");
	if (rel) rel.textContent = horaAgora();
	const cont = document.querySelector("[data-contagem]");
	const ciclo = document.querySelector("[data-ciclo]");
	if (!dados) return;
	const prox = dados.proximaConsulta;
	const cons = dados.consultadoEm;
	if (cont) {
		if (prox == null) cont.textContent = "próxima consulta ao TSE —";
		else {
			const s = Math.max(0, Math.round((prox - Date.now()) / 1000));
			cont.textContent = `próxima consulta ao TSE em ${s}s`;
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
			app.innerHTML = `<div class="db"><div class="carregando"><p class="erro" role="alert">Não foi possível consultar o TSE: ${dados.erro}. Nova tentativa em breve.</p></div></div>`;
		} else {
			app.innerHTML = `<div class="db"><div class="carregando"><p>Aguardando a primeira leitura do TSE…</p></div></div>`;
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
	});
	ativar();
	pintarGraficos(graficos, animarGraf);
	ligarInteracoes();
	atualizarStatusVivo();
	if (dados.erro) {
		aviso(`Falha na consulta: ${dados.erro}`);
	}
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
		dados = novo;
		if (novo.versao !== versao) {
			await puxarHistorico();
			versao = novo.versao;
			pintar(mudou);
			if (mudou) {
				const ap = novo.cargos?.presidente?.apurado;
				aviso(
					`Atualizado às ${novo.cargos?.presidente?.hora ?? "—"}` +
						(ap != null ? ` · Brasil ${ap.toFixed?.(2) ?? ap}%` : ""),
				);
			}
		} else {
			// Só ciclo/erro mudaram.
			atualizarStatusVivo();
			if (novo.erro) aviso(`Falha na consulta: ${novo.erro}`);
		}
	} catch (erro) {
		if (!dados) {
			app.innerHTML = `<div class="db"><div class="carregando"><p class="erro" role="alert">Falha ao ler a API: ${erro.message}. Tentando de novo…</p></div></div>`;
		} else {
			aviso(`Falha ao ler a API: ${erro.message}`);
		}
	}
}

app.innerHTML = `<div class="db"><div class="carregando"><p>carregando…</p></div></div>`;
atualizar();
setInterval(atualizar, 5000);
setInterval(atualizarStatusVivo, 1000);
