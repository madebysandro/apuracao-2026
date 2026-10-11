/**
 * PROTOTYPE — som 100% sintetizado (Web Audio + speechSynthesis). Nenhum arquivo de áudio.
 * Desligado por padrão: o AudioContext só nasce/retoma dentro do clique no botão de som.
 * A trilha é uma composição original (Lá menor, i–VI–VII–V, 132 bpm), escrita para este protótipo.
 */
let ctx = null;
let mestre = null;
let ligado = false;
let relogio = null;
let passo = 0;
let proxima = 0;

export const somLigado = () => ligado;

export function alternarSom() {
	ligado = !ligado;
	if (ligado) {
		if (!ctx) {
			ctx = new AudioContext();
			mestre = ctx.createGain();
			mestre.gain.value = 0.5;
			mestre.connect(ctx.destination);
		}
		ctx.resume();
		iniciarTrilha();
	} else {
		clearInterval(relogio);
		relogio = null;
		ctx?.suspend();
		if ("speechSynthesis" in window) speechSynthesis.cancel();
	}
	return ligado;
}

const hz = (semitom) => 220 * 2 ** (semitom / 12); // 0 = Lá 3

function tom(f, t0, dur, { tipo = "square", vol = 0.12, fFim = null } = {}) {
	const o = ctx.createOscillator();
	const g = ctx.createGain();
	o.type = tipo;
	o.frequency.setValueAtTime(f, t0);
	if (fFim) o.frequency.exponentialRampToValueAtTime(fFim, t0 + dur);
	g.gain.setValueAtTime(vol, t0);
	g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
	o.connect(g).connect(mestre);
	o.start(t0);
	o.stop(t0 + dur + 0.02);
}

let bufRuido = null;
function ruido(t0, dur, vol = 0.2, corte = 3000) {
	if (!bufRuido) {
		bufRuido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
		const d = bufRuido.getChannelData(0);
		let x = 1;
		// ruído determinístico (LCG), sem Math.random
		for (let i = 0; i < d.length; i++) d[i] = ((x = (x * 1103515245 + 12345) % 2147483648) / 1073741824) - 1;
	}
	const s = ctx.createBufferSource();
	s.buffer = bufRuido;
	const filtro = ctx.createBiquadFilter();
	filtro.type = "lowpass";
	filtro.frequency.value = corte;
	const g = ctx.createGain();
	g.gain.setValueAtTime(vol, t0);
	g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
	s.connect(filtro).connect(g).connect(mestre);
	s.start(t0);
	s.stop(t0 + dur + 0.02);
}

/* Trilha: 4 compassos × 16 semicolcheias. null = pausa. Melodia e baixo originais. */
const ACORDES = [0, -4, -2, -5]; // Lá m, Fá, Sol, Mi (graus, em semitons a partir de Lá)
const MELODIA = [
	[12, null, 15, null, 19, 17, 15, null, 12, null, 10, 12, null, null, 7, null],
	[8, null, 12, null, 15, null, 13, 12, 8, null, 7, null, 8, 10, null, null],
	[10, null, 14, null, 17, null, 15, 14, 10, null, 14, 15, 17, null, 19, null],
	[16, null, 14, null, 11, null, 8, null, 11, 14, 16, null, 14, null, 11, null],
];
const BPM = 132;
const SEMI = 60 / BPM / 4;

function agendar(t, i) {
	const c = Math.floor(i / 16) % 4;
	const s = i % 16;
	const raiz = ACORDES[c];
	if (s % 2 === 0) tom(hz(raiz - 24 + (s % 8 === 4 ? 12 : 0)), t, SEMI * 1.8, { tipo: "triangle", vol: 0.16 });
	const m = MELODIA[c][s];
	if (m != null) tom(hz(m), t, SEMI * 1.6, { tipo: "square", vol: 0.05 });
	if (s % 4 === 2) ruido(t, 0.04, 0.05, 8000);
	if (s % 8 === 4) ruido(t, 0.12, 0.12, 1800);
}

function iniciarTrilha() {
	if (relogio) return;
	proxima = ctx.currentTime + 0.1;
	relogio = setInterval(() => {
		while (proxima < ctx.currentTime + 0.15) {
			agendar(proxima, passo++);
			proxima += SEMI;
		}
	}, 30);
}

/** Efeitos. intensidade em [0,1] escala volume/duração do golpe. */
export function efeito(nome, intensidade = 0.5) {
	if (!ligado || !ctx) return;
	const t = ctx.currentTime + 0.01;
	if (nome === "golpe") {
		ruido(t, 0.08 + 0.2 * intensidade, 0.2 + 0.4 * intensidade, 1200 + 2500 * intensidade);
		tom(160 + 80 * intensidade, t, 0.12 + 0.15 * intensidade, { tipo: "square", vol: 0.2, fFim: 50 });
	} else if (nome === "virada") {
		[0, 4, 7, 12, 16, 19, 24].forEach((s, k) => tom(hz(s + 12), t + k * 0.05, 0.12, { vol: 0.09 }));
		ruido(t, 0.4, 0.25, 5000);
	} else if (nome === "perfect") {
		[12, 19, 24].forEach((s, k) => tom(hz(s + 12), t + k * 0.09, 0.3, { tipo: "triangle", vol: 0.15 }));
	} else if (nome === "ko") {
		tom(440, t, 0.9, { tipo: "sawtooth", vol: 0.15, fFim: 55 });
		ruido(t, 0.6, 0.3, 900);
	} else if (nome === "inicio") {
		[0, 0, 7].forEach((s, k) => tom(hz(s + 12), t + k * 0.18, 0.14, { vol: 0.1 }));
	} else if (nome === "vitoria") {
		[0, 4, 7, 12, 7, 12].forEach((s, k) => tom(hz(s + 12), t + k * 0.13, 0.2, { tipo: "square", vol: 0.08 }));
	} else if (nome === "bip") tom(880, t, 0.05, { vol: 0.06 });
}

/** Voz do locutor: speechSynthesis (inglês, grave). Sem vozes instaladas, sobra o efeito sintetizado que toca junto. */
export function voz(texto) {
	if (!ligado) return;
	if ("speechSynthesis" in window) {
		speechSynthesis.cancel();
		const u = new SpeechSynthesisUtterance(texto);
		u.lang = "en-US";
		u.rate = 0.85;
		u.pitch = 0.4;
		speechSynthesis.speak(u);
	}
}
