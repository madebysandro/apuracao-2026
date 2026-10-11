/**
 * PROTOTYPE — variante ?variant=v2: palco 2.5D em three.js (vendorizado em js/vendor, r185, MIT) com os
 * recortes das imagens de IA do Sandro em planos. Toda textura de IA passa por assar(), que desenha o selo
 * "Imagem gerada por IA · sátira" no próprio canvas da textura: o selo não existe separado do quadro.
 * Golpes, tempos e K.O. são os mesmos para os dois; o K.O. sai do quadro "golpeado" (o K.O. no chão da
 * folha de Lula tem o rosto errado e, por isonomia, nenhum dos dois é usado).
 * Movimento reduzido: sem laço de animação; só troca de pose estática e um quadro desenhado por mudança.
 */
import * as THREE from "./vendor/three.module.min.js";
import { manifesto, OLHA, QUER, SELO } from "./ia.js";
import { efeito } from "./som.js";

const PX = 2.4 / 390; // unidades do mundo por px de quadro (a guarda tem 390 px)
const CASA = 1.55; // distância de cada lutador ao centro
const LADO = { 22: -1, 13: 1 }; // 22 à esquerda, 13 à direita
const G = 14; // gravidade
const FOV = 30;
const BLOQUEIO = 0.2; // intensidade abaixo da qual o golpe é bloqueado (variação pequena de p.p.)
const sonda = (window.__v2 = { webgl: false, selosAssados: 0, texturas: [], tremidas: 0, zooms: 0, flashes: 0, lentos: 0, faiscas: 0, quadros: 0 });

const carregar = (src) =>
	new Promise((ok, erro) => {
		const i = new Image();
		i.onload = () => ok(i);
		i.onerror = () => erro(new Error(`não carregou ${src}`));
		i.src = src;
	});

/** Desenha o quadro num canvas e o selo por cima (faixa sob os pés, ou no canto do fundo) e vira textura. */
function assar(img, nome, { espelhar = false, faixa = true } = {}) {
	const fs = Math.max(13, Math.round(img.height * (faixa ? 0.046 : 0.012)));
	const fonte = `600 ${fs}px system-ui, sans-serif`;
	const c = document.createElement("canvas");
	const g = c.getContext("2d");
	g.font = fonte;
	const tw = Math.ceil(g.measureText(SELO).width) + fs;
	const fx = faixa ? Math.round(fs * 1.9) : 0;
	c.width = Math.max(img.width, tw);
	c.height = img.height + fx;
	g.save();
	if (espelhar) {
		g.translate(c.width, 0);
		g.scale(-1, 1);
	}
	g.drawImage(img, (c.width - img.width) / 2, 0);
	g.restore();
	// fundo: canto de cima à direita, que fica dentro da vista em qualquer proporção (o fundo encosta no topo)
	const bx = faixa ? (c.width - tw) / 2 : Math.round(c.width * 0.9 - tw);
	const by = faixa ? img.height + fs * 0.2 : Math.round(c.height * 0.035);
	g.fillStyle = "rgba(0, 0, 0, .8)";
	g.fillRect(bx, by, tw, fs * 1.5);
	g.font = fonte; // mudar o tamanho do canvas zera o contexto
	g.fillStyle = "#fff";
	g.textBaseline = "middle";
	g.fillText(SELO, bx + fs / 2, by + fs * 0.78);
	const tex = new THREE.CanvasTexture(c);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.userData.selo = SELO;
	sonda.selosAssados++;
	sonda.texturas.push(nome);
	return { tex, w: c.width, h: c.height, faixa: fx };
}

// textura procedural (não é imagem de IA): ponto suave para faíscas, poeira e sombras
function pontoSuave() {
	const c = document.createElement("canvas");
	c.width = c.height = 64;
	const g = c.getContext("2d");
	const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
	r.addColorStop(0, "rgba(255,255,255,1)");
	r.addColorStop(0.35, "rgba(255,255,255,.6)");
	r.addColorStop(1, "rgba(255,255,255,0)");
	g.fillStyle = r;
	g.fillRect(0, 0, 64, 64);
	return new THREE.CanvasTexture(c);
}

