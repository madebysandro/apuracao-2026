/**
 * Tela 2 — Deputados Federais e Estaduais (proporcionais).
 * Cores de agremiação fixas na sessão (até 8; resto “outros”), iguais nos dois cargos.
 */

const formatarPct = new Intl.NumberFormat("pt-BR", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});
const formatarInt = new Intl.NumberFormat("pt-BR");

const coresAgr = new Map();
let proxCorAgr = 0;
let coresSemeadas = false;

function corAgr(sigla) {
	if (!coresAgr.has(sigla)) {
		const i = proxCorAgr++;
		coresAgr.set(sigla, i < 8 ? `var(--s${i + 1})` : "var(--outros)");
	}
	return coresAgr.get(sigla);
}

/** Semear na ordem de cadeiras (depois votos), compartilhada entre depfed e depest. */
function semearCores(cargos) {
	if (coresSemeadas) return;
	coresSemeadas = true;
	const tot = new Map();
	for (const id of ["depfed", "depest"]) {
		const agrs = cargos[id]?.agremiacoes ?? [];
		for (const a of agrs) {
			tot.set(a.sigla, (tot.get(a.sigla) ?? 0) + a.vagas * 1e9 + a.votos);
		}
	}
	[...tot]
		.filter(([, v]) => v >= 1e9)
		.sort((a, b) => b[1] - a[1])
		.forEach(([s]) => corAgr(s));
}

function nomeBonito(s) {
	return String(s)
		.toLowerCase()
		.replace(/(^|[\s.-])(\p{L})/gu, (_m, a, b) => a + b.toUpperCase())
		.replace(/ (Da|De|Do|Dos|Das|E) /g, (w) => w.toLowerCase());
}

