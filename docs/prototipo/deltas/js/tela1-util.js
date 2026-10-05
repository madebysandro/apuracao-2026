/** Utilitários compartilhados da Tela 1 (variante D do protótipo). */

import { preferirCalmo } from "./movimento/calmo.js";
import { pontos } from "./pontos-hist.js";

export { pontos };

export const nf = new Intl.NumberFormat("pt-BR");
export const pf = new Intl.NumberFormat("pt-BR", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});
export const cf = new Intl.NumberFormat("pt-BR", {
	notation: "compact",
	maximumFractionDigits: 1,
});

export function esc(texto) {
	return String(texto ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

export function nomeBonito(s) {
	return String(s)
		.toLowerCase()
		.replace(/(^|[\s.-])(\p{L})/gu, (_m, a, b) => a + b.toUpperCase())
		.replace(/ (Da|De|Do|Dos|Das|E) /g, (w) => w.toLowerCase());
}

/** Iniciais para fallback do rosto (protótipo #13). */
export function iniciais(nome) {
	return String(nome)
		.split(/\s+/)
		.filter((p) => p.length > 2)
		.slice(0, 2)
		.map((p) => p[0])
		.join("");
}

/** Rosto oficial do TSE com anel; foto quebrada/ausente vira iniciais. */
export function foto(x, cls = "") {
	const img = x.foto
		? `<img src="${esc(x.foto)}" alt="" loading="lazy" onerror="this.remove()">`
		: "";
	return `<span class="foto ${cls}" data-ini="${esc(iniciais(x.nome))}">${img}</span>`;
}

export function fmt(v, t = "n") {
	return t === "p" ? `${pf.format(v)}%` : nf.format(Math.round(v));
}

const memoria = new Map();
/** Quando true, conta() não anima a partir de 0 (arquivo encerrado). */
export let arquivoCongelado = false;
export function definirArquivoCongelado(v) { arquivoCongelado = Boolean(v); }

export function conta(k, v, t = "n") {
	const de = memoria.has(k) ? memoria.get(k) : arquivoCongelado ? v : 0;
	memoria.set(k, v);
	const mudou = !arquivoCongelado && de > 0 && fmt(de, t) !== fmt(v, t);
	return `<span class="conta ${mudou ? "mudou" : ""}" data-de="${de}" data-para="${v}" data-t="${t}">${fmt(de, t)}</span>`;
}

/** Continuidade da faixa DESTAQUES: 55 px/s e atraso negativo pelo relógio (protótipo). */
export function continuarTicker() {
	const rolo = document.querySelector(".db-rolo");
	if (!(rolo instanceof HTMLElement)) return;
	if (preferirCalmo()) {
		rolo.style.animation = "none";
		rolo.style.transform = "none";
		return;
	}
	const dur = Math.max(30, rolo.scrollWidth / 2 / 55);
	rolo.style.animationDuration = `${dur}s`;
	rolo.style.animationDelay = `-${(performance.now() / 1000) % dur}s`;
}

export function ativar() {
	const calmo = preferirCalmo();
	requestAnimationFrame(() =>
		requestAnimationFrame(() => {
			for (const el of document.querySelectorAll("[data-anim]")) {
				el.style[el.dataset.anim] = el.dataset.para;
			}
			continuarTicker();
		}),
	);
	for (const el of document.querySelectorAll(".conta")) {
		const de = +el.dataset.de;
		const para = +el.dataset.para;
		const t = el.dataset.t;
		if (calmo || de === para) {
			el.textContent = fmt(para, t);
			continue;
		}
		const t0 = performance.now();
		const passo = (agora) => {
			const k = Math.min(1, (agora - t0) / 1500);
			el.textContent = fmt(de + (para - de) * (1 - (1 - k) ** 3), t);
			if (k < 1) requestAnimationFrame(passo);
		};
		requestAnimationFrame(passo);
	}
}

const coresD = new Map();
const proxCor = new Map();

export function corD(ns, id, somenteExistente = false) {
	const k = `${ns}:${id}`;
	if (coresD.has(k)) return coresD.get(k);
	if (somenteExistente) return undefined;
	const i = proxCor.get(ns) ?? 0;
	proxCor.set(ns, i + 1);
	coresD.set(k, i < 8 ? `var(--s${i + 1})` : "var(--outros)");
	return coresD.get(k);
}

export function deltaPp(v, neutro = false) {
	const r = Math.round(v * 100) / 100;
	if (!r) return '<span class="d">= 0,00</span>';
	return `<span class="d ${neutro ? "" : r > 0 ? "sobe" : "desce"}">${r > 0 ? "▲" : "▼"} ${pf.format(Math.abs(r))}</span>`;
}

export function deltaInt(v) {
	if (v == null) return "";
	if (!v) return `<span class="d">=</span>`;
	return `<span class="d ${v > 0 ? "sobe" : "desce"}">${v > 0 ? "▲" : "▼"} ${Math.abs(v)}</span>`;
}

export function spark(vals, w = 72, h = 22, vivo = false) {
	if (!vals || vals.length < 2) {
		return `<svg class="spark" width="${w}" height="${h}" aria-hidden="true"></svg>`;
	}
	const mn = Math.min(...vals);
	const mx = Math.max(...vals);
	const d = mx - mn || 1;
	const pts = vals.map((v, i) => [
		2 + (i / (vals.length - 1)) * (w - 6),
		h - 4 - ((v - mn) / d) * (h - 8),
	]);
	const [lx, ly] = pts.at(-1);
	return `<svg class="spark" width="${w}" height="${h}" aria-hidden="true"><polyline points="${pts
		.map((p) => p.map((n) => n.toFixed(1)).join(","))
		.join(" ")}"/>${vivo ? `<circle class="ping" cx="${lx}" cy="${ly}" r="2.5"/>` : ""}<circle cx="${lx}" cy="${ly}" r="2.5"/></svg>`;
}

export function anteriorD(hist, id) {
	return pontos(hist, id).at(-2)?.c[id] ?? null;
}

export function serieCand(hist, id, n) {
	return pontos(hist, id)
		.filter((p) => p.c[id].c[n])
		.map((p) => [p.c[id].ap, p.c[id].c[n][1], p.c[id].hora]);
}

export function temaSalvo() {
	try {
		return localStorage.getItem("apuracao-tema") || "escuro";
	} catch {
		return "escuro";
	}
}

export function aplicarTema(tema) {
	document.documentElement.setAttribute("data-tema", tema);
	document.body.setAttribute("data-tema", tema);
	try {
		localStorage.setItem("apuracao-tema", tema);
	} catch {
		/* ignore */
	}
}

export function alternarTema() {
	const atual = document.body.getAttribute("data-tema") || "escuro";
	aplicarTema(atual === "escuro" ? "claro" : "escuro");
}
