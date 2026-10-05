/** Gráfico SVG da Tela 1 (variante D) — linhas sem biblioteca. */

import { preferirCalmo } from "./movimento/calmo.js";
import {
	animarRevelacao,
	clipRevelacao,
	htmlClipPath,
} from "./movimento/revela-grafico.js";
import { esc, pf } from "./tela1-util.js";

const passoBonito = (raw) =>
	[0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50].find((x) => x >= raw) ??
	100;
const faixa = (a, b, p) => {
	const r = [];
	for (let v = a; v <= b + 1e-9; v += p) r.push(+v.toFixed(6));
	return r;
};
const fmtTick = (v, p) =>
	v
		.toFixed(p >= 1 ? 0 : Number.isInteger(+(p * 10).toFixed(6)) ? 1 : 2)
		.replace(".", ",");

/**
 * @param {string} id
 * @param {{ rotulo: string, ref: number|null, series: { nome: string, cor: string, pts: number[][] }[], escala?: object }} cfg
 * @param {number} W
 * @param {boolean} animar
 */
export function svgLinhas(id, cfg, W, animar) {
	const H = 210;
	const m = { t: 14, r: 58, b: 26, l: 38 };
	const pw = W - m.l - m.r;
	const ph = H - m.t - m.b;
	const series = cfg.series.filter((s) => s.pts.length);
	const xs = [...new Set(series.flatMap((s) => s.pts.map((p) => p[0])))].sort(
		(p, q) => p - q,
	);
	if (!xs.length || pw < 80) {
		return '<p class="db-vazio">A linha aparece a partir da 2ª leitura do TSE.</p>';
	}
	let x0 = xs[0];
	let x1 = xs.at(-1);
	if (x1 - x0 < 0.5) {
		x0 -= 1;
		x1 += 1;
	} else x1 += (x1 - x0) * 0.03;
	const ys = series.flatMap((s) => s.pts.map((p) => p[1]));
	let y0 = Math.min(...ys);
	let y1 = Math.max(...ys);
	if (cfg.ref != null && cfg.ref > y0 - 8 && cfg.ref < y1 + 8) {
		y0 = Math.min(y0, cfg.ref);
		y1 = Math.max(y1, cfg.ref);
	}
	const folga = Math.max(0.4, (y1 - y0) * 0.12);
	const py = passoBonito((y1 - y0 + 2 * folga) / 4);
	y0 = Math.floor((y0 - folga) / py) * py;
	y1 = Math.ceil((y1 + folga) / py) * py;
	const px = passoBonito((x1 - x0) / Math.max(2, Math.floor(pw / 90)));
	const X = (v) => m.l + ((v - x0) / (x1 - x0)) * pw;
	const Y = (v) => m.t + (1 - (v - y0) / (y1 - y0)) * ph;
	cfg.escala = { X, x0, x1, m, pw, xs };
	const grade =
		faixa(y0, y1, py)
			.map(
				(v) =>
					`<line class="g" x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}"/><text class="t" x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end">${fmtTick(v, py)}</text>`,
			)
			.join("") +
		faixa(Math.ceil(x0 / px) * px, x1, px)
			.map(
				(v) =>
					`<text class="t" x="${X(v)}" y="${H - 7}" text-anchor="middle">${fmtTick(v, px)}%</text>`,
			)
			.join("");
	const ref =
		cfg.ref != null && cfg.ref >= y0 && cfg.ref <= y1
			? `<line class="ref" x1="${m.l}" x2="${W - m.r}" y1="${Y(cfg.ref)}" y2="${Y(cfg.ref)}"/><text class="t" x="${m.l + 6}" y="${Y(cfg.ref) + 14}">maioria absoluta (${cfg.ref}%)</text>`
			: "";
	const pontas = series
		.map((s) => {
			const p = s.pts.at(-1);
			return { s, x: X(p[0]), y: Y(p[1]), v: p[1] };
		})
		.sort((p, q) => p.y - q.y);
	let ult = -Infinity;
	for (const p of pontas) {
		p.ly = Math.max(p.y, ult + 15);
		ult = p.ly;
	}
	const linhas = series
		.map(
			(s) =>
				`<path class="l" stroke="${s.cor}" d="${s.pts
					.map(
						(p, i) =>
							`${i ? "L" : "M"}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`,
					)
					.join("")}"/>`,
		)
		.join("");
	const marcas = pontas
		.map(
			(p) =>
				`<circle class="ping" cx="${p.x}" cy="${p.y}" r="4" fill="${p.s.cor}"/><circle class="pt" cx="${p.x}" cy="${p.y}" r="4" fill="${p.s.cor}"/>` +
				(p.ly - p.y > 2
					? `<line class="guia" x1="${p.x + 5}" y1="${p.y}" x2="${p.x + 10}" y2="${p.ly - 4}"/>`
					: "") +
				`<text class="v" x="${p.x + 10}" y="${p.ly + 4}">${pf.format(p.v)}%</text>`,
		)
		.join("");
	const { de, para } = clipRevelacao(
		id,
		xs.at(-1),
		X,
		W,
		m.l,
		animar && !preferirCalmo(),
	);
	return `<svg width="${W}" height="${H}" role="img" aria-label="${esc(cfg.rotulo)}">
    <defs>${htmlClipPath(id, H, de, para)}</defs>
    ${grade}<line class="eixo" x1="${m.l}" x2="${W - m.r}" y1="${m.t + ph}" y2="${m.t + ph}"/>${ref}
    <g clip-path="url(#cl-${id})">${linhas}${marcas}</g>
    <line class="mira" x1="-10" x2="-10" y1="${m.t}" y2="${m.t + ph}"/>
    <rect class="hit" x="${m.l}" y="${m.t}" width="${pw}" height="${ph}"/>
  </svg>${xs.length < 2 ? '<p class="db-vazio">A linha aparece a partir da 2ª leitura do TSE.</p>' : ""}<div class="db-tip" hidden></div>`;
}

