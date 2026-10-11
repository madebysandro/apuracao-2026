/**
 * PROTOTYPE — gerador de DADOS DE EXEMPLO do 2º turno (nada aqui é do TSE).
 * Parte do 1º turno real (dados/estado-1t.json) e simula uma noite de apuração:
 * cada UF apura numa velocidade (Sul/Sudeste/CO primeiro, Norte/Nordeste depois,
 * exterior por último), o que produz a virada típica. Tudo determinístico.
 * O formato de saída imita GET /api/apuracao + /api/historico de produção.
 */

export const REGIOES = {
	Norte: ["ac", "am", "ap", "pa", "ro", "rr", "to"],
	Nordeste: ["al", "ba", "ce", "ma", "pb", "pe", "pi", "rn", "se"],
	"Centro-Oeste": ["df", "go", "ms", "mt"],
	Sudeste: ["es", "mg", "rj", "sp"],
	Sul: ["pr", "rs", "sc"],
};
const regiaoDe = Object.fromEntries(
	Object.entries(REGIOES).flatMap(([r, ufs]) => ufs.map((u) => [u, r])),
);

// Do arquivo oficial publicado (6258, dg 10/10/2026): candidatos e eleitorado do 2º turno.
export const ELEITORADO_2T = 150238779;
export const SECOES_2T = 469329;
const FOTO = "https://resultados.tse.jus.br/oficial/ele2026/6258/fotos/br/";
export const CANDIDATOS_2T = [
	{ n: "22", nome: "FLAVIO BOLSONARO", nomeUrna: "FLAVIO NANTES BOLSONARO", partido: "PL", agr: "PL", foto: `${FOTO}280002551544.jpeg` },
	{ n: "13", nome: "LULA", nomeUrna: "LUIZ INÁCIO LULA DA SILVA", partido: "PT", agr: "Fed. Brasil da Esperança", foto: `${FOTO}280002542548.jpeg` },
];

// Parâmetros do exemplo (ajuste aqui para outro roteiro).
const SWING = -0.028; // desloca a fatia de 22 em todas as UFs vs. a divisão F/(F+L) do 1º turno
// UFs com roteiro próprio, para o exemplo ter viradas vs 1º turno nos dois sentidos
const SWING_UF = { mg: -0.035, to: -0.03, am: 0.05 };
const COMP_PP = 0.6; // comparecimento sobe 0,6 p.p. vs. 1º turno
const BN_2T = 0.042; // brancos + nulos sobre o comparecimento
// janela [início, fim] da apuração de cada UF, em fração da noite (0 = 17h, 1 = fim)
const JANELA = { Sul: [0, 0.5], Sudeste: [0.02, 0.7], "Centro-Oeste": [0, 0.5], Norte: [0.08, 0.78], Nordeste: [0.1, 0.72] };
const JANELA_UF = { df: [0, 0.4], sp: [0.03, 0.78], ba: [0.12, 0.8], zz: [0.3, 1] };
const MINUTOS = 200; // 17:00 → ~20:20 para 100%
const LEITURAS = 60;

// ruído determinístico por UF (±0,8 p.p.)
const ruido = (uf) => (((uf.charCodeAt(0) * 31 + uf.charCodeAt(1) * 17) % 17) - 8) / 1000;

function base(e1) {
	const k = ELEITORADO_2T / e1.cargos.presidente.totais.eleitorado;
	const kS = SECOES_2T / Object.values(e1.ufs).reduce((s, u) => s + u.secoes, 0);
	const T1 = e1.cargos.presidente.totais;
	const comp1 = T1.comparecimento;
	const bn1 = (T1.brancos + T1.nulos) / 100;
	return Object.values(e1.ufs).map((u) => {
		const F1 = u.candidatos.find((c) => c.n === "22")?.votos ?? 0;
		const L1 = u.candidatos.find((c) => c.n === "13")?.votos ?? 0;
		const f = Math.min(0.9, Math.max(0.1, F1 / (F1 + L1) + SWING + (SWING_UF[u.uf] ?? 0) + ruido(u.uf)));
		const eleitorado = Math.round(u.eleitorado * k);
		// válidos/eleitorado do 1º turno, ajustado pelo comparecimento e brancos+nulos do 2º
		const v1 = u.validos / u.eleitorado;
		const validos = Math.round(eleitorado * v1 * ((comp1 + COMP_PP) / comp1) * ((1 - BN_2T) / (1 - bn1)));
		return {
			uf: u.uf,
			nome: u.nome,
			regiao: regiaoDe[u.uf] ?? "Exterior",
			eleitorado,
			secoes: Math.round(u.secoes * kS),
			validos,
			f,
			jan: JANELA_UF[u.uf] ?? JANELA[regiaoDe[u.uf]] ?? [0, 1],
			t1: { F: F1, L: L1, validos: u.validos, eleitorado: u.eleitorado, lider: F1 >= L1 ? "22" : "13", pf: (F1 / u.validos) * 100, pl: (L1 / u.validos) * 100 },
		};
	});
}

