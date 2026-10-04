import { renderizarPresidente } from "./tela1-presidente.js";

const raiz = document.querySelector("[data-app]");
const statusEl = document.querySelector("[data-status]");

async function atualizar() {
	try {
		const res = await fetch("/api/apuracao", { cache: "no-store" });
		if (!res.ok) throw new Error(`API ${res.status}`);
		const dados = await res.json();
		const presidente = dados.cargos?.presidente;
		raiz.innerHTML = renderizarPresidente(presidente);

		const hora = presidente?.hora ?? "—";
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

atualizar();
setInterval(atualizar, 5000);
