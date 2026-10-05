/**
 * Barras "fluxo de votos" (issue #13 / protótipo variante 2).
 * Altura em --barra-altura; mola subamortecida; pontos proporais ao ganho da última leitura.
 * O estado por chave sobrevive aos redesenhos do #app.
 */
import { nascerBarra } from "../arquivo.js";
import { arquivoCongelado } from "../tela1-util.js";
import { preferirCalmo } from "./calmo.js";

const estadoBarras = new Map();
/** @type {{ el: HTMLElement, st: any }[]} */
let barrasVivas = [];
let laco = null;
let ultimoQuadro = 0;

/** Marcação da barra; `alvo` em %; `ritmo` 0..1 = ganho relativo na última leitura. */
export function barraViva(k, alvo, _ant, ritmo, cor, extra = "") {
	return `<span class="bv" data-barra="${k}" data-alvo="${alvo}" data-ritmo="${ritmo}" style="--c:${cor}"><canvas></canvas>${extra}</span>`;
}

export function ligarBarras() {
	barrasVivas = [...document.querySelectorAll("[data-barra]")].map((el) => {
		const k = el.dataset.barra;
		const alvo = +el.dataset.alvo;
		let st = estadoBarras.get(k);
		if (!st) {
			estadoBarras.set(k, (st = nascerBarra(alvo, arquivoCongelado)));
		} else if (arquivoCongelado) {
			Object.assign(st, nascerBarra(alvo, true));
		} else if (Math.abs(alvo - (st.alvo ?? 0)) > 1e-6) {
			st.energia = 1;
		}
		Object.assign(st, { alvo, ritmo: +el.dataset.ritmo });
		el._cv = el.querySelector("canvas");
		el._cor = getComputedStyle(el).getPropertyValue("--c").trim();
		return { el, st };
	});
	if (!laco && barrasVivas.length) laco = requestAnimationFrame(quadroBarras);
}

function quadroBarras(t) {
	const dt = Math.min(0.05, ultimoQuadro ? (t - ultimoQuadro) / 1000 : 0.016);
	ultimoQuadro = t;
	barrasVivas = barrasVivas.filter((b) => b.el.isConnected);
	if (!barrasVivas.length) {
		laco = null;
		ultimoQuadro = 0;
		return;
	}
	const calmo = preferirCalmo();
	for (const { el, st } of barrasVivas) {
		if (calmo) Object.assign(st, { v: st.alvo, vel: 0, energia: 0, parts: [] });
		else {
			st.vel += (90 * (st.alvo - st.v) - 13 * st.vel) * dt;
			st.v += st.vel * dt;
			st.energia *= Math.exp(-dt / 2.5);
		}
		quadroFluxo(el, st, dt, calmo);
	}
	laco = requestAnimationFrame(quadroBarras);
}

function quadroFluxo(el, st, dt, calmo) {
	const cv = el._cv;
	const w = el.clientWidth;
	const h = el.clientHeight;
	const dpr = devicePixelRatio || 1;
	if (cv.width !== Math.round(w * dpr)) {
		cv.width = Math.round(w * dpr);
		cv.height = Math.round(h * dpr);
	}
	const ctx = cv.getContext("2d");
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.clearRect(0, 0, w, h);
	const ponta = (Math.max(0, Math.min(100, st.v)) / 100) * w;
	ctx.fillStyle = el._cor;
	ctx.beginPath();
	ctx.roundRect(0, 0, ponta, h, h / 2);
	ctx.fill();
	if (!calmo) {
		st.acum += dt * (1.2 + st.ritmo * 14 + st.energia * 10);
		for (; st.acum >= 1; st.acum--) {
			st.parts.push({
				x: 0,
				vx: (0.3 + Math.random() * 0.4) * w,
				y: 1.5 + Math.random() * (h - 3),
			});
		}
	}
	st.parts = st.parts.filter((q) => (q.x += q.vx * dt) < ponta - 2);
	ctx.fillStyle = "rgba(255,255,255,.8)";
	for (const q of st.parts) {
		ctx.beginPath();
		ctx.arc(q.x, q.y, 1.1, 0, 7);
		ctx.fill();
	}
	if (ponta > 0) {
		const g = ctx.createRadialGradient(ponta, h / 2, 0, ponta, h / 2, 9);
		g.addColorStop(0, `rgba(255,255,255,${0.35 + 0.5 * st.energia})`);
		g.addColorStop(1, "rgba(255,255,255,0)");
		ctx.fillStyle = g;
		ctx.fillRect(ponta - 9, 0, 18, h);
	}
}