const horaDe = (t) => {
	const seg = Math.round(t * MINUTOS * 60);
	const m = 17 * 60 + Math.floor(seg / 60);
	const s = seg % 60;
	return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

/** Estado de cada UF e do Brasil no instante t. */
function instante(B, t) {
	const ufs = {};
	let S = 0, Sa = 0, E = 0, Ea = 0, V = 0, F = 0, L = 0;
	for (const u of B) {
		const ap = Math.min(1, Math.max(0, (t - u.jan[0]) / (u.jan[1] - u.jan[0])));
		const sa = Math.round(u.secoes * ap);
		const apP = u.secoes ? (sa / u.secoes) * 100 : 0;
		const vv = Math.round(u.validos * (sa / u.secoes || 0));
		const fv = Math.round(vv * u.f);
		const lv = vv - fv;
		const cands = [
			{ ...CANDIDATOS_2T[0], votos: fv, pct: vv ? (fv / vv) * 100 : 0 },
			{ ...CANDIDATOS_2T[1], votos: lv, pct: vv ? (lv / vv) * 100 : 0 },
		];
		ufs[u.uf] = {
			uf: u.uf, nome: u.nome, regiao: u.regiao, hora: horaDe(t), apurado: apP,
			secoes: u.secoes, secoesApuradas: sa, eleitorado: u.eleitorado, validos: vv,
			candidatos: vv ? [...cands].sort((a, b) => b.votos - a.votos) : cands,
			t1: u.t1,
		};
		S += u.secoes; Sa += sa; E += u.eleitorado; Ea += u.eleitorado * (sa / u.secoes || 0);
		V += vv; F += fv; L += lv;
	}
	return { ufs, S, Sa, E, Ea, V, F, L, ap: (Sa / S) * 100, hora: horaDe(t) };
}

function cargoPresidente(x, e1) {
	const P1 = e1.cargos.presidente.totais;
	const comp = P1.comparecimento + COMP_PP;
	const c = [
		{ ...CANDIDATOS_2T[0], votos: x.F, pct: x.V ? (x.F / x.V) * 100 : 0 },
		{ ...CANDIDATOS_2T[1], votos: x.L, pct: x.V ? (x.L / x.V) * 100 : 0 },
	];
	const ord = x.V ? [...c].sort((a, b) => b.votos - a.votos) : c;
	ord.forEach((k, i) => (k.pos = i + 1));
	return {
		id: "presidente", titulo: "Presidente", local: "Brasil", vagas: 1, turno: 2,
		apurado: x.ap, hora: x.V ? x.hora : null,
		totais: {
			eleitorado: x.E, eleitoradoApurado: Math.round(x.Ea), comparecimento: x.V ? comp : 0,
			abstencao: x.V ? 100 - comp : 0, validos: x.V,
			brancos: x.V ? BN_2T * 100 * 0.4 : 0, nulos: x.V ? BN_2T * 100 * 0.6 : 0,
		},
		candidatos: ord,
	};
}

function leitura(x, i) {
	const c = {};
	const ord = [["22", x.F], ["13", x.L]].sort((a, b) => b[1] - a[1]);
	ord.forEach(([n, v], k) => (c[n] = [v, (v / x.V) * 100, k + 1]));
	const pa = x.ufs.pa;
	const cpa = {};
	pa.candidatos.forEach((k, j) => (cpa[k.n] = [k.votos, k.pct, j + 1]));
	return {
		t: Date.UTC(2026, 9, 25, 20, 0) + i * 200_000,
		c: {
			presidente: { ap: x.ap, hora: x.hora, vv: x.V, c },
			pa: { ap: pa.apurado, hora: x.hora, vv: pa.validos, c: cpa },
		},
	};
}

/** Viradas: pares de leituras em que o líder nacional muda. */
function viradas(hist) {
	const r = [];
	for (let i = 1; i < hist.length; i++) {
		const a = hist[i - 1].c.presidente, b = hist[i].c.presidente;
		const la = a.c["22"][0] >= a.c["13"][0] ? "22" : "13";
		const lb = b.c["22"][0] >= b.c["13"][0] ? "22" : "13";
		if (la !== lb) r.push({ ap: b.ap, hora: b.hora, para: lb, de: la, margem: Math.abs(b.c["22"][1] - b.c["13"][1]) });
	}
	return r;
}

function analise(P, hist) {
	const [a, b] = P.candidatos;
	if (!P.totais.validos) return null;
	const frac = P.totais.eleitoradoApurado / P.totais.eleitorado;
	const R = frac >= 1 ? 0 : P.totais.validos / frac - P.totais.validos;
	const pts = hist.map((h) => h.c.presidente);
	const ult = pts.slice(-8);
	const tend = CANDIDATOS_2T.map((k) => {
		const xs = ult.map((p) => p.ap), ys = ult.map((p) => p.c[k.n][1]);
		const mx = xs.reduce((s, v) => s + v, 0) / xs.length, my = ys.reduce((s, v) => s + v, 0) / ys.length;
		const num = xs.reduce((s, v, i) => s + (v - mx) * (ys[i] - my), 0);
		const den = xs.reduce((s, v) => s + (v - mx) ** 2, 0);
		return { n: k.n, nome: k.nome, ppPor10pct: den ? (num / den) * 10 : 0 };
	});
	const vant = a.votos - b.votos;
	return {
		defensor: a, perseguidor: b, vantagemVotos: vant, vantagemPp: a.pct - b.pct,
		evolucaoVantagemPp: pts.map((p) => Math.abs(p.c["22"][1] - p.c["13"][1])),
		validosAApurar: R ? R : null,
		margemParaVirarPp: R ? (vant / R) * 100 : null,
		foraDeAlcance: R ? vant / R > 1 : true,
		tendencias: ult.length >= 3 && R ? tend : [],
	};
}

/**
 * @param {any} e1 snapshot real do 1º turno (GET /api/apuracao de produção)
 * @param {"pre"|"parcial"|"virada"|"encerrado"} variante
 */
export function gerar(e1, variante) {
	const B = base(e1);
	const todas = [];
	for (let i = 1; i <= LEITURAS; i++) todas.push(instante(B, i / LEITURAS));
	const histTodo = todas.map(leitura);
	const vir = viradas(histTodo);
	let n;
	if (variante === "pre") n = 0;
	else if (variante === "parcial") n = todas.findIndex((x) => x.ap >= 35) + 1;
	else if (variante === "virada") n = histTodo.findIndex((h) => h.c.presidente.ap >= (vir.at(-1)?.ap ?? 70)) + 2;
	else n = todas.length;
	const x = n ? todas[n - 1] : instante(B, 0);
	const hist = histTodo.slice(0, n);
	const P = cargoPresidente(x, e1);
	const encerrada = variante === "encerrado";
	if (encerrada) {
		P.candidatos[0].eleito = true;
		P.candidatos[0].situacao = "Eleito";
	}
	const agora = Date.now();
	return {
		dados: {
			versao: n, consultadoEm: agora - 12_000, proximaConsulta: encerrada ? null : agora + 38_000,
			erro: null, encerrada, aguardando: variante === "pre",
			carimbo: encerrada ? "Resultado final · 2º turno" : null,
			cargos: { presidente: P },
			ufs: x.ufs,
			analise: { majoritarias: { presidente: analise(P, hist) } },
		},
		hist,
		viradas: viradas(hist),
		bnPct: BN_2T * 100,
	};
}
