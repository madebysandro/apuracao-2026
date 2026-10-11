/**
 * PROTOTYPE — palco 16-bit da variante (a): cenários noturnos e lutadores desenhados em código (fillRect),
 * canvas lógico de 320×180 ampliado com image-rendering: pixelated. Arte original: nenhum sprite copiado.
 * Lutadores idênticos (mesmo corpo, quimono, faixa, luvas e golpes); só mudam a cor e o número.
 * A cabeça é a foto real pixelada (rosto.js), desenhada sempre em pé, sem rotação nem deformação.
 */
const W = 320;
const CHAO = 166;
const BASE_X = { 22: 112, 13: 208 };
const OLHA = { 22: 1, 13: -1 };
export const CORES = {
	22: { gi: "#3987e5", esc: "#23589a", claro: "#86b6f0" },
	13: { gi: "#d95926", esc: "#8f3712", claro: "#f08f63" },
};
const FAIXA = "#16151c";
const LUVA = "#ecebe6";
const LUVA_ESC = "#b9b7ae";
const PELE = "#b98a6a";

// dígitos 3×5 (fonte própria)
const DIG = {
	1: "010110010010111", 2: "111001111100111", 3: "111001111001111",
};

// LCG determinístico para estrelas, janelas e faíscas
function rng(seed) {
	let x = seed;
	return () => (x = (x * 1103515245 + 12345) % 2147483648) / 2147483648;
}

function faixas(g, cores, y0, y1) {
	const h = (y1 - y0) / cores.length;
	cores.forEach((c, i) => {
		g.fillStyle = c;
		g.fillRect(0, Math.round(y0 + i * h), W, Math.ceil(h) + 1);
		// pontilhado entre faixas (dithering 16-bit)
		if (i) for (let x = (i % 2); x < W; x += 2) g.fillRect(x, Math.round(y0 + i * h) - 1, 1, 1);
	});
}

function ceu(g, cores, seed) {
	faixas(g, cores, 0, 120);
	const r = rng(seed);
	for (let i = 0; i < 60; i++) {
		g.fillStyle = r() > 0.8 ? "#fff7d6" : "#9aa6d8";
		g.fillRect(Math.floor(r() * W), Math.floor(r() * 70), 1, 1);
	}
}

function lua(g, x, y) {
	g.fillStyle = "#f4e9c1";
	for (let dy = -9; dy <= 9; dy++) {
		const w = Math.round(Math.sqrt(81 - dy * dy));
		g.fillRect(x - w, y + dy, w * 2, 1);
	}
	g.fillStyle = "#d9cc9f";
	g.fillRect(x - 3, y - 2, 3, 3);
	g.fillRect(x + 3, y + 3, 2, 2);
}

/** Cenário único (só nacional): Brasília, o Congresso Nacional à noite (torres gêmeas, cúpula e "prato"), espelho d'água. Desenho livre. */
function cenarioBrasilia(g) {
	ceu(g, ["#060a22", "#0b1032", "#121844", "#1a1f57", "#241f63", "#33206a"], 11);
	lua(g, 48, 30);
	// gramado da Esplanada
	faixas(g, ["#0f1a1c", "#0c1618"], 112, 124);
	const branco = "#d7dcea", sombra = "#9aa3bd";
	// laje
	g.fillStyle = sombra;
	g.fillRect(70, 104, 180, 6);
	g.fillStyle = branco;
	g.fillRect(70, 103, 180, 2);
	// cúpula (à esquerda) e prato (à direita)
	g.fillStyle = branco;
	for (let dy = 0; dy < 12; dy++) {
		const w = Math.round(Math.sqrt(144 - dy * dy) * 1.6);
		g.fillRect(118 - w, 102 - dy, w * 2, 1);
	}
	for (let dy = 0; dy < 12; dy++) {
		const w = Math.round(Math.sqrt(144 - (11 - dy) ** 2) * 1.9);
		g.fillRect(212 - w, 90 + dy, w * 2, 1);
	}
	// torres gêmeas e passarela
	for (const tx of [152, 163]) {
		g.fillStyle = branco;
		g.fillRect(tx, 38, 9, 65);
		g.fillStyle = "#f3d27a";
		for (let y = 42; y < 100; y += 4) for (let x = 1; x < 8; x += 3) if ((x + y + tx) % 7) g.fillRect(tx + x, y, 1, 1);
	}
	g.fillStyle = sombra;
	g.fillRect(152, 58, 20, 3);
	// espelho d'água com reflexo
	faixas(g, ["#0b1a33", "#09162c", "#071224"], 124, 146);
	g.fillStyle = "#59617e";
	for (let y = 126; y < 146; y += 3) {
		g.fillRect(152 + ((y * 5) % 4), y, 8, 1);
		g.fillRect(163 + ((y * 3) % 4), y, 8, 1);
	}
	// praça
	faixas(g, ["#2b2b3d", "#252536", "#1f1f2e"], 146, 180);
	g.fillStyle = "#38384e";
	for (let x = 0; x < W; x += 16) g.fillRect(x, 146, 1, 34);
	for (const lx of [20, 300]) {
		g.fillStyle = "#555a70";
		g.fillRect(lx, 120, 2, 30);
		g.fillStyle = "#ffe8a0";
		g.fillRect(lx - 2, 118, 6, 2);
	}
}

