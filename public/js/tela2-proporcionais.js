/**
 * Tela 2 — Proporcionais (variante D do protótipo).
 * Marcação e classes `db-*` copiadas quase literalmente de dbProp / dbTela2.
 */

import {
	corD,
	deltaInt,
	esc,
	foto,
	nf,
	nomeBonito,
	pf,
	spark,
} from "./tela1-util.js";

let semeado = false;

function semearCoresAgr(cargos) {
	const fed = cargos.depfed?.agremiacoes;
	const est = cargos.depest?.agremiacoes;
	if (!fed?.length || !est?.length) return;
	if (semeado) return;
	semeado = true;
	const tot = new Map();
	for (const id of ["depfed", "depest"]) {
		for (const a of cargos[id].agremiacoes) {
			tot.set(a.sigla, (tot.get(a.sigla) ?? 0) + a.vagas * 1e9 + a.votos);
		}
	}
	[...tot]
		.filter(([, v]) => v >= 1e9)
		.sort((a, b) => b[1] - a[1])
		.forEach(([s]) => corD("agr", s));
}

const corAgr = (s) => corD("agr", s);

function dbProp(id, cargo, disputa) {
	if (!cargo) {
		return `<article class="db-card"><p class="db-vazio">Aguardando leitura do TSE…</p></article>`;
	}

	const ag = cargo.agremiacoes ?? [];
	const proj = cargo.candidatos
		.filter((x) => x.projetado)
		.sort((x, y) => y.votos - x.votos);
	const cadeiras = ag
		.filter((a) => a.vagas > 0)
		.flatMap((a) => proj.filter((x) => x.agr === a.sigla));

	const waffle = cadeiras
		.map(
			(x, i) =>
				`<span class="db-seat" title="${esc(x.agr)} · ${esc(nomeBonito(x.nome))} · ${nf.format(x.votos)} votos" style="background:${corAgr(x.agr)};--i:${i}"></span>`,
		)
		.join("");

	const linhasAgr = ag
		.filter(
			(a) =>
				a.vagas > 0 ||
				(a.deltaCadeiras != null && a.deltaCadeiras !== 0) ||
				(cargo.qe && a.votos >= cargo.qe * 0.5),
		)
		.map((a) => {
			const dv = a.deltaCadeiras;
			return `<tr data-flip="${id}-agr-${a.sigla}">
      <td><span class="db-sw" style="background:${a.vagas ? corAgr(a.sigla) : (corD("agr", a.sigla, true) ?? "var(--outros)")}"></span>${esc(a.sigla)}${a.federacao ? " <small>federação</small>" : ""}</td>
      <td class="n">${nf.format(a.votos)}</td>
      <td class="n db-oculta-mob">${pf.format((a.votos / cargo.totais.validos) * 100)}%</td>
      <td class="n">${cargo.qe ? pf.format(a.votos / cargo.qe) : "—"}</td>
      <td class="n"><b>${a.vagas}</b></td>
      <td class="n">${dv == null ? "" : deltaInt(dv)}</td>
    </tr>`;
		})
		.join("");

	const linhasCand = proj
		.map((x) => {
			const pa = x.deltaPos;
			const pessoa = {
				nome: x.nome,
				foto: x.foto,
			};
			return `<tr data-flip="${id}-${x.n}" style="--c:${corAgr(x.agr)}">
      <td class="n">${x.pos}º</td>
      <td class="n">${pa == null ? "" : deltaInt(pa)}</td>
      <td><div class="db-pessoa">${foto(pessoa, "db-rosto p")}<span><b>${esc(nomeBonito(x.nome))}</b> <small>${esc(x.partido)}</small>${x.eleito ? ' <span class="db-ok">✓ eleito</span>' : ""}</span></div></td>
      <td class="n">${nf.format(x.votos)}</td>
      <td class="n db-oculta-mob">${pf.format(x.pct)}%</td>
      <td class="db-oculta-mob">${spark(x.seriePct, 64, 18)}</td>
    </tr>`;
		})
		.join("");

	const nm = (x) => esc(nomeBonito(x.nome));
	const fila = disputa ?? [];
	const fotoDe = (n) =>
		cargo.candidatos.find((c) => c.n === n)?.foto ?? "";

	return `<article class="db-card">
    <header class="db-card-topo">
      <div><h2>${esc(cargo.titulo)}</h2><span>${esc(cargo.local)} · ${cargo.vagas} cadeiras</span></div>
      <div class="db-apu">${pf.format(cargo.apurado)}%<small>das seções apuradas</small></div>
    </header>
    <dl class="db-mini">
      <div><dt>Votos válidos</dt><dd>${nf.format(cargo.totais.validos)}</dd></div>
      <div><dt>Quociente eleitoral</dt><dd>${cargo.qe ? nf.format(cargo.qe) : "—"}</dd></div>
      <div><dt>Votos de legenda</dt><dd>${pf.format((cargo.totais.legenda / cargo.totais.validos) * 100)}%</dd></div>
      <div><dt>Brancos · nulos</dt><dd>${pf.format(cargo.totais.brancos)}% · ${pf.format(cargo.totais.nulos)}%</dd></div>
    </dl>
    <section class="db-sec">
      <h3>Bancada projetada <small>cada quadrado é uma cadeira; passe o mouse para ver quem ocupa</small></h3>
      <div class="db-waffle" role="img" aria-label="Distribuição projetada das ${cargo.vagas} cadeiras por agremiação">${waffle}</div>
      <div class="db-rolagem"><table class="db-tab">
        <thead><tr><th>Agremiação</th><th class="n">Votos</th><th class="n db-oculta-mob">% válidos</th><th class="n" title="Votos da agremiação divididos pelo quociente eleitoral">Quocientes</th><th class="n">Cadeiras</th><th class="n" title="Variação desde a primeira leitura do acompanhamento">Δ desde o início</th></tr></thead>
        <tbody>${linhasAgr}</tbody>
      </table></div>
    </section>
    <section class="db-sec">
      <h3>Projetados para as ${cargo.vagas} cadeiras <small>posição geral por votos · Δ desde a leitura anterior</small></h3>
      <div class="db-rolagem"><table class="db-tab">
        <thead><tr><th class="n">Pos.</th><th class="n">Δ</th><th>Candidato</th><th class="n">Votos</th><th class="n db-oculta-mob">%</th><th class="db-oculta-mob">Evolução do %</th></tr></thead>
        <tbody>${linhasCand}</tbody>
      </table></div>
    </section>
    <section class="db-sec">
      <h3>Disputa interna <small>1º da fila × último que entra, na mesma agremiação</small></h3>
      <div class="db-rolagem"><table class="db-tab">
        <thead><tr><th>Agremiação</th><th>Último que entra</th><th>1º da fila</th><th class="n">Diferença</th></tr></thead>
        <tbody>${fila
					.map((f) => {
						const u = { nome: f.ultimo.nome, foto: fotoDe(f.ultimo.n) };
						const p = { nome: f.proximo.nome, foto: fotoDe(f.proximo.n) };
						return `<tr data-flip="${id}-fila-${f.sigla}" style="--c:${corAgr(f.sigla)}">
          <td><span class="db-sw" style="background:${corAgr(f.sigla)}"></span>${esc(f.sigla)}</td>
          <td><div class="db-pessoa">${foto(u, "db-rosto p")}<span>${nm(f.ultimo)} <small>${nf.format(f.ultimo.votos)}</small></span></div></td>
          <td><div class="db-pessoa">${foto(p, "db-rosto p")}<span>${nm(f.proximo)} <small>${nf.format(f.proximo.votos)}</small></span></div></td>
          <td class="n"><b>${nf.format(f.diferenca)}</b></td></tr>`;
					})
					.join("")}</tbody>
      </table></div>
    </section>
  </article>`;
}

export function renderizarTela2(dados) {
	const cargos = dados.cargos ?? {};
	semearCoresAgr(cargos);
	const analise = dados.analise?.proporcionais ?? {};
	return `<div class="db-grade2">${dbProp("depfed", cargos.depfed, analise.depfed?.disputaInterna)}${dbProp("depest", cargos.depest, analise.depest?.disputaInterna)}</div>`;
}
