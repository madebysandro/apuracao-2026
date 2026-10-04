/**
 * Gera fixtures sintéticas de Presidente por UF (27 + exterior).
 * Valores controlados para os testes da faixa de destaques (#7).
 * Formato compatível com o JSON do TSE (campos usados na normalização).
 *
 * Rodar: node fixtures/tse-provisorio/ufs/gerar.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));

/** @type {Record<string, { nome: string, eleitorado: number, apurado: number, secoes: number, lider: '22'|'13', gap: number }>} */
const UFS = {
	// Top 8 colégios por eleitorado (ordem decrescente): SP MG RJ BA RS PR PE CE
	sp: { nome: "São Paulo", eleitorado: 34_000_000, apurado: 40, secoes: 100_000, lider: "22", gap: 12 },
	mg: { nome: "Minas Gerais", eleitorado: 16_000_000, apurado: 35, secoes: 50_000, lider: "22", gap: 8 },
	rj: { nome: "Rio de Janeiro", eleitorado: 13_000_000, apurado: 42, secoes: 40_000, lider: "22", gap: 10 },
	ba: { nome: "Bahia", eleitorado: 11_000_000, apurado: 50, secoes: 35_000, lider: "13", gap: 45 }, // maior vantagem (≥5%)
	rs: { nome: "Rio Grande do Sul", eleitorado: 9_000_000, apurado: 38, secoes: 28_000, lider: "22", gap: 15 },
	pr: { nome: "Paraná", eleitorado: 8_500_000, apurado: 55, secoes: 26_000, lider: "22", gap: 20 },
	pe: { nome: "Pernambuco", eleitorado: 7_500_000, apurado: 48, secoes: 22_000, lider: "13", gap: 18 },
	ce: { nome: "Ceará", eleitorado: 7_000_000, apurado: 52, secoes: 20_000, lider: "13", gap: 22 },
	// Demais
	pa: { nome: "Pará", eleitorado: 5_500_000, apurado: 56, secoes: 18_000, lider: "13", gap: 6 },
	sc: { nome: "Santa Catarina", eleitorado: 5_200_000, apurado: 90, secoes: 16_000, lider: "22", gap: 25 }, // mais adiantado
	go: { nome: "Goiás", eleitorado: 4_800_000, apurado: 44, secoes: 15_000, lider: "22", gap: 14 },
	ma: { nome: "Maranhão", eleitorado: 4_500_000, apurado: 30, secoes: 14_000, lider: "13", gap: 30 },
	pb: { nome: "Paraíba", eleitorado: 3_200_000, apurado: 33, secoes: 10_000, lider: "13", gap: 16 },
	es: { nome: "Espírito Santo", eleitorado: 3_000_000, apurado: 41, secoes: 9_000, lider: "22", gap: 9 },
	pi: { nome: "Piauí", eleitorado: 2_800_000, apurado: 28, secoes: 8_500, lider: "13", gap: 28 },
	rn: { nome: "Rio Grande do Norte", eleitorado: 2_600_000, apurado: 36, secoes: 8_000, lider: "13", gap: 11 },
	al: { nome: "Alagoas", eleitorado: 2_400_000, apurado: 32, secoes: 7_500, lider: "13", gap: 13 },
	mt: { nome: "Mato Grosso", eleitorado: 2_300_000, apurado: 46, secoes: 7_000, lider: "22", gap: 19 },
	df: { nome: "Distrito Federal", eleitorado: 2_200_000, apurado: 60, secoes: 6_500, lider: "22", gap: 7 },
	ms: { nome: "Mato Grosso do Sul", eleitorado: 2_000_000, apurado: 43, secoes: 6_000, lider: "22", gap: 17 },
	se: { nome: "Sergipe", eleitorado: 1_800_000, apurado: 34, secoes: 5_500, lider: "13", gap: 21 },
	ro: { nome: "Rondônia", eleitorado: 1_400_000, apurado: 47, secoes: 4_500, lider: "22", gap: 23 },
	to: { nome: "Tocantins", eleitorado: 1_200_000, apurado: 39, secoes: 4_000, lider: "22", gap: 5 },
	ac: { nome: "Acre", eleitorado: 600_000, apurado: 51, secoes: 2_500, lider: "22", gap: 4 },
	am: { nome: "Amazonas", eleitorado: 2_700_000, apurado: 8, secoes: 8_200, lider: "13", gap: 10 }, // mais atrasado
	ap: { nome: "Amapá", eleitorado: 500_000, apurado: 25, secoes: 2_000, lider: "13", gap: 3 },
	rr: { nome: "Roraima", eleitorado: 400_000, apurado: 70, secoes: 1_500, lider: "22", gap: 0.2 }, // disputa mais apertada (≥5%)
	zz: { nome: "Exterior", eleitorado: 500_000, apurado: 65, secoes: 1_200, lider: "22", gap: 30 },
};

