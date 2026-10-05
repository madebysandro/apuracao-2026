/**
 * Faixa de status fixa no topo (issue #13 / protótipo commit 2b80ca4).
 * Vive fora de #app — animações (odômetro, anel, ciclo) não reiniciam no redesenho.
 */
import { apresentarFaixa } from "../arquivo.js";
import { esc } from "../tela1-util.js";
import { preferirCalmo } from "./calmo.js";

/** @type {HTMLElement | null} */
let sd = null;
/** @type {((sel: string) => HTMLElement) | null} */
let sdEl = null;
/** @type {any} */
let dadosRef = null;
/** @type {(() => string | null) | null} */
let horaTseFn = null;
let quadroLigado = false;

function odometro(el, texto) {
	const antigo = el._txt;
	if (antigo === texto) return;
	el._txt = texto;
	el.innerHTML = [...texto]
		.map(
			(ch) =>
				`<span class="od"><span>${ch === " " ? "&nbsp;" : esc(ch)}</span></span>`,
		)
		.join("");
	if (preferirCalmo() || antigo == null || antigo.length !== texto.length) return;
	const opts = { duration: 420, easing: "cubic-bezier(.2,.8,.2,1)" };
	[...el.children].forEach((cel, i) => {
		if (antigo[i] === texto[i]) return;
		const velho = document.createElement("span");
		velho.className = "od-velho";
		velho.textContent = antigo[i];
		cel.append(velho);
		cel.firstChild.animate(
			[
				{ transform: "translateY(90%)", opacity: 0 },
				{ transform: "none", opacity: 1 },
			],
			opts,
		);
		velho.animate(
			[
				{ transform: "none", opacity: 1 },
				{ transform: "translateY(-90%)", opacity: 0 },
			],
			opts,
		).onfinish = () => velho.remove();
	});
}

/** Idade relativa à hora dos dados do TSE (HH:MM:SS de hoje). */
export function idadeTse(hora) {
	const m = /^(\d\d):(\d\d):(\d\d)/.exec(hora ?? "");
	if (!m) return "";
	const d = new Date();
	d.setHours(+m[1], +m[2], +m[3], 0);
	let diff = Date.now() - d.getTime();
	if (diff < -60_000) diff += 86_400_000;
	if (diff < 0) diff = 0;
	const min = Math.floor(diff / 60_000);
	return min < 1 ? "· agora há pouco" : `· há ${min} min`;
}

function quadroStatus() {
	requestAnimationFrame(quadroStatus);
	if (!sd || !sdEl) return;
	const dados = dadosRef;
	const hora = horaTseFn?.() ?? null;
	const ativo = Boolean(
		dados?.cargos &&
			(dados.cargos.presidente ||
				dados.cargos.governador ||
				dados.cargos.depfed),
	);
	if (sd.hidden === ativo) sd.hidden = !ativo;
	if (!ativo) return;
	const ap = apresentarFaixa(dados);
	const a = dados.consultadoEm;
	const b = ap.consulta ? dados.proximaConsulta : null;
	const agora = Date.now();
	const frac = a && b > a ? Math.min(1, (agora - a) / (b - a)) : 1;
	const s = b ? Math.max(0, Math.ceil((b - agora) / 1000)) : 0;
	sdEl(".sd-arco").style.strokeDashoffset = (50.27 * frac).toFixed(2);
	sdEl(".sd-ciclo").style.transform = `scaleX(${frac.toFixed(4)})`;
	sdEl(".sd-anel").classList.toggle("girando", ap.consulta && s === 0);
	odometro(sdEl(".sd-seg"), s ? `${String(s).padStart(2, "0")}s` : "···");
	odometro(
		sdEl(".sd-relogio"),
		new Date().toLocaleTimeString("pt-BR", { hour12: false }),
	);
	odometro(sdEl(".sd-tse"), hora ?? "—");
	// Arquivo: uma hora só (a do TSE). Ao vivo: também a idade relativa.
	const idade = ap.mostrarIdade ? idadeTse(hora) : "";
	if (sdEl(".sd-idade").textContent !== idade) {
		sdEl(".sd-idade").textContent = idade;
	}
	const rot = sdEl(".sd-rot-tse");
	if (rot && rot.textContent !== ap.rotuloTse) rot.textContent = ap.rotuloTse;
	sd.classList.toggle("encerrada", ap.modo === "arquivo");
	if (sdEl(".sd-vivo-txt").textContent !== ap.rotulo) {
		sdEl(".sd-vivo-txt").textContent = ap.rotulo;
	}
	sd.classList.toggle("erro", ap.modo === "instavel");
	let arq = sd.querySelector(".sd-arquivo");
	if (ap.carimbo) {
		if (!arq) {
			arq = document.createElement("span");
			arq.className = "sd-arquivo";
			sdEl(".sd-dir").insertBefore(arq, sdEl(".sd-dir").firstChild);
		}
		if (arq.textContent !== ap.carimbo) arq.textContent = ap.carimbo;
	} else if (arq) {
		arq.remove();
	}
}

/**
 * @param {{
 *   obterHoraTse: () => string | null,
 *   onTema: () => void,
 * }} opts
 */
export function iniciarFaixaStatus(opts) {
	sd = document.getElementById("status-d");
	if (!sd) return;
	sdEl = (sel) => /** @type {HTMLElement} */ (sd.querySelector(sel));
	horaTseFn = () => opts.obterHoraTse();
	const temaBtn = sd.querySelector("[data-tema-toggle]");
	if (temaBtn && !temaBtn.dataset.ligado) {
		temaBtn.dataset.ligado = "1";
		temaBtn.addEventListener("click", () => opts.onTema());
	}
	if (!quadroLigado) {
		quadroLigado = true;
		requestAnimationFrame(quadroStatus);
	}
}

/** Atualiza a referência lida pelo quadro (chamar a cada resposta da API). */
export function atualizarFaixaDados(dados) {
	dadosRef = dados;
}

/** Resumo da atualização na faixa (~7 s); substitui o aviso no canto. */
export function novidadeStatus(texto) {
	if (!sd || !sdEl) return;
	const base = sdEl(".sd-base");
	const nov = sdEl(".sd-novidade");
	const meio = sdEl(".sd-meio");
	nov.innerHTML = `<i></i>${esc(texto)}`;
	nov.hidden = false;
	meio.classList.remove("flash");
	void meio.offsetWidth;
	meio.classList.add("flash");
	const opts = {
		duration: preferirCalmo() ? 0 : 450,
		easing: "cubic-bezier(.2,.8,.2,1)",
		fill: "forwards",
	};
	const sai = [
		{ transform: "none", opacity: 1 },
		{ transform: "translateY(-100%)", opacity: 0 },
	];
	const entra = [
		{ transform: "translateY(100%)", opacity: 0 },
		{ transform: "none", opacity: 1 },
	];
	for (const el of [base, nov]) el.getAnimations().forEach((x) => x.cancel());
	base.animate(sai, opts);
	nov.animate(entra, opts);
	clearTimeout(novidadeStatus.t);
	novidadeStatus.t = setTimeout(() => {
		base.animate(entra, opts);
		nov.animate(sai, opts).onfinish = () => {
			nov.hidden = true;
		};
	}, 7000);
}