function semWebGL(wrap, motivo) {
	const p = document.createElement("p");
	p.className = "v2-sem-webgl";
	p.setAttribute("role", "status");
	p.textContent = "Este navegador não conseguiu abrir o WebGL, então a luta em 3D não aparece. O placar, o cronômetro e os lances continuam funcionando.";
	wrap.prepend(p);
	sonda.erro = String(motivo);
	const nada = () => {};
	return { estado: nada, golpe: nada, ko: nada };
}

export async function criarPalcoV2(wrap, { reduzido }) {
	let renderer;
	try {
		const teste = document.createElement("canvas");
		if (!(teste.getContext("webgl2") || teste.getContext("webgl"))) throw new Error("sem contexto WebGL");
		renderer = new THREE.WebGLRenderer({ antialias: true });
	} catch (e) {
		return semWebGL(wrap, e?.message ?? e);
	}
	sonda.webgl = true;
	renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
	renderer.domElement.className = "v2-canvas";
	renderer.domElement.setAttribute("aria-hidden", "true");
	wrap.prepend(renderer.domElement);
	const selo = document.createElement("small");
	selo.className = "ia-selo v2-selo";
	selo.textContent = SELO;
	wrap.append(selo);

	const cena = new THREE.Scene();
	cena.background = new THREE.Color("#2a2320");
	const cam = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.1, 100);
	const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
	const ponto = pontoSuave();

	// ---- texturas (todas com selo assado) ----
	const fontes = { fundo: manifesto.fundo.arquivo };
	for (const n of [22, 13]) for (const [pose, p] of Object.entries(manifesto.poses[n])) fontes[`${n}-${pose}`] = p.arquivo;
	const imgs = Object.fromEntries(await Promise.all(Object.entries(fontes).map(async ([k, src]) => [k, await carregar(src)])));

	// ---- fundo (camada distante): recorte da praça ----
	const fundo = assar(imgs.fundo, "fundo", { faixa: false });
	const placa = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: fundo.tex, depthTest: false }));
	placa.position.z = -14;
	placa.renderOrder = 0;
	cena.add(placa);

	// ---- lutadores: plano com a pose, sombra no chão, rastro de 3 "fantasmas" ----
	const plano = new THREE.PlaneGeometry(1, 1);
	const sombraMat = (cor, op, blend = THREE.NormalBlending) => new THREE.MeshBasicMaterial({ map: ponto, color: cor, transparent: true, opacity: op, depthTest: false, blending: blend });
	const lut = {};
	for (const n of [22, 13]) {
		const tex = {};
		for (const pose of Object.keys(manifesto.poses[n])) tex[pose] = assar(imgs[`${n}-${pose}`], `${n}-${pose}`, { espelhar: Boolean(OLHA[pose]) && OLHA[pose] !== QUER[n] });
		const grupo = new THREE.Group();
		const mesh = new THREE.Mesh(plano, new THREE.MeshBasicMaterial({ transparent: true, depthTest: false }));
		mesh.renderOrder = 5;
		grupo.add(mesh);
		const sombra = new THREE.Mesh(plano, sombraMat("#000", 0.55));
		sombra.renderOrder = 2;
		const aura = new THREE.Mesh(plano, sombraMat("#ffd23f", 0.0, THREE.AdditiveBlending));
		aura.renderOrder = 3;
		const fantasmas = [0.34, 0.22, 0.12].map((op) => {
			const f = new THREE.Mesh(plano, new THREE.MeshBasicMaterial({ transparent: true, opacity: op, depthTest: false, color: "#ffe9a8" }));
			f.renderOrder = 4;
			f.visible = false;
			cena.add(f);
			return f;
		});
		cena.add(sombra, aura, grupo);
		lut[n] = { n, tex, grupo, mesh, sombra, aura, fantasmas, pose: "", x: 0, vx: 0, y: 0, vy: 0, rot: 0, w: 0, mola: true, caido: false, ataque: null, hist: [] };
	}
	const outro = (n) => (n === 22 ? 13 : 22);

	function pose(L, nome) {
		const t = L.tex[nome];
		L.pose = nome;
		for (const m of [L.mesh, ...L.fantasmas]) {
			m.material.map = t.tex;
			m.material.needsUpdate = true;
		}
		L.dim = { w: t.w * PX, h: t.h * PX, y: (t.h / 2 - t.faixa) * PX };
		L.mesh.scale.set(L.dim.w, L.dim.h, 1);
		L.mesh.position.y = L.dim.y;
	}

	// ---- partículas: faíscas e poeira (pool fixo) + duas camadas de poeira no ar (paralaxe) ----
	const N = 420;
	const pos = new Float32Array(N * 3).fill(-99);
	const cor = new Float32Array(N * 3);
	const vel = new Float32Array(N * 3);
	const vida = new Float32Array(N);
	const vidaMax = new Float32Array(N).fill(1);
	const base = new Float32Array(N * 3);
	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
	geo.setAttribute("color", new THREE.BufferAttribute(cor, 3));
	const faiscas = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.13, map: ponto, vertexColors: true, transparent: true, depthTest: false, blending: THREE.AdditiveBlending }));
	faiscas.renderOrder = 8;
	faiscas.frustumCulled = false;
	cena.add(faiscas);
	let livre = 0;
	function soltar(x, y, qtd, { dir = 0, cores = [[1, 1, 0.85], [1, 0.8, 0.3], [1, 0.45, 0.15]], veloc = 6, gravidade = 1 } = {}) {
		for (let k = 0; k < qtd; k++) {
			const i = livre;
			livre = (livre + 1) % N;
			const a = Math.random() * Math.PI * 2;
			const v = veloc * (0.3 + Math.random());
			pos.set([x, y, (Math.random() - 0.5) * 0.4], i * 3);
			vel.set([Math.cos(a) * v + dir * veloc * 0.6, Math.sin(a) * v * 0.8 + veloc * 0.25 * gravidade, (Math.random() - 0.5) * v * 0.5], i * 3);
			base.set(cores[k % cores.length], i * 3);
			vida[i] = vidaMax[i] = 0.35 + Math.random() * 0.5;
			vel[i * 3 + 1] *= gravidade;
		}
		sonda.faiscas += qtd;
	}
	const camadas = [];
	if (!reduzido)
		for (const [qtd, z, tam, op] of [[70, -6, 0.07, 0.35], [26, 2.6, 0.06, 0.5]]) {
			const p = new Float32Array(qtd * 3);
			for (let i = 0; i < qtd; i++) p.set([(Math.random() - 0.5) * 16, Math.random() * 5 - 0.3, z + (Math.random() - 0.5)], i * 3);
			const g = new THREE.BufferGeometry();
			g.setAttribute("position", new THREE.BufferAttribute(p, 3));
			const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: tam, map: ponto, color: "#ffe2b0", transparent: true, opacity: op, depthTest: false, blending: THREE.AdditiveBlending }));
			pts.renderOrder = z > 0 ? 9 : 1;
			pts.frustumCulled = false;
			cena.add(pts);
			camadas.push(pts);
		}

	// ---- câmera: enquadra os dois (ou o K.O. inteiro); tremor, zoom e câmera lenta só no modo completo ----
	const C = { largura: 3.4, alvoLargura: 3.4, tremor: 0, zoom: 0, foco: 0, lentoAte: 0, escala: 1, aspecto: 16 / 9 };
	function enquadrar() {
		const d = Math.max(C.largura / (tan * C.aspecto), 1.62 / tan);
		cam.position.z = d;
		// fundo cobre a vista na sua profundidade (com folga para tremor e paralaxe), topo logo acima da tela
		const dist = d - placa.position.z;
		const ar = fundo.w / fundo.h;
		let h = Math.max((2 * dist * tan * C.aspecto * 1.08) / ar, 2 * dist * tan * 1.04);
		placa.scale.set(h * ar, h, 1);
		placa.position.y = 1.2 + dist * tan + 0.25 - h / 2;
	}
	function redimensionar() {
		const { width, height } = wrap.getBoundingClientRect();
		if (!width || !height) return;
		renderer.setSize(width, height, false);
		C.aspecto = width / height;
		cam.aspect = C.aspecto;
		enquadrar();
		cam.updateProjectionMatrix();
		if (reduzido) desenhar();
	}
	new ResizeObserver(redimensionar).observe(wrap);

	// ---- relógio de jogo (escalado pela câmera lenta) e agenda de eventos ----
	let tJogo = 0;
	let agenda = [];
	const depois = (dt, fn) => agenda.push({ t: tJogo + dt, fn });
	const flash = () => {
		wrap.classList.remove("clarao");
		void wrap.offsetWidth;
		wrap.classList.add("clarao");
		sonda.flashes++;
	};
	const sacode = (forca) => {
		C.tremor = Math.max(C.tremor, forca);
		sonda.tremidas++;
	};
	const aproxima = (z, x) => {
		C.zoom = Math.max(C.zoom, z);
		C.foco = x;
		sonda.zooms++;
	};
	const lento = (seg) => {
		C.lentoAte = performance.now() + seg * 1000;
		sonda.lentos++;
	};

	function zerar() {
		agenda = [];
		C.alvoLargura = 3.4;
		if (reduzido) {
			C.largura = 3.4;
			enquadrar();
			cam.updateProjectionMatrix();
		}
		for (const n of [22, 13]) {
			Object.assign(lut[n], { x: 0, vx: 0, y: 0, vy: 0, rot: 0, w: 0, mola: true, caido: false, ataque: null, hist: [] });
			pose(lut[n], "guarda");
		}
		vida.fill(0);
		pos.fill(-99);
	}

	function contato(at, int, { virada, ko }) {
		const A = lut[at];
		const B = lut[outro(at)];
		const dir = -LADO[at]; // atacante avança na direção do adversário
		const bloqueio = !ko && int < BLOQUEIO;
		const bx = LADO[B.n] * CASA + B.x;
		const altura = B.dim.h * 0.62;
		if (bloqueio) {
			B.vx = dir * 1.1;
			soltar(bx - dir * 0.3, altura, 14, { dir: -dir, veloc: 3, cores: [[0.75, 0.9, 1], [1, 1, 1]] });
			efeito("bloqueio");
		} else {
			pose(B, "golpeado");
			B.mola = false;
			B.vx = dir * (ko ? 1.7 : 1.2 + 2.3 * int);
			B.vy = ko ? 4.2 : 0.6 + 2 * int;
			soltar(bx - dir * 0.25, altura, ko ? 150 : Math.round(24 + 90 * int), { dir, veloc: 4 + 5 * int });
			efeito("impacto", ko ? 1 : int);
		}
		sacode(ko ? 0.5 : 0.04 + 0.22 * int);
		aproxima(ko ? 0.32 : 0.04 + 0.16 * int, bx - dir * 0.5);
		if (virada || ko) {
			lento(ko ? 0.85 : 0.6);
			flash();
		}
		if (ko) {
			B.caiu = false;
			B.w = (-LADO[B.n] * THREE.MathUtils.degToRad(80)) / ((2 * B.vy) / G); // gira até deitar ao tocar o chão
			B.caido = true;
			depois(0.9, () => pose(A, "vitoria"));
			C.alvoLargura = 5;
		} else
			depois(0.55, () => {
				pose(B, "guarda");
				B.mola = true;
			});
	}

	function atacar(at, int, extra) {
		agenda = [];
		for (const n of [22, 13]) Object.assign(lut[n], { ataque: null, mola: true });
		const A = lut[at];
		A.ataque = { t: 0, int, extra, tocou: false, dir: -LADO[at] };
		depois(0.08, () => pose(A, "chute"));
		efeito("chute", int);
	}

	// ---- laço (só no modo completo) ----
	function passo(L, dt) {
		const a = L.ataque;
		if (a) {
			a.t += dt;
			const recuo = -a.dir * 0.18;
			const alcance = a.dir * (0.35 + 0.6 * a.int);
			if (a.t < 0.08) L.x = recuo * (a.t / 0.08);
			else if (a.t < 0.19) L.x = recuo + (alcance - recuo) * (1 - (1 - (a.t - 0.08) / 0.11) ** 3);
			else {
				L.x = alcance;
				if (!a.tocou) {
					a.tocou = true;
					contato(L.n, a.int, a.extra);
				}
				if (a.t > 0.55) {
					L.ataque = null;
					L.mola = true;
					if (L.pose === "chute") pose(L, "guarda");
				}
			}
			L.vx = 0;
		} else {
			if (L.mola) L.vx += (-L.x * 38 - L.vx * 9) * dt;
			else L.vx *= Math.exp(-(L.y > 0 ? 3 : 10) * dt);
			L.x += L.vx * dt;
		}
		L.vy -= G * dt;
		L.y += L.vy * dt;
		if (L.caido) L.rot += L.w * dt;
		if (L.y <= 0) {
			if (L.caido && !L.caiu && L.vy < -1) {
				L.caiu = true;
				L.rot = -LADO[L.n] * THREE.MathUtils.degToRad(80);
				L.w = 0;
				soltar(LADO[L.n] * CASA + L.x + LADO[L.n] * 0.9, 0.1, 60, { veloc: 2.5, gravidade: 0.4, cores: [[0.55, 0.45, 0.32], [0.4, 0.33, 0.24]] });
				sacode(0.35);
				efeito("baque", 1);
			}
			L.y = 0;
			L.vy = 0;
		}
	}

	function posicionar(L, t) {
		const respira = reduzido || L.caido ? 0 : Math.sin(t * 2.3);
		const balanco = reduzido || L.caido ? 0 : Math.sin(t * 1.4);
		const x = LADO[L.n] * (CASA + 0.035 * balanco) + L.x;
		L.grupo.position.set(x, L.y, 0);
		L.grupo.rotation.z = L.rot + (L.caido ? 0 : LADO[L.n] * 0.012 * balanco);
		L.mesh.scale.set(L.dim.w * (1 - 0.006 * respira), L.dim.h * (1 + 0.014 * respira), 1);
		L.mesh.position.y = L.dim.y * (1 + 0.014 * respira);
		const largura = L.caido ? L.dim.h : L.dim.w * 0.8;
		for (const [m, k] of [[L.sombra, 1], [L.aura, 1.25]]) {
			m.scale.set(largura * k, 0.32 * k, 1);
			m.position.set(x + (L.caido ? LADO[L.n] * L.dim.h * 0.4 : 0), 0, -0.05);
		}
		L.hist.unshift([x, L.y]);
		L.hist.length = 12;
		L.fantasmas.forEach((f, k) => {
			const h = L.hist[(k + 1) * 3];
			f.visible = Boolean(L.ataque && L.ataque.t < 0.4 && h);
			if (!f.visible) return;
			f.position.set(h[0], h[1] + L.mesh.position.y, -0.02);
			f.scale.copy(L.mesh.scale);
		});
	}

	let lider = null;
	function desenhar(t = 0) {
		for (const n of [22, 13]) {
			const L = lut[n];
			posicionar(L, t);
			L.aura.material.opacity = lider === n ? (reduzido ? 0.55 : 0.45 + 0.15 * Math.sin(t * 4)) : 0;
		}
		renderer.render(cena, cam);
		sonda.quadros++;
	}

	let antes = performance.now();
	function laco(agora) {
		const real = Math.min(0.05, (agora - antes) / 1000);
		antes = agora;
		C.escala += ((agora < C.lentoAte ? 0.22 : 1) - C.escala) * Math.min(1, real * 12);
		const dt = real * C.escala;
		tJogo += dt;
		for (const e of agenda.filter((e) => e.t <= tJogo)) {
			agenda.splice(agenda.indexOf(e), 1);
			e.fn();
		}
		for (const n of [22, 13]) passo(lut[n], dt);
		// faíscas
		for (let i = 0; i < N; i++) {
			if (vida[i] <= 0) continue;
			vida[i] -= dt;
			const j = i * 3;
			vel[j + 1] -= 9 * dt;
			for (let e = 0; e < 3; e++) {
				pos[j + e] += vel[j + e] * dt;
				vel[j + e] *= Math.exp(-1.5 * dt);
			}
			const f = Math.max(0, vida[i] / vidaMax[i]);
			for (let e = 0; e < 3; e++) cor[j + e] = base[j + e] * f;
			if (vida[i] <= 0) pos[j + 1] = -99;
		}
		geo.attributes.position.needsUpdate = true;
		geo.attributes.color.needsUpdate = true;
		camadas.forEach((c, k) => (c.position.x = Math.sin(tJogo * (0.12 + k * 0.05)) * (0.6 + k)));
		// câmera: deriva lenta (paralaxe), tremor e zoom decaem em tempo real (continuam na câmera lenta)
		C.tremor *= Math.exp(-7 * real);
		C.zoom *= Math.exp(-3.5 * real);
		C.largura += (C.alvoLargura - C.largura) * Math.min(1, real * 2);
		enquadrar();
		// o zoom puxa a câmera para o ponto do impacto
		cam.position.x = 0.22 * Math.sin(tJogo * 0.3) + C.foco * Math.min(1, C.zoom * 3) * 0.6 + (Math.random() - 0.5) * C.tremor;
		cam.position.y = 1.2 + 0.05 * Math.sin(tJogo * 0.45) + (Math.random() - 0.5) * C.tremor * 0.6;
		cam.zoom = 1 + C.zoom;
		cam.updateProjectionMatrix();
		desenhar(tJogo);
		requestAnimationFrame(laco);
	}

	cam.position.set(0, 1.2, 10);
	zerar();
	redimensionar();
	if (!reduzido) requestAnimationFrame(laco);

	// gancho do smoke: confere texturas sem selo e amostra pixels do quadro
	sonda.auditar = () => {
		const mapas = new Set();
		cena.traverse((o) => o.material?.map && mapas.add(o.material.map));
		for (const L of Object.values(lut)) for (const t of Object.values(L.tex)) mapas.add(t.tex);
		const deIA = [...mapas].filter((m) => m !== ponto);
		return { texturas: deIA.length, semSelo: deIA.filter((m) => m.userData.selo !== SELO).length };
	};
	sonda.amostra = () => {
		renderer.render(cena, cam);
		const gl = renderer.getContext();
		const w = gl.drawingBufferWidth;
		const h = gl.drawingBufferHeight;
		const px = new Uint8Array(w * h * 4);
		gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
		let s = 0;
		let s2 = 0;
		let n = 0;
		for (let i = 0; i < px.length; i += 4 * 97) {
			const l = (px[i] + px[i + 1] + px[i + 2]) / 3;
			s += l;
			s2 += l * l;
			n++;
		}
		return { w, h, media: s / n, desvio: Math.sqrt(s2 / n - (s / n) ** 2) };
	};
	sonda.camera = () => ({ zoom: cam.zoom, x: cam.position.x });

	return {
		estado({ lider: l, fase }) {
			if (fase === "fim") return; // o K.O. já montou o quadro final
			lider = fase === "selecao" ? null : l;
			if (fase === "selecao" || reduzido) zerar();
			if (reduzido) desenhar();
		},
		golpe(atacante, int, { virada = false } = {}) {
			if (reduzido) {
				pose(lut[atacante], "chute");
				if (int >= BLOQUEIO) pose(lut[outro(atacante)], "golpeado");
				return desenhar();
			}
			atacar(atacante, int, { virada, ko: false });
		},
		ko(vencedor) {
			const P = lut[outro(vencedor)];
			if (reduzido) {
				zerar();
				pose(P, "golpeado");
				P.caido = true;
				P.rot = -LADO[P.n] * THREE.MathUtils.degToRad(80);
				pose(lut[vencedor], "vitoria");
				C.largura = 5;
				enquadrar();
				cam.updateProjectionMatrix();
				return desenhar();
			}
			atacar(vencedor, 1, { virada: false, ko: true });
		},
	};
}