/** Retângulo espelhado conforme o lado para onde o lutador olha. */
function pincel(g, x, y, olha, branco) {
	return (dx, dy, w, h, cor) => {
		g.fillStyle = branco ? "#ffffff" : cor;
		g.fillRect(Math.round(olha > 0 ? x + dx : x - dx - w), Math.round(y + dy), w, h);
	};
}

function lutador(g, n, x, y, pose, rosto, { branco = false } = {}) {
	const o = OLHA[n];
	const c = CORES[n];
	const r = pincel(g, x, y, o, branco);
	// sombra
	g.fillStyle = "rgba(0,0,0,.35)";
	g.fillRect(Math.round(x - 18), CHAO + 1, 36, 3);
	const baixo = pose === "ajoelhado" ? 16 : 0;
	const tronco = pose === "dor" ? -4 : pose === "soco" ? 3 : 0;
	// pernas
	if (pose === "ajoelhado") {
		r(-12, -14, 22, 8, c.esc);
		r(-12, -7, 8, 7, c.gi);
		r(4, -16, 7, 16, c.gi);
		r(4, -3, 10, 3, PELE);
		r(-18, -3, 8, 3, PELE);
	} else {
		r(-15, -32, 8, 20, c.esc);
		r(-19, -14, 8, 12, c.esc);
		r(4, -32, 8, 16, c.gi);
		r(8, -17, 8, 15, c.gi);
		r(-23, -3, 10, 3, PELE);
		r(8, -3, 11, 3, PELE);
	}
	const ty = baixo;
	const tx = tronco;
	// tronco, gola em V, faixa
	r(tx - 11, ty - 58, 23, 24, c.gi);
	r(tx - 11, ty - 58, 3, 24, c.esc);
	r(tx - 2, ty - 58, 5, 2, c.claro);
	r(tx, ty - 56, 2, 8, c.claro);
	r(tx - 11, ty - 36, 23, 4, FAIXA);
	r(tx + 6, ty - 33, 3, 8, FAIXA);
	r(tx + 10, ty - 33, 3, 6, FAIXA);
	// número no peito (fonte 3×5 própria), sempre legível: não espelha
	if (!branco) {
		g.fillStyle = "#ffffff";
		const nx = Math.round(x + o * (tx + 0.5)) - 4;
		[...String(n)].forEach((d, k) => {
			const m = DIG[d];
			for (let i = 0; i < 15; i++) if (m[i] === "1") g.fillRect(nx + k * 5 + (i % 3), Math.round(y + ty - 50 + Math.floor(i / 3)), 1, 1);
		});
	}
	// braços e luvas por pose
	const luva = (dx, dy) => {
		r(dx, dy, 8, 8, LUVA);
		r(dx, dy + 6, 8, 2, LUVA_ESC);
	};
	if (pose === "soco") {
		r(tx - 14, ty - 54, 5, 12, c.esc);
		luva(tx - 8, ty - 48);
		r(tx + 10, ty - 55, 22, 6, c.gi);
		luva(tx + 31, ty - 57);
	} else if (pose === "dor") {
		r(tx - 15, ty - 56, 5, 10, c.esc);
		luva(tx - 21, ty - 66);
		r(tx + 10, ty - 56, 5, 10, c.gi);
		luva(tx + 12, ty - 68);
	} else if (pose === "vitoria") {
		r(tx - 14, ty - 54, 5, 12, c.esc);
		luva(tx - 10, ty - 46);
		r(tx + 9, ty - 72, 6, 18, c.gi);
		luva(tx + 8, ty - 82);
	} else if (pose === "ajoelhado") {
		r(tx - 14, ty - 54, 5, 16, c.esc);
		luva(tx - 16, ty - 40);
		r(tx + 10, ty - 54, 5, 16, c.gi);
		luva(tx + 10, ty - 40);
	} else {
		r(tx - 13, ty - 56, 5, 10, c.esc);
		luva(tx - 2, ty - 62);
		r(tx + 10, ty - 56, 5, 8, c.gi);
		r(tx + 13, ty - 62, 5, 8, c.gi);
		luva(tx + 13, ty - 70);
	}
	// pescoço e cabeça (foto pixelada, sempre em pé)
	const hx = tx + (pose === "dor" ? -3 : 0);
	r(hx - 3, ty - 61, 7, 3, PELE);
	const cx = Math.round(o > 0 ? x + hx - 12 : x - hx - 12);
	const cy = Math.round(y + ty - 85);
	g.fillStyle = "#0a0a12";
	g.fillRect(cx - 1, cy - 1, 26, 26);
	if (rosto) {
		g.imageSmoothingEnabled = false;
		g.drawImage(rosto, cx, cy, 24, 24);
	}
	if (branco) {
		g.fillStyle = "rgba(255,255,255,.75)";
		g.fillRect(cx, cy, 24, 24);
	}
}