/** Tooltip com valores, % apurado e hora do TSE (protótipo). */
export function ligarHover(el, cfg) {
	const svg = el.querySelector("svg");
	if (!svg || !cfg.escala) return;
	const tip = el.querySelector(".db-tip");
	const mira = svg.querySelector(".mira");
	const hit = svg.querySelector(".hit");
	if (!tip || !mira || !hit) return;
	const { X, x0, x1, m, pw, xs } = cfg.escala;
	hit.addEventListener("pointermove", (e) => {
		const r = svg.getBoundingClientRect();
		const xv = x0 + ((e.clientX - r.left - m.l) / pw) * (x1 - x0);
		const ap = xs.reduce((p, q) =>
			Math.abs(q - xv) < Math.abs(p - xv) ? q : p,
		);
		const px = X(ap);
		mira.setAttribute("x1", String(px));
		mira.setAttribute("x2", String(px));
		mira.classList.add("on");
		const vals = cfg.series
			.map((s) => [s, s.pts.findLast((p) => p[0] === ap)])
			.filter(([, p]) => p)
			.sort((p, q) => q[1][1] - p[1][1]);
		tip.innerHTML =
			`<b>${pf.format(ap)}% apurado${vals[0]?.[1][2] ? " · " + esc(vals[0][1][2]) : ""}</b>` +
			vals
				.map(
					([s, p]) =>
						`<div><i style="background:${s.cor}"></i>${esc(s.nome)}<span>${pf.format(p[1])}%</span></div>`,
				)
				.join("");
		tip.hidden = false;
		tip.style.left =
			Math.max(0, Math.min(px + 12, r.width - tip.offsetWidth)) + "px";
		tip.style.top = m.t + "px";
	});
	hit.addEventListener("pointerleave", () => {
		tip.hidden = true;
		mira.classList.remove("on");
	});
}

/** @type {Map|null} */
let graficosAtuais = null;
let redim;

/**
 * @param {Map} graficos
 * @param {boolean} animar
 */
export function pintarGraficos(graficos, animar) {
	graficosAtuais = graficos;
	const animarDeVerdade = animar && !preferirCalmo();
	for (const [id, cfg] of graficos) {
		const el = document.querySelector(`[data-graf="${id}"]`);
		if (!el) continue;
		const W = Math.max(280, Math.floor(el.clientWidth || 320));
		el.innerHTML = svgLinhas(id, cfg, W, animarDeVerdade);
		ligarHover(el, cfg);
	}
	// Catálogo: revelação em 1100 ms, curva 1 − (1 − k)³.
	animarRevelacao(document);
}

if (typeof addEventListener === "function") {
	addEventListener("resize", () => {
		clearTimeout(redim);
		redim = setTimeout(() => {
			if (graficosAtuais) pintarGraficos(graficosAtuais, false);
		}, 150);
	});
}
