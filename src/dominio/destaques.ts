import { REGIOES } from "../config/ufs";
import { escHtml, nf, nomeBonito, pf } from "./texto";
import type {
	AnaliseApuracao,
	Cargo,
	Leitura,
	UfPresidente,
} from "./tipos";

type CandMini = { n?: string; nome: string; votos: number; pct: number };

function nm(x: { nome: string }): string {
	return escHtml(nomeBonito(x.nome));
}

function duelo(rotulo: string, u: { apurado: number; candidatos: CandMini[] }): string {
	const [l, s2] = [...u.candidatos].sort((p, q) => q.votos - p.votos);
	return `<b>${escHtml(rotulo)}</b>${nm(l!)} ${pf.format(l!.pct)}% × ${nm(s2!)} ${pf.format(s2!.pct)}% · ${pf.format(u.apurado)}% das seções`;
}

function dif(u: UfPresidente): number {
	return u.candidatos[0]!.pct - u.candidatos[1]!.pct;
}

function destaquesBrasil(
	ufs: Record<string, UfPresidente>,
	presidente: Cargo,
): string[] {
	const out: string[] = [];
	const [a, b] = presidente.candidatos;
	if (!a || !b) return out;

	const lista = Object.values(ufs).filter(
		(u) => u.uf !== "zz" && u.candidatos.length > 1,
	);
	if (!lista.length) return out;

	const lideres = new Map<string, number>();
	for (const u of lista) {
		const nome = u.candidatos[0]!.nome;
		lideres.set(nome, (lideres.get(nome) ?? 0) + 1);
	}
	out.push(
		`<b>Presidente · placar dos estados</b>${[...lideres]
			.sort((p, q) => q[1] - p[1])
			.map(
				([n, k]) =>
					`${escHtml(nomeBonito(n))} lidera em ${k} UF${k > 1 ? "s" : ""}`,
			)
			.join(", ")}`,
	);

	for (const [reg, siglas] of Object.entries(REGIOES)) {
		const us = siglas.map((sg) => ufs[sg]).filter(Boolean) as UfPresidente[];
		const vv = us.reduce((t, u) => t + u.validos, 0);
		if (!vv) continue;
		const votos = (n: string) =>
			us.reduce(
				(t, u) => t + (u.candidatos.find((x) => x.n === n)?.votos ?? 0),
				0,
			);
		const secoes = us.reduce((t, u) => t + u.secoes, 0);
		const apuradas = us.reduce((t, u) => t + u.secoesApuradas, 0);
		out.push(
			duelo(`Presidente · ${reg}`, {
				apurado: secoes ? (apuradas / secoes) * 100 : 0,
				candidatos: [a, b].map((x) => ({
					nome: x.nome,
					votos: votos(x.n),
					pct: (votos(x.n) / vv) * 100,
				})),
			}),
		);
	}

	[...lista]
		.sort((p, q) => q.eleitorado - p.eleitorado)
		.slice(0, 8)
		.forEach((u) => out.push(duelo(`Presidente · ${u.nome}`, u)));

	const comAvanco = lista
		.filter((u) => u.apurado >= 5)
		.sort((p, q) => dif(p) - dif(q));
	if (comAvanco.length) {
		const ap = comAvanco[0]!;
		const fo = comAvanco.at(-1)!;
		out.push(
			`<b>Presidente · disputa mais apertada</b>${escHtml(ap.nome)}: ${nm(ap.candidatos[0]!)} ${pf.format(ap.candidatos[0]!.pct)}% × ${nm(ap.candidatos[1]!)} ${pf.format(ap.candidatos[1]!.pct)}%, ${pf.format(dif(ap))} p.p.`,
		);
		out.push(
			`<b>Presidente · maior vantagem</b>${escHtml(fo.nome)}: ${nm(fo.candidatos[0]!)} com ${pf.format(fo.candidatos[0]!.pct)}%, ${pf.format(dif(fo))} p.p. à frente`,
		);
	}

	const ritmo = [...lista].sort((p, q) => q.apurado - p.apurado);
	out.push(
		`<b>Apuração por estado</b>mais adiantado: ${escHtml(ritmo[0]!.nome)} ${pf.format(ritmo[0]!.apurado)}% · mais atrasado: ${escHtml(ritmo.at(-1)!.nome)} ${pf.format(ritmo.at(-1)!.apurado)}%`,
	);

	if ((ufs.zz?.candidatos.length ?? 0) > 1) {
		out.push(duelo("Presidente · Exterior", ufs.zz!));
	}
	return out;
}

