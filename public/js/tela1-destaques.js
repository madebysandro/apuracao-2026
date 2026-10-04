/** Faixa DESTAQUES da Tela 1 (Pará + Presidente nacional; UFs entram depois). */

import { esc, nomeBonito, pf } from "./tela1-util.js";

function C(cargos, id) {
	return cargos?.[id];
}

function destaquesPara(cargos) {
	const out = [];
	const P = C(cargos, "presidente");
	const G = C(cargos, "governador");
	const S = C(cargos, "senador");
	if (G) {
		out.push(
			`<b>Pará · apuração</b>${pf.format(G.apurado)}% das seções · comparecimento ${pf.format(G.totais.comparecimento)}%`,
		);
		const [a, b] = G.candidatos;
		if (a && b) {
			out.push(
				`<b>Governador</b>${esc(nomeBonito(a.nome))} ${pf.format(a.pct)}% × ${esc(nomeBonito(b.nome))} ${pf.format(b.pct)}% · vantagem ${pf.format(a.pct - b.pct)} p.p.`,
			);
		}
	}
	if (S?.candidatos?.length >= 3) {
		const [, s2, s3] = S.candidatos;
		out.push(
			`<b>Senado · 2ª vaga</b>${esc(nomeBonito(s2.nome))} ${pf.format(s2.pct)}% × ${esc(nomeBonito(s3.nome))} ${pf.format(s3.pct)}% · ${pf.format(s2.pct - s3.pct)} p.p.`,
		);
	}
	if (P && G) {
		out.push(
			`<b>Comparecimento</b>Brasil ${pf.format(P.totais.comparecimento)}% · Pará ${pf.format(G.totais.comparecimento)}%`,
		);
	}
	return out;
}

function destaquesBrasil(cargos) {
	const out = [];
	const P = C(cargos, "presidente");
	if (!P?.candidatos?.length) return out;
	const [a, b] = P.candidatos;
	out.push(
		`<b>Presidente · Brasil</b>${esc(nomeBonito(a.nome))} ${pf.format(a.pct)}% × ${esc(nomeBonito(b.nome))} ${pf.format(b.pct)}% · ${pf.format(P.apurado)}% das seções`,
	);
	out.push(
		`<b>Presidente · vantagem</b>${esc(nomeBonito(a.nome))} lidera por ${pf.format(a.pct - b.pct)} p.p. (${nfVotos(a.votos - b.votos)} votos)`,
	);
	out.push(
		`<b>Apuração nacional</b>${pf.format(P.apurado)}% das seções · TSE ${esc(P.hora)}`,
	);
	return out;
}

function nfVotos(n) {
	return new Intl.NumberFormat("pt-BR").format(n);
}

/** Intercala 2 do Brasil para 1 do Pará (como no protótipo). */
export function destaques(cargos) {
	const br = destaquesBrasil(cargos);
	const pa = destaquesPara(cargos);
	const out = [];
	while (br.length || pa.length) {
		out.push(...br.splice(0, 2));
		if (pa.length) out.push(pa.shift());
	}
	if (!out.length) {
		out.push("<b>Destaques</b>Aguardando a primeira leitura do TSE…");
	}
	return out;
}
