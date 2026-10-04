/** Utilitários compartilhados da Tela 1 (variante D do protótipo). */

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

export function fmt(v, t = "n") {
	return t === "p" ? `${pf.format(v)}%` : nf.format(Math.round(v));
}

const memoria = new Map();

export function conta(k, v, t = "n", delta = false) {
	const de = memoria.has(k) ? memoria.get(k) : 0;
	memoria.set(k, v);
	const mudou = de > 0 && fmt(de, t) !== fmt(v, t);
	const dif = Math.abs(v - de);
	const num = t === "p" ? pf.format(dif) : nf.format(Math.round(dif));
	return (
		`<span class="conta ${mudou ? "mudou" : ""}" data-de="${de}" data-para="${v}" data-t="${t}">${fmt(de, t)}</span>` +
		(mudou && delta
			? `<small class="delta ${v > de ? "sobe" : "desce"}">${v > de ? "▲" : "▼"} ${num}</small>`
			: "")
	);
}

export function anima(k, prop, v, extra = "", un = "%") {
	const de = memoria.has(k) ? memoria.get(k) : un === "%" ? 0 : v;
	memoria.set(k, v);
	return `data-anim="${prop}" data-para="${v}${un}" style="${prop}:${de}${un};${extra}"`;
}

function preferirCalmo() {
	return (
		typeof matchMedia === "function" &&
		matchMedia("(prefers-reduced-motion: reduce)").matches
	);
}

/** Continuidade da faixa DESTAQUES: 55 px/s e atraso negativo pelo relógio. */
export function continuarTicker() {
	const rolo = document.querySelector(".db-rolo");
	if (!(rolo instanceof HTMLElement)) return;
	if (preferirCalmo()) {
		rolo.style.animation = "none";
		rolo.style.transform = "none";
		return;
	}
	const metade = rolo.scrollWidth / 2;
	const dur = Math.max(12, metade / 55);
	const t = (Date.now() / 1000) % dur;
	rolo.style.animationDuration = `${dur}s`;
	rolo.style.animationDelay = `-${t}s`;
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

export function corD(ns, id) {
	const k = `${ns}:${id}`;
	if (!coresD.has(k)) {
		const i = proxCor.get(ns) ?? 0;
		proxCor.set(ns, i + 1);
		coresD.set(k, i < 8 ? `var(--s${i + 1})` : "var(--outros)");
	}
	return coresD.get(k);
}

export function deltaPp(v, neutro = false) {
	const r = Math.round(v * 100) / 100;
	if (!r) return '<span class="d">= 0,00</span>';
	return `<span class="d ${neutro ? "" : r > 0 ? "sobe" : "desce"}">${r > 0 ? "▲" : "▼"} ${pf.format(Math.abs(r))}</span>`;
}

export function spark(vals, w = 72, h = 22, vivo = false) {
	if (vals.length < 2) {
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

export function pontos(hist, id) {
	return hist.filter(
		(p, i) =>
			p.c[id] &&
			!(
				hist[i + 1]?.c[id]?.hora === p.c[id].hora &&
				hist[i + 1]?.c[id]?.ap === p.c[id].ap
			),
	);
}

export function anteriorD(hist, id) {
	return pontos(hist, id).at(-2)?.c[id] ?? null;
}

export function serieCand(hist, id, n) {
	return pontos(hist, id)
		.filter((p) => p.c[id].c[n])
		.map((p) => [p.c[id].ap, p.c[id].c[n][1], p.c[id].hora]);
}

const media = (v) => v.reduce((a, b) => a + b, 0) / v.length;

export function tendencia(hist, id, n) {
	const s = serieCand(hist, id, n).slice(-8);
	if (s.length < 3) return null;
	const mx = media(s.map((p) => p[0]));
	const my = media(s.map((p) => p[1]));
	const sxx = s.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
	if (sxx < 0.25) return null;
	return (
		(s.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / sxx) * 10
	);
}

export function restante(c) {
	const f = c.totais.eleitoradoApurado / c.totais.eleitorado;
	return f > 0 && f < 1 ? c.totais.validos / f - c.totais.validos : null;
}

export function aviso(texto) {
	const el = document.getElementById("aviso");
	if (!el) return;
	el.innerHTML = `<i></i><span>${esc(texto)}</span>`;
	el.classList.add("on");
	clearTimeout(aviso._t);
	// Catálogo: resumo permanece ~7 s.
	aviso._t = setTimeout(() => el.classList.remove("on"), 7000);
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