function escapar(texto) {
	return String(texto)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

function deltaInt(v) {
	if (v == null) return "";
	if (!v) return `<span class="d">=</span>`;
	const cls = v > 0 ? "sobe" : "desce";
	return `<span class="d ${cls}">${v > 0 ? "▲" : "▼"} ${Math.abs(v)}</span>`;
}

function renderCargo(cargo, disputa) {
	if (!cargo) {
		return `<article class="cartao"><p class="vazio">Aguardando leitura do TSE…</p></article>`;
	}

	const agrs = cargo.agremiacoes ?? [];
	const projetados = cargo.candidatos
		.filter((c) => c.projetado)
		.sort((a, b) => b.votos - a.votos);
	const cadeiras = agrs
		.filter((a) => a.vagas > 0)
		.flatMap((a) => projetados.filter((c) => c.agr === a.sigla));

	const waffle = cadeiras
		.map(
			(x, i) =>
				`<span class="seat" style="background:${corAgr(x.agr)};--i:${i}" title="${escapar(x.agr)} · ${escapar(nomeBonito(x.nome))} · ${formatarInt.format(x.votos)} votos"></span>`,
		)
		.join("");

	const linhasAgr = agrs
		.filter((a) => a.vagas > 0 || (cargo.qe && a.votos >= cargo.qe * 0.5))
		.map((a) => {
			const pct = cargo.totais.validos
				? (a.votos / cargo.totais.validos) * 100
				: 0;
			const q = cargo.qe ? a.votos / cargo.qe : null;
			return `<tr>
        <td><span class="sw" style="background:${a.vagas ? corAgr(a.sigla) : "var(--outros)"}"></span>${escapar(a.sigla)}${a.federacao ? " <small>federação</small>" : ""}</td>
        <td class="n">${formatarInt.format(a.votos)}</td>
        <td class="n oculta-mob">${formatarPct.format(pct)}%</td>
        <td class="n">${q == null ? "—" : formatarPct.format(q)}</td>
        <td class="n"><b>${a.vagas}</b></td>
        <td class="n">${deltaInt(a.deltaCadeiras)}</td>
      </tr>`;
		})
		.join("");

	const linhasCand = projetados
		.map(
			(x) => `<tr style="--c:${corAgr(x.agr)}">
      <td class="n">${x.pos}º</td>
      <td class="n">${deltaInt(x.deltaPos)}</td>
      <td><b>${escapar(nomeBonito(x.nome))}</b> <small>${escapar(x.partido)}</small></td>
      <td class="n">${formatarInt.format(x.votos)}</td>
      <td class="n oculta-mob">${formatarPct.format(x.pct)}%</td>
    </tr>`,
		)
		.join("");

	const linhasDisputa = (disputa ?? [])
		.map(
			(f) => `<tr style="--c:${corAgr(f.sigla)}">
      <td><span class="sw" style="background:${corAgr(f.sigla)}"></span>${escapar(f.sigla)}</td>
      <td>${escapar(nomeBonito(f.ultimo.nome))} <small>${formatarInt.format(f.ultimo.votos)}</small></td>
      <td>${escapar(nomeBonito(f.proximo.nome))} <small>${formatarInt.format(f.proximo.votos)}</small></td>
      <td class="n"><b>${formatarInt.format(f.diferenca)}</b></td>
    </tr>`,
		)
		.join("");

	const pctLegenda = cargo.totais.validos
		? (cargo.totais.legenda / cargo.totais.validos) * 100
		: 0;

	return `<article class="cartao prop">
    <header>
      <div>
        <h1>${escapar(cargo.titulo)}</h1>
        <small>${escapar(cargo.local)} · ${cargo.vagas} cadeiras</small>
      </div>
      <div class="apurado">${formatarPct.format(cargo.apurado)}% das seções</div>
    </header>
    <dl class="mini">
      <div><dt>Votos válidos</dt><dd>${formatarInt.format(cargo.totais.validos)}</dd></div>
      <div><dt>Quociente eleitoral</dt><dd>${cargo.qe ? formatarInt.format(cargo.qe) : "—"}</dd></div>
      <div><dt>Votos de legenda</dt><dd>${formatarPct.format(pctLegenda)}%</dd></div>
      <div><dt>Brancos · nulos</dt><dd>${formatarPct.format(cargo.totais.brancos)}% · ${formatarPct.format(cargo.totais.nulos)}%</dd></div>
    </dl>
    <section class="sec">
      <h2>Bancada projetada <small>cada quadrado é uma cadeira; passe o mouse para ver quem ocupa</small></h2>
      <div class="waffle" role="img" aria-label="Distribuição projetada das ${cargo.vagas} cadeiras por agremiação">${waffle}</div>
      <div class="rolagem"><table class="tab">
        <thead><tr><th>Agremiação</th><th class="n">Votos</th><th class="n oculta-mob">% válidos</th><th class="n">Quocientes</th><th class="n">Cadeiras</th><th class="n">Δ desde o início</th></tr></thead>
        <tbody>${linhasAgr}</tbody>
      </table></div>
    </section>
    <section class="sec">
      <h2>Projetados <small>posição geral · Δ desde a leitura anterior</small></h2>
      <div class="rolagem"><table class="tab">
        <thead><tr><th class="n">Pos.</th><th class="n">Δ</th><th>Candidato</th><th class="n">Votos</th><th class="n oculta-mob">%</th></tr></thead>
        <tbody>${linhasCand}</tbody>
      </table></div>
    </section>
    <section class="sec">
      <h2>Disputa interna <small>1º da fila × último que entra</small></h2>
      <div class="rolagem"><table class="tab">
        <thead><tr><th>Agremiação</th><th>Último que entra</th><th>1º da fila</th><th class="n">Diferença</th></tr></thead>
        <tbody>${linhasDisputa}</tbody>
      </table></div>
    </section>
  </article>`;
}

export function renderizarTela2(dados) {
	const cargos = dados.cargos ?? {};
	semearCores(cargos);
	const analise = dados.analise?.proporcionais ?? {};
	return `<div class="grade2">
    ${renderCargo(cargos.depfed, analise.depfed?.disputaInterna)}
    ${renderCargo(cargos.depest, analise.depest?.disputaInterna)}
  </div>`;
}