function leituraAnteriorCargo(
	historico: Leitura[],
	cargoId: string,
): Leitura["c"][string] | null {
	const pontos = historico.filter((p) => p.c[cargoId]);
	return pontos.at(-2)?.c[cargoId] ?? null;
}

function destaquesPara(
	cargos: Record<string, Cargo>,
	historico: Leitura[],
	analiseProp: NonNullable<AnaliseApuracao["proporcionais"]>,
): string[] {
	const out: string[] = [];
	const P = cargos.presidente;
	const G = cargos.governador;
	const S = cargos.senador;
	if (!P || !G) return out;

	out.push(
		`<b>Apuração</b>Brasil ${pf.format(P.apurado)}% · Pará ${pf.format(G.apurado)}% das seções`,
	);

	for (const id of ["presidente", "governador"] as const) {
		const c = cargos[id];
		if (!c?.candidatos[0] || !c.candidatos[1]) continue;
		const [a, b] = c.candidatos;
		const ant = leituraAnteriorCargo(historico, id);
		const m = a.pct - b.pct;
		const mAnt =
			ant?.c[a.n] && ant?.c[b.n]
				? ant.c[a.n]![1] - ant.c[b.n]![1]
				: null;
		out.push(
			`<b>${escHtml(c.titulo)} · ${escHtml(c.local)}</b>${nm(a)} lidera com ${pf.format(a.pct)}%, ${pf.format(m)} p.p. à frente de ${nm(b)}` +
				(mAnt == null || Math.abs(m - mAnt) < 0.005
					? ""
					: ` · vantagem ${m > mAnt ? "subiu" : "caiu"} ${pf.format(Math.abs(m - mAnt))} p.p. na última leitura`),
		);
	}

	if (S?.candidatos[1] && S.candidatos[2]) {
		const s2 = S.candidatos[1];
		const s3 = S.candidatos[2];
		out.push(
			`<b>Senado · Pará</b>2ª vaga: ${nm(s2)} ${pf.format(s2.pct)}% × ${nm(s3)} ${pf.format(s3.pct)}%, diferença de ${nf.format(s2.votos - s3.votos)} votos`,
		);
	}

	for (const id of ["depfed", "depest"] as const) {
		const c = cargos[id];
		if (!c?.agremiacoes) continue;
		const rot = id === "depfed" ? "Dep. Federal" : "Dep. Estadual";
		for (const a of c.agremiacoes) {
			const dv = a.deltaCadeiras ?? 0;
			if (dv) {
				out.push(
					`<b>${rot}</b>${escHtml(a.sigla)} ${dv > 0 ? "ganhou" : "perdeu"} ${Math.abs(dv)} cadeira${Math.abs(dv) > 1 ? "s" : ""} desde o início do acompanhamento`,
				);
			}
		}
		const f = analiseProp[id]?.disputaInterna?.[0];
		if (f) {
			out.push(
				`<b>${rot}</b>disputa interna mais apertada: ${escHtml(f.sigla)}, ${nm(f.ultimo)} × ${nm(f.proximo)}, ${nf.format(f.diferenca)} votos`,
			);
		}
	}

	out.push(
		`<b>Comparecimento</b>Brasil ${pf.format(P.totais.comparecimento)}% · Pará ${pf.format(G.totais.comparecimento)}%`,
	);
	return out;
}

/**
 * Monta as frases da faixa: 2 do Brasil (Presidente/UFs) para cada 1 do Pará.
 * Textos e ordem fiéis ao protótipo (variante D).
 */
export function montarDestaques(
	cargos: Record<string, Cargo>,
	ufs: Record<string, UfPresidente>,
	historico: Leitura[],
	analiseProp: NonNullable<AnaliseApuracao["proporcionais"]> = {},
): string[] {
	const br = cargos.presidente
		? destaquesBrasil(ufs, cargos.presidente)
		: [];
	const pa = destaquesPara(cargos, historico, analiseProp);
	const out: string[] = [];
	while (br.length || pa.length) {
		out.push(...br.splice(0, 2));
		if (pa.length) out.push(pa.shift()!);
	}
	if (!out.length) {
		out.push("<b>Destaques</b>Aguardando a primeira leitura do TSE…");
	}
	return out;
}
