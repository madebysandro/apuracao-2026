import { renderizarPresidente } from "./tela1-presidente.js";
import { renderizarTela2 } from "./tela2-proporcionais.js";

const raiz = document.querySelector("[data-app]");
const statusEl = document.querySelector("[data-status]");
const abas = document.querySelector("[data-abas]");

function telaInicial() {
	const params = new URLSearchParams(location.search);
	return params.get("tela") === "2" ? 2 : 1;
}

let tela = telaInicial();

function marcarAbas() {
	if (!abas) return;
	for (const botao of abas.querySelectorAll("[data-tela]")) {
		const n = Number(botao.dataset.tela);
		botao.setAttribute("aria-selected", String(n === tela));
	}
}

function irPara(n, { empurrar = true } = {}) {
	if (n !== 1 && n !== 2) return;
	tela = n;
	marcarAbas();
	const url = new URL(location.href);
	if (tela === 1) url.searchParams.delete("tela");
	else url.searchParams.set("tela", "2");
	if (empurrar) history.pushState({ tela }, "", url);
	else history.replaceState({ tela }, "", url);
	pintarUltimo();
}

let ultimoDados = null;

function pintarUltimo() {
	if (!ultimoDados) return;
	if (tela === 1) {
		raiz.innerHTML = renderizarPresidente(ultimoDados.cargos?.presidente);
	} else {
		raiz.innerHTML = renderizarTela2(ultimoDados);
	}
}

async function atualizar() {
	try {
		const res = await fetch("/api/apuracao", { cache: "no-store" });
		if (!res.ok) throw new Error(`API ${res.status}`);
		const dados = await res.json();
		ultimoDados = dados;
		pintarUltimo();

		const hora =
			dados.cargos?.presidente?.hora ??
			dados.cargos?.depfed?.hora ??
			"—";
		const prox = dados.proximaConsulta
			? Math.max(0, Math.round((dados.proximaConsulta - Date.now()) / 1000))
			: "—";
		statusEl.innerHTML = `
      <span class="vivo"><i></i>Ao vivo</span>
      <span>TSE ${hora}</span>
      <span>versão ${dados.versao}</span>
      <span>próxima consulta em ${prox}s</span>
      ${dados.erro ? `<span class="erro">${dados.erro}</span>` : ""}
    `;
	} catch (erro) {
		statusEl.innerHTML = `<span class="erro">Falha ao ler a API: ${erro.message}</span>`;
	}
}

abas?.addEventListener("click", (ev) => {
	const botao = ev.target.closest("[data-tela]");
	if (!botao) return;
	irPara(Number(botao.dataset.tela));
});

addEventListener("keydown", (ev) => {
	if (ev.target && /input|textarea|select/i.test(ev.target.tagName)) return;
	if (ev.key === "1") irPara(1);
	if (ev.key === "2") irPara(2);
});

addEventListener("popstate", () => {
	tela = telaInicial();
	marcarAbas();
	pintarUltimo();
});

marcarAbas();
atualizar();
setInterval(atualizar, 5000);
