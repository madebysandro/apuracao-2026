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
let modo = { robo: false, agendar: null, semi: 0 }; // v2: voz de robô e trilha própria (configurarSom)

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

/** v2: { robo: true } troca a voz do sistema pela voz sintetizada por formantes; { trilha: "v2" } troca a música. */
export function configurarSom({ robo = false, trilha = "" } = {}) {
	modo = { robo, agendar: trilha === "v2" ? agendarV2 : agendar, semi: trilha === "v2" ? SEMI2 : SEMI };
}

// onda de pulso (chip) com ciclo de trabalho d, pela série de Fourier
const pulsos = {};
function pulso(d) {
	if (!pulsos[d]) {
		const real = new Float32Array(32);
		const imag = new Float32Array(32);
		for (let n = 1; n < 32; n++) real[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * d);
		pulsos[d] = ctx.createPeriodicWave(real, imag);
	}
	return pulsos[d];
}

function tom(f, t0, dur, { tipo = "square", vol = 0.12, fFim = null } = {}) {
	const o = ctx.createOscillator();
	const g = ctx.createGain();
	if (typeof tipo === "string") o.type = tipo;
	else o.setPeriodicWave(tipo);
	o.frequency.setValueAtTime(f, t0);
	if (fFim) o.frequency.exponentialRampToValueAtTime(fFim, t0 + dur);
	g.gain.setValueAtTime(vol, t0);
	g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
	o.connect(g).connect(mestre);
	o.start(t0);
	o.stop(t0 + dur + 0.02);
}

