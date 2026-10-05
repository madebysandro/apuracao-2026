/** Cartão majoritário da Tela 1 (marcação .db-* do protótipo, variante D). */

import { barraViva } from "./movimento/fluxo-barras.js";
import {
	anteriorD,
	cf,
	conta,
	corD,
	deltaPp,
	esc,
	foto,
	nf,
	nomeBonito,
	pf,
	serieCand,
	spark,
} from "./tela1-util.js";

/**
 * @param {string} id
 * @param {object} cargo
 * @param {any[]} hist
 * @param {Map} graficos
 * @param {object|null|undefined} analiseMaj análise do servidor (issue #5)
 */
export function renderizarCartaoMajoritario(
	id,
	cargo,
	hist,
	graficos,
	analiseMaj,
	opts = {},
) {
	if (!cargo?.candidatos?.length) {
		return `<article class="db-card"><p class="db-vazio">Aguardando dados de ${esc(id)}…</p></article>`;
	}
	const c = cargo;
	const [a, b, d3] = c.candidatos;
	const duas = c.vagas === 2;
	const noGrafico = c.candidatos.slice(0, duas ? 4 : 2);
	noGrafico.forEach((x) => corD(id, x.n));
	const ant = anteriorD(hist, id);
	const lista = c.candidatos.slice(0, duas ? 6 : 5);
	const ganho = (x) => Math.max(0, x.votos - (ant?.c[x.n]?.[0] ?? x.votos));
	const maior = Math.max(1, ...lista.map(ganho));
	const linhas = lista
		.map((x) => {
			const corX = noGrafico.includes(x) ? corD(id, x.n) : "var(--outros)";
			const pa = ant?.c[x.n]?.[1];
			return `<li class="db-cand" data-flip="${id}-${x.n}" style="--c:${corX}">
      ${foto(x, "db-rosto")}
      <span class="db-nome"><b>${esc(nomeBonito(x.nome))}</b><small>${esc(x.partido)} · ${conta(`d-${id}-${x.n}-v`, x.votos)} votos</small>
        ${barraViva(`${id}-${x.n}`, x.pct, pa, ganho(x) / maior, corX, duas ? "" : "<em></em>")}</span>
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
    ${dbAnalise(c, analiseMaj)}
  </article>`;
}

/**
 * Painel de análise — números vêm do servidor (`analise.majoritarias`).
 * @param {object} c
 * @param {object|null|undefined} a
 */
function dbAnalise(c, a) {
	if (!a?.defensor || !a?.perseguidor) return "";
	const duas = c.vagas === 2;
	const nm = (x) => esc(nomeBonito(x.nome));
	const itens = [
		[
			duas ? "DISPUTA PELA 2ª VAGA" : "VANTAGEM DO LÍDER",
			`${nf.format(a.vantagemVotos)} votos · ${pf.format(a.vantagemPp)} p.p. ${spark(a.evolucaoVantagemPp ?? [], 56, 18)}`,
			`${nm(a.defensor)} sobre ${nm(a.perseguidor)}`,
		],
	];
	if (a.validosAApurar != null) {
		itens.push([
			"VÁLIDOS A APURAR (EST.)",
			`≈ ${cf.format(a.validosAApurar)}`,
			`${pf.format(100 - c.apurado)}% das seções ainda faltam`,
		]);
		const rotuloVirar = duas ? "PARA TOMAR A 2ª VAGA" : "PARA VIRAR";
		itens.push([
			rotuloVirar,
			a.foraDeAlcance
				? "fora de alcance"
				: `+${pf.format(a.margemParaVirarPp)} p.p.`,
			`${nm(a.perseguidor)} precisa superar ${nm(a.defensor)} por essa margem no que falta`,
		]);
		if (!duas && a.primeiroTurno) {
			const s = a.primeiroTurno;
			const texto =
				s.status === "maioria"
					? "já tem a maioria (est.)"
					: s.status === "fora"
						? "fora de alcance (est.)"
						: `${pf.format(s.fatiaPct)}% do que falta`;
			itens.push([
				"VENCER NO 1º TURNO",
				texto,
				`${nm(c.candidatos[0])} tem ${pf.format(c.candidatos[0].pct)}% dos válidos até agora`,
			]);
		}
	}
	const tend = a.tendencias ?? [];
	itens.push([
		"TENDÊNCIA RECENTE",
		tend.length
			? tend
					.map(
						(t) =>
							`<span class="db-tend">${esc(nomeBonito(t.nome))} ${deltaPp(t.ppPor10pct)}</span>`,
					)
					.join("")
			: opts.encerrada || c.apurado === 100
				? '<span class="db-vazio">tendência encerrada com 100% das seções</span>'
				: '<span class="db-vazio">aguardando mais leituras</span>',
		tend.length
			? "p.p. a cada 10% de seções, nas últimas leituras"
			: opts.encerrada || c.apurado === 100
				? "não há mais seções a apurar neste turno"
				: "aparece a partir da 3ª leitura com avanço na apuração",
	]);
	return `<dl class="db-analise">${itens
		.map(
			([r, v, sub]) =>
				`<div><dt>${r}</dt><dd>${v}</dd>${sub ? `<dd class="db-sub">${sub}</dd>` : ""}</div>`,
		)
		.join("")}</dl>`;
}