const NOMES = {
	"22": "FLAVIO BOLSONARO",
	"13": "LULA",
};

function pctStr(n) {
	return String(n).replace(".", ",");
}

function montarUf(sigla, meta) {
	const secoesApuradas = Math.round((meta.secoes * meta.apurado) / 100);
	const validos = Math.round(meta.eleitorado * 0.6 * (meta.apurado / 100));
	const pctLider = 50 + meta.gap / 2;
	const pctSegundo = 50 - meta.gap / 2;
	const votosLider = Math.round((validos * pctLider) / 100);
	const votosSegundo = Math.round((validos * pctSegundo) / 100);
	const nLider = meta.lider;
	const nSegundo = nLider === "22" ? "13" : "22";

	const cand = (n, votos, pct) => ({
		n,
		sqcand: n === "22" ? "280002551544" : "280002542548",
		nm: NOMES[n],
		nmu: NOMES[n],
		dvt: "Válido",
		e: "n",
		st: "",
		vap: String(votos),
		pvapn: pctStr(pct),
	});

	return {
		ele: "6257",
		tpabr: "uf",
		cdabr: sigla,
		dg: "04/10/2026",
		hg: "18:40:00",
		carg: [
			{
				cd: "1",
				nv: "1",
				agr: [
					{
						com: "PL",
						nm: "PARTIDO LIBERAL",
						tp: "i",
						par: [
							{
								sg: "PL",
								tvtn: String(nLider === "22" ? votosLider : votosSegundo),
								cand: [
									cand(
										"22",
										nLider === "22" ? votosLider : votosSegundo,
										nLider === "22" ? pctLider : pctSegundo,
									),
								],
							},
						],
					},
					{
						com: "PT/PC do B/PV",
						nm: "FE BRASIL",
						tp: "f",
						par: [
							{
								sg: "PT",
								tvtn: String(nLider === "13" ? votosLider : votosSegundo),
								cand: [
									cand(
										"13",
										nLider === "13" ? votosLider : votosSegundo,
										nLider === "13" ? pctLider : pctSegundo,
									),
								],
							},
						],
					},
				],
			},
		],
		s: {
			ts: String(meta.secoes),
			st: String(secoesApuradas),
			pstn: pctStr(meta.apurado),
		},
		e: {
			te: String(meta.eleitorado),
			est: String(Math.round(meta.eleitorado * (meta.apurado / 100))),
			pcn: "80,00",
			pan: "20,00",
		},
		v: {
			vv: String(validos),
			vl: "0",
			pvbn: "1,00",
			ptvnn: "2,00",
		},
	};
}

const out = {};
for (const [sigla, meta] of Object.entries(UFS)) {
	out[sigla] = montarUf(sigla, meta);
}

await mkdir(DIR, { recursive: true });
await writeFile(join(DIR, "presidente-ufs.json"), JSON.stringify(out, null, "\t") + "\n");
await writeFile(
	join(DIR, "README.md"),
	`# Fixtures sintéticas — Presidente por UF

Geradas por \`gerar.mjs\` para a issue #7 (faixa de destaques).
Não são gravações reais do TSE; a issue #2 deve substituí-las pela sequência oficial.

Valores controlados:
- **Placar:** Flávio lidera em 15 UFs (+ exterior), Lula em 12
- **Top 8 colégios:** SP, MG, RJ, BA, RS, PR, PE, CE
- **Disputa mais apertada (≥5%):** Roraima (0,2 p.p.)
- **Maior vantagem (≥5%):** Bahia (45 p.p.)
- **Mais adiantado / atrasado:** Santa Catarina (90%) / Amazonas (8%)
- **Exterior:** \`zz\`
`,
);
console.log("escrito presidente-ufs.json com", Object.keys(out).length, "UFs");