let bufRuido = null;
function ruido(t0, dur, vol = 0.2, corte = 3000, { filtro: tipoFiltro = "lowpass", q = 1, corteFim = null, ataque = 0 } = {}) {
	criarRuido();
	const s = ctx.createBufferSource();
	s.buffer = bufRuido;
	const filtro = ctx.createBiquadFilter();
	filtro.type = tipoFiltro;
	filtro.Q.value = q;
	filtro.frequency.setValueAtTime(corte, t0);
	if (corteFim) filtro.frequency.exponentialRampToValueAtTime(corteFim, t0 + dur);
	const g = ctx.createGain();
	g.gain.setValueAtTime(ataque ? 0.0001 : vol, t0);
	if (ataque) g.gain.exponentialRampToValueAtTime(vol, t0 + ataque);
	g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
	s.connect(filtro).connect(g).connect(mestre);
	s.start(t0);
	s.stop(t0 + dur + 0.02);
}
function criarRuido() {
	if (!bufRuido) {
		bufRuido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
		const d = bufRuido.getChannelData(0);
		let x = 1;
		// ruído determinístico (LCG), sem Math.random
		for (let i = 0; i < d.length; i++) d[i] = ((x = (x * 1103515245 + 12345) % 2147483648) / 1073741824) - 1;
	}
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

/* Trilha da v2: outra composição original, Mi menor, 150 bpm, 8 compassos (Em Em C D Em Em C B).
   Melodia em pulso 25%, arpejo em pulso 12,5%, baixo em triângulo, bumbo de seno e caixa/chimbal de ruído. */
const BPM2 = 150;
const SEMI2 = 60 / BPM2 / 4;
const V2 = {
	raiz: [-17, -17, -21, -19, -17, -17, -21, -22],
	acorde: [[7, 10, 14], [7, 10, 14], [3, 7, 10], [5, 9, 12], [7, 10, 14], [7, 10, 14], [3, 7, 10], [2, 6, 9]],
	melodia: [
		[19, null, 19, 22, null, 19, 17, null, 14, null, 17, 19, null, null, 14, null],
		[12, null, 14, null, 17, null, 19, 22, 21, null, 19, null, 17, null, null, null],
		[15, null, 19, null, 22, null, 21, 19, 15, null, null, 17, 19, null, 15, null],
		[17, null, 21, null, 24, null, 22, 21, 17, null, 21, null, 26, null, 24, null],
		[19, null, 19, 22, null, 19, 17, null, 14, null, 17, 19, null, null, 22, null],
		[24, null, 22, null, 19, null, 22, 24, 26, null, 24, null, 22, null, 19, null],
		[15, 17, 19, null, 22, null, 19, null, 27, null, 26, null, 24, null, 22, null],
		[21, null, 18, null, 14, null, 18, 21, 26, null, 21, null, 18, null, null, null],
	],
};
function agendarV2(t, i) {
	const c = Math.floor(i / 16) % 8;
	const s = i % 16;
	if (s % 2 === 0) tom(hz(V2.raiz[c] + (s % 4 === 2 ? 12 : 0)), t, SEMI2 * 1.7, { tipo: "triangle", vol: 0.17 });
	tom(hz(V2.acorde[c][s % 3] + 12), t, SEMI2 * 0.8, { tipo: pulso(0.125), vol: 0.025 });
	const m = V2.melodia[c][s];
	if (m != null) tom(hz(m), t, SEMI2 * 1.7, { tipo: pulso(0.25), vol: 0.05 });
	if (s % 8 === 0 || s === 10) tom(150, t, 0.16, { tipo: "sine", vol: 0.35, fFim: 40 });
	if (s % 8 === 4) ruido(t, 0.14, 0.13, 2600);
	if (s % 2 === 1) ruido(t, 0.03, 0.035, 7000, { filtro: "highpass" });
}

function iniciarTrilha() {
	if (relogio) return;
	proxima = ctx.currentTime + 0.1;
	relogio = setInterval(() => {
		while (proxima < ctx.currentTime + 0.15) {
			(modo.agendar ?? agendar)(proxima, passo++);
			proxima += modo.semi || SEMI;
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
	// v2: golpes de luta sintetizados (nenhum som de jogo; tudo ruído filtrado e osciladores)
	else if (nome === "chute") {
		// "whoosh": ruído em passa-banda varrendo para o agudo
		ruido(t, 0.17, 0.12 + 0.2 * intensidade, 450, { filtro: "bandpass", q: 2.5, corteFim: 2800, ataque: 0.09 });
	} else if (nome === "impacto") {
		// soco seco (estalo curto) + baque grave (seno caindo), os dois escalados pela intensidade
		ruido(t, 0.045, 0.35 + 0.35 * intensidade, 1900, { filtro: "bandpass", q: 0.9 });
		tom(230, t, 0.06, { tipo: "square", vol: 0.12, fFim: 90 });
		tom(115, t, 0.22 + 0.2 * intensidade, { tipo: "sine", vol: 0.35 + 0.45 * intensidade, fFim: 36 });
	} else if (nome === "bloqueio") {
		tom(1250, t, 0.05, { vol: 0.07 });
		tom(1870, t, 0.04, { vol: 0.05 });
		ruido(t, 0.025, 0.12, 5000, { filtro: "highpass" });
	} else if (nome === "baque") {
		tom(72, t, 0.45, { tipo: "sine", vol: 0.7, fFim: 28 });
		ruido(t, 0.3, 0.3, 320);
	}
}

/* Voz de robô da v2: síntese por formantes (fonte dente-de-serra monótona + 3 filtros passa-banda nos
   formantes de cada fonema, ruído filtrado nas consoantes) e um eco curto de arena. Fonemas em ARPAbet. */
const FORMANTES = {
	AA: [730, 1090, 2440], AH: [620, 1200, 2550], OW: [450, 800, 2400], UW: [320, 870, 2240], ER: [490, 1350, 1690],
	IY: [280, 2250, 2900], IH: [400, 1920, 2550], EH: [550, 1770, 2490], EY: [480, 2000, 2600],
	R: [420, 1300, 1600], L: [380, 1100, 2600], W: [300, 650, 2200], Y: [280, 2200, 2950], N: [280, 1600, 2500], V: [300, 1400, 2300],
};
const RUIDOS = { S: [6000, 1.5, 0.5], F: [5000, 0.8, 0.3], T: [4000, 1, 0.7], K: [1900, 1.2, 0.7], P: [900, 1, 0.5], V: [3500, 1, 0.15] };
const FALAS = {
	"round one": [["R", 90], ["AA>UW", 280], ["N", 80], ["T", 35], ["_", 70], ["W", 80], ["AH", 170], ["N", 190]],
	fight: [["F", 120], ["AA>IY", 300], ["_", 50], ["T", 60]],
	"k.o.": [["_", 20], ["K", 60], ["EY>IY", 260], ["_", 90], ["OW>UW", 380]],
	"you win": [["Y", 70], ["UW", 230], ["_", 60], ["W", 80], ["IH", 190], ["N", 230]],
	reversal: [["R", 70], ["IY", 110], ["V", 70], ["ER", 190], ["S", 120], ["AH", 100], ["L", 170]],
	perfect: [["P", 50], ["ER", 190], ["F", 110], ["EH", 150], ["K", 50], ["_", 30], ["T", 60]],
};
const BRANDOS = { N: 0.45, R: 0.7, L: 0.7, W: 0.7, Y: 0.7, V: 0.5 };

function falarRobo(texto) {
	const seq = FALAS[texto.toLowerCase().replace(/[!]/g, "").trim()];
	if (!seq) return;
	criarRuido();
	const t0 = ctx.currentTime + 0.02;
	const saida = ctx.createGain();
	saida.gain.value = 2.2;
	saida.connect(mestre);
	const eco = ctx.createDelay();
	eco.delayTime.value = 0.13;
	const volta = ctx.createGain();
	volta.gain.value = 0.3;
	saida.connect(eco).connect(volta).connect(eco);
	volta.connect(mestre);
	const vozG = ctx.createGain();
	vozG.gain.setValueAtTime(0, t0);
	const fontes = [["sawtooth", 1, 0.8], ["square", 0.5, 0.25]].map(([tipo, mult, g]) => {
		const o = ctx.createOscillator();
		o.type = tipo;
		o.frequency.setValueAtTime(96 * mult, t0);
		const gg = ctx.createGain();
		gg.gain.value = g;
		o.connect(gg).connect(vozG);
		return o;
	});
	const filtros = [6, 9, 11].map((q, k) => {
		const f = ctx.createBiquadFilter();
		f.type = "bandpass";
		f.Q.value = q;
		f.frequency.setValueAtTime(FORMANTES.AH[k], t0);
		const g = ctx.createGain();
		g.gain.value = [1, 0.7, 0.35][k];
		vozG.connect(f).connect(g).connect(saida);
		return f;
	});
	const nz = ctx.createBufferSource();
	nz.buffer = bufRuido;
	nz.loop = true;
	const nf = ctx.createBiquadFilter();
	nf.type = "bandpass";
	const ng = ctx.createGain();
	ng.gain.setValueAtTime(0, t0);
	nz.connect(nf).connect(ng).connect(saida);
	let t = t0;
	for (const [fon, ms] of seq) {
		const d = ms / 1000;
		const [de, para] = fon.split(">");
		const vogal = FORMANTES[de];
		const consoante = RUIDOS[de];
		vozG.gain.linearRampToValueAtTime(vogal ? (BRANDOS[de] ?? 1) : 0, t + 0.015);
		vozG.gain.setValueAtTime(vogal ? (BRANDOS[de] ?? 1) : 0, t + d - 0.015);
		if (vogal)
			filtros.forEach((f, k) => {
				f.frequency.linearRampToValueAtTime(vogal[k], t + 0.03);
				f.frequency.linearRampToValueAtTime((FORMANTES[para] ?? vogal)[k], t + d);
			});
		ng.gain.linearRampToValueAtTime(consoante ? consoante[2] : 0, t + 0.008);
		ng.gain.setValueAtTime(consoante ? consoante[2] : 0, t + d - 0.01);
		if (consoante) {
			nf.frequency.setValueAtTime(consoante[0], t);
			nf.Q.setValueAtTime(consoante[1], t);
		}
		t += d;
	}
	vozG.gain.linearRampToValueAtTime(0, t + 0.03);
	ng.gain.linearRampToValueAtTime(0, t + 0.03);
	fontes[0].frequency.linearRampToValueAtTime(82, t);
	for (const o of [...fontes, nz]) {
		o.start(t0);
		o.stop(t + 0.1);
	}
}

/** Voz do locutor: speechSynthesis (inglês, grave). Sem vozes instaladas, sobra o efeito sintetizado que toca junto. */
export function voz(texto) {
	if (!ligado) return;
	if (modo.robo) return falarRobo(texto);
	if ("speechSynthesis" in window) {
		speechSynthesis.cancel();
		const u = new SpeechSynthesisUtterance(texto);
		u.lang = "en-US";
		u.rate = 0.85;
		u.pitch = 0.4;
		speechSynthesis.speak(u);
	}
}
