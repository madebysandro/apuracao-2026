import { renderizarPresidente } from "./tela1-presidente.js";
import { renderizarGovernador } from "./tela1-governador.js";
import { renderizarSenado } from "./tela1-senado.js";
import { renderizarIndicadores } from "./tela1-indicadores.js";

const raiz = document.querySelector("[data-app]");
const statusEl = document.querySelector("[data-status]");
const barraEl = document.querySelector("[data-barra-ciclo]");

let ultimoEstado = null;

function segundosAte(proximaConsulta) {
	if (proximaConsulta == null) return null;
	return Math.max(0, Math.round((proximaConsulta - Date.now()) / 1000));
}

function atualizarBarra(dados) {
	if (!barraEl) return;
	const { consultadoEm, proximaConsulta } = dados ?? {};
	if (consultadoEm == null || proximaConsulta == null) {
		barraEl.style.setProperty("--ciclo", "0%");
		barraEl.setAttribute("aria-valuenow", "0");
		return;
	}
	const total = Math.max(1, proximaConsulta - consultadoEm);
	const andou = Math.min(total, Math.max(0, Date.now() - consultadoEm));
	const pct = Math.round((andou / total) * 100);
	barraEl.style.setProperty("--ciclo", `${pct}%`);
	barraEl.setAttribute("aria-valuenow", String(pct));
}

function renderizarStatus(dados) {
	if (!dados) {
		statusEl.innerHTML = `
      <span class="vivo"><i></i>Ao vivo</span>
      <span>carregando…</span>
    `;
		return;
	}

	const horaTse =
		dados.cargos?.presidente?.hora ??
		dados.cargos?.governador?.hora ??
		dados.cargos?.senador?.hora ??
		"—";
	const prox = segundosAte(dados.proximaConsulta);
	const contagem =
		prox == null ? "próxima consulta —" : `próxima consulta em ${prox}s`;

	const temCargo =
		dados.cargos?.presidente ||
		dados.cargos?.governador ||
		dados.cargos?.senador;

	if (!temCargo && !dados.erro) {
		statusEl.innerHTML = `
      <span class="vivo"><i></i>Ao vivo</span>
      <span>Aguardando a primeira leitura do TSE…</span>
      <span>${contagem}</span>
    `;
		return;
	}

	statusEl.innerHTML = `
    <span class="vivo"><i></i>Ao vivo</span>
    <span>TSE ${horaTse}</span>
    <span>${contagem}</span>
    ${dados.erro ? `<span class="erro" role="alert">Falha na consulta: ${dados.erro}</span>` : ""}
  `;
}

function renderizarPainel(dados) {
	const cargos = dados?.cargos ?? {};
	const semDados =
		!cargos.presidente && !cargos.governador && !cargos.senador;

	if (semDados && dados?.erro) {
		raiz.innerHTML = `<section class="cartao"><p class="erro" role="alert">Não foi possível consultar o TSE: ${dados.erro}. Nova tentativa em breve.</p></section>`;
		return;
	}

	raiz.innerHTML = `
    ${renderizarIndicadores(cargos)}
    <div class="grade-tela1">
      ${renderizarPresidente(cargos.presidente)}
      ${renderizarGovernador(cargos.governador)}
      ${renderizarSenado(cargos.senador)}
    </div>
  `;
}

async function atualizar() {
	try {
		const res = await fetch("/api/apuracao", { cache: "no-store" });
		if (!res.ok) throw new Error(`API ${res.status}`);
		const dados = await res.json();
		ultimoEstado = dados;
		renderizarPainel(dados);
		renderizarStatus(dados);
		atualizarBarra(dados);
	} catch (erro) {
		statusEl.innerHTML = `<span class="erro" role="alert">Falha ao ler a API: ${erro.message}</span>`;
		if (!ultimoEstado) {
			raiz.innerHTML = `<section class="cartao"><p class="erro">Não foi possível carregar a apuração. Tentando de novo…</p></section>`;
		}
	}
}

function tic() {
	if (ultimoEstado) {
		renderizarStatus(ultimoEstado);
		atualizarBarra(ultimoEstado);
	}
}

atualizar();
setInterval(atualizar, 5000);
setInterval(tic, 1000);
