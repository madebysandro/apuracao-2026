/**
 * PROTOTYPE app — mesma pintura da produção, com snapshot congelado do 1º turno
 * encerrado e deltas gated por ?variant=A|B|C.
 */
import { deslizarAba } from "./movimento/abas.js";
import {
	atualizarFaixaDados,
	iniciarFaixaStatus,
} from "./movimento/faixa-status.js";
import { capturarFlip, flip } from "./movimento/flip.js";
import { ligarBarras } from "./movimento/fluxo-barras.js";
import { pintarGraficos } from "./tela1-grafico.js";
import { renderizarPainel } from "./tela1-painel.js";
import {
	alternarTema,
	aplicarTema,
	ativar,
	definirArquivoCongelado,
	temaSalvo,
} from "./tela1-util.js";
import { eh, montarSwitcher, varianteAtual } from "./proto-variant.js";

const app = document.querySelector("#app");
aplicarTema(temaSalvo());
montarSwitcher();

let tela = Number(new URLSearchParams(location.search).get("tela")) || 1;
if (tela !== 1 && tela !== 2) tela = 1;

/** @type {any} */
let dados = null;
/** @type {any[]} */
let hist = [];
let primeiraPintura = true;

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

function irPara(n) {
	if (n !== 1 && n !== 2) return;
	if (n === tela) return;
	const de = tela;
	const atual = document.querySelector(".db-tela");
	tela = n;
	const url = new URL(location.href);
	if (tela === 1) url.searchParams.delete("tela");
	else url.searchParams.set("tela", String(tela));
	// preserve variant
	url.searchParams.set("variant", varianteAtual());
	history.pushState({ tela }, "", url);
	deslizarAba({
		de,
		para: n,
		atual,
		seletorNova: ".db-tela",
		pintar: () => pintar(false),
	});
}

function ligarInteracoes() {
	for (const btn of document.querySelectorAll(".db-abas [data-tela]")) {
		btn.addEventListener("click", () => {
			irPara(Number(btn.getAttribute("data-tela")));
		});
	}
	if (eh("C")) {
		const abas = [...document.querySelectorAll('.db-abas [role="tab"]')];
		for (const btn of abas) {
			btn.addEventListener("keydown", (ev) => {
				const i = abas.indexOf(btn);
				if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
					ev.preventDefault();
					ev.stopPropagation();
					const dir = ev.key === "ArrowRight" ? 1 : -1;
					const next = abas[(i + dir + abas.length) % abas.length];
					next.focus();
					irPara(Number(next.getAttribute("data-tela")));
				}
				if (ev.key === "Home") {
					ev.preventDefault();
					abas[0].focus();
					irPara(Number(abas[0].getAttribute("data-tela")));
				}
				if (ev.key === "End") {
					ev.preventDefault();
					abas.at(-1).focus();
					irPara(Number(abas.at(-1).getAttribute("data-tela")));
				}
			});
		}
		const ticker = document.querySelector(".db-ticker[data-pause]");
		if (ticker && !ticker.dataset.ligado) {
			ticker.dataset.ligado = "1";
			ticker.addEventListener("click", () => {
				ticker.classList.toggle("is-pausado");
			});
		}
		for (const waffle of document.querySelectorAll(".db-waffle")) {
			const dica = waffle.parentElement?.querySelector("[data-waffle-dica]");
			waffle.addEventListener("click", (ev) => {
				const seat = ev.target.closest(".db-seat");
				if (!seat) return;
				for (const s of waffle.querySelectorAll(".db-seat.is-on"))
					s.classList.remove("is-on");
				seat.classList.add("is-on");
				if (dica) {
					dica.hidden = false;
					dica.textContent = `${seat.dataset.agr} · ${seat.dataset.nome} · ${seat.dataset.votos} votos`;
				}
			});
			waffle.addEventListener("keydown", (ev) => {
				if (ev.key !== "Enter" && ev.key !== " ") return;
				const seat = ev.target.closest(".db-seat");
				if (!seat) return;
				ev.preventDefault();
				seat.click();
			});
		}
	}
}

function pintar(animarGraf) {
	const antes = capturarFlip();
	if (!dados?.cargos) {
		app.innerHTML = `<div class="db"><div class="carregando"><b>Carregando arquivo…</b><p>Snapshot do 1º turno encerrado.</p></div></div>`;
		return;
	}
	const graficos = new Map();
	const horaTse = horaTseAtual() ?? "—";
	app.classList.toggle("db-entrada", primeiraPintura);
	app.innerHTML = renderizarPainel({
		cargos: dados.cargos,
		analise: dados.analise,
		hist,
		tela,
		graficos,
		horaTse,
		erro: dados.erro,
		encerrada: dados.encerrada,
	});
	ativar();
	pintarGraficos(graficos, animarGraf);
	ligarBarras();
	ligarInteracoes();
	flip(antes);
	primeiraPintura = false;
	app.classList.remove("db-entrada");
}

async function carregar() {
	try {
		const res = await fetch("./estado.json", { cache: "no-store" });
		if (!res.ok) throw new Error(`estado ${res.status}`);
		dados = await res.json();
		// Arquivo: não há próxima consulta.
		dados.proximaConsulta = null;
		dados.encerrada = true;
		definirArquivoCongelado(true);
		atualizarFaixaDados(dados);
		pintar(true);
	} catch (erro) {
		app.innerHTML = `<div class="db"><div class="carregando"><b>Falha no snapshot</b><p class="erro" role="alert">${erro.message}</p></div></div>`;
	}
}

app.innerHTML = `<div class="db"><div class="carregando"><b>Carregando arquivo…</b><p>Snapshot do 1º turno encerrado.</p></div></div>`;
document.addEventListener("keydown", (ev) => {
	if (
		ev.target instanceof HTMLInputElement ||
		ev.target instanceof HTMLTextAreaElement
	)
		return;
	// 1/2 mudam tela; setas ←→ são do PrototypeSwitcher (proto-variant.js).
	if (ev.key === "1" || ev.key === "2") irPara(Number(ev.key));
});

addEventListener("popstate", () => {
	tela = Number(new URLSearchParams(location.search).get("tela")) || 1;
	if (tela !== 1 && tela !== 2) tela = 1;
	pintar(false);
});

carregar();
