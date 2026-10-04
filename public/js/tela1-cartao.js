/** Cartão majoritário da Tela 1 (marcação .db-* do protótipo, variante D). */

import {
	anima,
	anteriorD,
	cf,
	conta,
	corD,
	deltaPp,
	esc,
	nf,
	nomeBonito,
	pf,
	pontos,
	restante,
	serieCand,
	spark,
	tendencia,
} from "./tela1-util.js";

/**
 * @param {string} id
 * @param {object} cargo
 * @param {any[]} hist
 * @param {Map} graficos
 */
export function renderizarCartaoMajoritario(id, cargo, hist, graficos) {
	if (!cargo?.candidatos?.length) {
		return `<article class="db-card"><p class="db-vazio">Aguardando dados de ${esc(id)}…</p></article>`;
	}
	const c = cargo;
	const [a, b, d3] = c.candidatos;
	const duas = c.vagas === 2;
	const noGrafico = c.candidatos.slice(0, duas ? 4 : 2);
	noGrafico.forEach((x) => corD(id, x.n));
	const ant = anteriorD(hist, id);
	const linhas = c.candidatos
		.slice(0, duas ? 6 : 5)
		.map((x) => {
			const corX = noGrafico.includes(x) ? corD(id, x.n) : "var(--outros)";
			const pa = ant?.c[x.n]?.[1];
			return `<li class="db-cand" data-flip="${id}-${x.n}" style="--atraso:${(c.candidatos.indexOf(x) * 0.35).toFixed(2)}s">
      <span class="db-sw" style="background:${corX}"></span>
      <span class="db-nome"><b>${esc(nomeBonito(x.nome))}</b><small>${esc(x.partido)} · ${conta(`d-${id}-${x.n}-v`, x.votos)} votos</small></span>
      <span class="db-barra" aria-hidden="true"><i ${anima(`d-${id}-${x.n}-b`, "width", x.pct, `background:${corX}`)}></i>${duas ? "" : "<em></em>"}</span>
      <span class="db-pct">${conta(`d-${id}-${x.n}-p`, x.pct, "p")}</span>
      <span class="db-delta">${pa == null ? "" : deltaPp(x.pct - pa)}</span>
    </li>`;
		})
		.join("");

	graficos.set(id, {
		rotulo: `Evolução do percentual de votos válidos de ${c.titulo}`,
		ref: duas ? null : 50,
		series: noGrafico.map((x) => ({
			nome: nomeBonito(x.nome),
			cor: corD(id, x.n),
			pts: serieCand(hist, id, x.n),
		})),
	});

	const manchete = duas
		? `<b class="db-heroi menor">${esc(nomeBonito(a.nome))} e ${esc(nomeBonito(b.nome))}</b><span>ocupam as 2 vagas · 3º lugar a ${pf.format(b.pct - d3.pct)} p.p. da 2ª vaga</span>`
		: `<b class="db-heroi ${id === "presidente" ? "" : "menor"}">${conta(`d-${id}-heroi`, a.pct, "p")}</b><span>${esc(nomeBonito(a.nome))} lidera, ${pf.format(a.pct - b.pct)} p.p. à frente de ${esc(nomeBonito(b.nome))}</span>`;

	return `<article class="db-card">
    <header class="db-card-topo">
      <div><h2>${esc(c.titulo)}${duas ? "es" : ""}</h2><span>${esc(c.local)} · ${duas ? "2 vagas" : "1 vaga"}</span></div>
      <div class="db-apu">${conta(`d-${id}-ap`, c.apurado, "p")}<small>das seções apuradas</small></div>
    </header>
    <div class="db-manchete">${manchete}</div>
    <ol class="db-cands">${linhas}</ol>
    <figure class="db-fig">
      <figcaption><span>% dos votos válidos conforme as seções são apuradas</span>
        <span class="db-leg">${noGrafico.map((x) => `<span><i class="db-sw" style="background:${corD(id, x.n)}"></i>${esc(nomeBonito(x.nome))}</span>`).join("")}</span></figcaption>
      <div class="db-graf" data-graf="${id}"></div>
    </figure>
    ${dbAnalise(c, hist)}
  </article>`;
}

function dbAnalise(c, hist) {
	const id = c.id;
	const [a, b, d3] = c.candidatos;
	const duas = c.vagas === 2;
	const [def, per] = duas ? [b, d3] : [a, b];
	if (!def || !per) return "";
	const L = def.votos - per.votos;
	const R = restante(c);
	const margens = pontos(hist, id)
		.map(
			(p) =>
				(p.c[id].c[def.n]?.[1] ?? NaN) - (p.c[id].c[per.n]?.[1] ?? NaN),
		)
		.filter((v) => !Number.isNaN(v));
	const nm = (x) => esc(nomeBonito(x.nome));
	const itens = [
		[
			duas ? "DISPUTA PELA 2ª VAGA" : "VANTAGEM DO LÍDER",
			`${nf.format(L)} votos · ${pf.format(def.pct - per.pct)} p.p. ${spark(margens, 56, 18)}`,
			`${nm(def)} sobre ${nm(per)}`,
		],
	];
	if (R) {
		itens.push([
			"VÁLIDOS A APURAR (EST.)",
			`≈ ${cf.format(R)}`,
			`${pf.format(100 - c.apurado)}% das seções ainda faltam`,
		]);
		const pp = (L / R) * 100;
		itens.push([
			duas ? "PARA TOMAR A 2ª VAGA" : "PARA VIRAR",
			pp > 100 ? "fora de alcance" : `+${pf.format(pp)} p.p.`,
			`${nm(per)} precisa superar ${nm(def)} por essa margem no que falta`,
		]);
		if (!duas) {
			const s = ((0.5 * (c.totais.validos + R) - a.votos) / R) * 100;
			itens.push([
				"VENCER NO 1º TURNO",
				s <= 0
					? "já tem a maioria (est.)"
					: s > 100
						? "fora de alcance (est.)"
						: `${pf.format(s)}% do que falta`,
				`${nm(a)} tem ${pf.format(a.pct)}% dos válidos até agora`,
			]);
		}
	}
	const tend = c.candidatos
		.slice(0, duas ? 4 : 2)
		.map((x) => [x, tendencia(hist, id, x.n)])
		.filter(([, t]) => t != null);
	itens.push([
		"TENDÊNCIA RECENTE",
		tend.length
			? tend
					.map(([x, t]) => `<span class="db-tend">${nm(x)} ${deltaPp(t)}</span>`)
					.join("")
			: '<span class="db-vazio">aguardando mais leituras</span>',
		tend.length ? "p.p. a cada 10% de seções, nas últimas leituras" : "",
	]);
	return `<dl class="db-analise">${itens
		.map(
			([r, v, sub]) =>
				`<div><dt>${r}</dt><dd>${v}</dd>${sub ? `<dd class="db-sub">${sub}</dd>` : ""}</div>`,
		)
		.join("")}</dl>`;
}