export function criarPalco(canvas, { reduzido }) {
	const g = canvas.getContext("2d");
	const fundo = document.createElement("canvas");
	fundo.width = W;
	fundo.height = 180;
	const st = {
		rostos: {},
		lider: null,
		fase: "selecao",
		vencedor: null,
		poses: { 22: "guarda", 13: "guarda" },
		golpe: null,
		particulas: [],
		r: rng(42),
	};

	function cenario() {
		const gf = fundo.getContext("2d");
		gf.clearRect(0, 0, W, 180);
		cenarioBrasilia(gf);
		desenhar(performance.now());
	}

	function aura(n, x, y, t) {
		const pulso = reduzido ? 0.35 : 0.25 + 0.15 * Math.sin(t / 160);
		g.fillStyle = CORES[n].gi;
		for (let k = 3; k >= 1; k--) {
			g.globalAlpha = pulso / k;
			g.fillRect(Math.round(x - 22 - k * 3), Math.round(y - 88 - k * 3), 44 + k * 6, 88 + k * 3);
		}
		g.globalAlpha = 1;
	}

	function desenhar(t) {
		g.drawImage(fundo, 0, 0);
		const gp = st.golpe;
		const fim = st.fase === "fim";
		for (const n of [22, 13]) {
			let x = BASE_X[n];
			let pose = fim ? (n === st.vencedor ? "vitoria" : "ajoelhado") : st.poses[n];
			let branco = false;
			const bob = reduzido || fim ? 0 : Math.round(Math.sin(t / 220 + (n === 22 ? 0 : 1.7)));
			if (gp && !reduzido) {
				const e = t - gp.t0;
				if (n === gp.atacante) {
					const ida = Math.min(1, e / 160);
					const volta = e > 260 ? Math.min(1, (e - 260) / 300) : 0;
					const desloc = gp.alcance * (ida - volta) * OLHA[n];
					pose = e < 420 ? "soco" : "guarda";
					// rastro de movimento: cópias translúcidas atrás do golpe
					if (e < 300) for (let k = 3; k >= 1; k--) {
						g.globalAlpha = 0.12 * k;
						lutador(g, n, x + desloc - OLHA[n] * k * 7, CHAO + bob, "soco", st.rostos[n]);
					}
					g.globalAlpha = 1;
					x += desloc;
				} else {
					const kb = e > 160 ? gp.recuo * Math.max(0, 1 - (e - 160) / 420) : 0;
					x -= kb * OLHA[n];
					if (e > 160 && e < 620) pose = "dor";
					branco = e > 160 && e < 240;
				}
				if (e > 900) st.golpe = null;
			}
			if (st.lider === n && st.fase !== "selecao") aura(n, x, CHAO + bob, t);
			lutador(g, n, x, CHAO + bob, pose, st.rostos[n], { branco });
		}
		// faíscas de impacto
		st.particulas = st.particulas.filter((p) => p.vida > 0);
		for (const p of st.particulas) {
			p.x += p.vx;
			p.y += p.vy;
			p.vy += 0.15;
			p.vida--;
			g.fillStyle = p.cor;
			g.fillRect(Math.round(p.x), Math.round(p.y), p.t, p.t);
		}
		if (gp && !reduzido) {
			const e = t - gp.t0;
			if (e > 160 && e < 300) estrela(gp.cx, gp.cy, 6 + 10 * gp.int);
		}
	}

	function estrela(x, y, raio) {
		g.fillStyle = "#fff6c2";
		g.fillRect(Math.round(x - raio), Math.round(y - 1), Math.round(raio * 2), 3);
		g.fillRect(Math.round(x - 1), Math.round(y - raio), 3, Math.round(raio * 2));
		g.fillStyle = "#ffd23f";
		const d = Math.round(raio * 0.6);
		for (let k = -d; k <= d; k++) {
			g.fillRect(Math.round(x + k), Math.round(y + k), 2, 2);
			g.fillRect(Math.round(x + k), Math.round(y - k), 2, 2);
		}
	}

	let rodando = false;
	function laco(t) {
		desenhar(t);
		requestAnimationFrame(laco);
	}

	return {
		cenario,
		rostos(r) {
			st.rostos = r;
			desenhar(performance.now());
		},
		estado({ lider, fase, vencedor }) {
			Object.assign(st, { lider, fase, vencedor });
			if (fase !== "luta") st.poses = { 22: "guarda", 13: "guarda" };
			if (!rodando && !reduzido) {
				rodando = true;
				requestAnimationFrame(laco);
			}
			desenhar(performance.now());
		},
		/** Golpe de quem ganhou p.p. na atualização; intensidade em [0,1]. */
		golpe(atacante, int) {
			const alvo = atacante === 22 ? 13 : 22;
			if (reduzido) {
				// estado estático: quem ganhou fica em "soco", quem perdeu em "dor", até a próxima leitura
				st.poses = { [atacante]: "soco", [alvo]: "dor" };
				desenhar(performance.now());
				return;
			}
			const alcance = 34 + 24 * int;
			const cx = BASE_X[atacante] + OLHA[atacante] * (alcance + 38);
			const cy = CHAO - 54;
			st.golpe = { atacante, int, t0: performance.now(), alcance, recuo: 6 + 16 * int, cx, cy };
			st.poses = { 22: "guarda", 13: "guarda" };
			const qtd = 6 + Math.round(24 * int);
			for (let i = 0; i < qtd; i++) {
				const a = st.r() * Math.PI * 2;
				const v = 1 + st.r() * (2 + 3 * int);
				st.particulas.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, vida: 14 + Math.floor(st.r() * 14), t: st.r() > 0.6 ? 2 : 1, cor: st.r() > 0.5 ? "#ffd23f" : "#ffffff" });
			}
			// as faíscas nascem no contato
			const nascem = st.particulas.splice(-qtd);
			setTimeout(() => st.particulas.push(...nascem), 160);
		},
	};
}
