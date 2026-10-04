import { renderizarPresidente } from "./tela1-presidente.js";
import {
	ativar,
	aviso,
	capturarFlip,
	flip,
	ligarSeletorTema,
	resumoAtualizacao,
} from "./movimento/index.js";

const raiz = document.querySelector("[data-app]");
const statusEl = document.querySelector("[data-status]");

ligarSeletorTema();

let versao = -1;
/** @type {{ cargos?: { presidente?: { apurado?: number, hora?: string, candidatos?: { n: number }[] } } } | null} */
let anterior = null;

async function atualizar() {
	try {
		const res = await fetch("/api/apuracao", { cache: "no-store" });
		if (!res.ok) throw new Error(`API ${res.status}`);
		const dados = await res.json();
		const presidente = dados.cargos?.presidente;
		const mudou = dados.versao !== versao && versao >= 0;
		const antesFlip = mudou ? capturarFlip() : new Map();

		raiz.innerHTML = renderizarPresidente(presidente);
		ativar();
		flip(antesFlip);

		if (mudou && anterior?.cargos?.presidente && presidente) {
			const liderAntes = anterior.cargos.presidente.candidatos?.[0]?.n;
			const liderDepois = presidente.candidatos?.[0]?.n;
			const viradas =
				liderAntes != null && liderAntes !== liderDepois ? ["Presidente"] : [];
			aviso(
				resumoAtualizacao({
					hora: presidente.hora,
					apuradoAntes: anterior.cargos.presidente.apurado,
					apuradoDepois: presidente.apurado,
					viradas,
				}),
			);
		}

		versao = dados.versao;
		anterior = dados;

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
