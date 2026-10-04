/**
 * Variante D (Painel) — port quase literal do protótipo.
 * Sem mascotes, confete, Three.js nem barra rosa de desenvolvimento.
 */
import complemento from "../fixtures/complemento-painel.js";

const ROTULO = { presidente: "Presidente", governador: "Governador", senador: "Senadores 1 e 2", depfed: "Dep. Federal", depest: "Dep. Estadual" };
const ORDEM = ["presidente", "governador", "senador", "depfed", "depest"];

const app = document.getElementById("app");
const nf = new Intl.NumberFormat("pt-BR");
const pf = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const cf = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const fmt = (v, t) => (t === "p" ? pf.format(v) + "%" : nf.format(Math.round(v)));
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);

let dados = null;
let versaoReal = -1;
let tela = new URLSearchParams(location.search).get("tela") === "2" ? 2 : 1;
let hist = [];
const preferirCalmo = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const graficos = new Map();
const coresD = new Map(), proxCor = new Map();
const C = (id) => dados.cargos[id];

// Valores animados: lembra o último valor de cada chave e anima do antigo pro novo.
// Se mudou desde a leitura anterior, ganha um realce discreto; com `delta`, mostra ▲/▼ quanto mudou.
const memoria = new Map();
function conta(k, v, t = 'n', delta = false) {
  const de = memoria.get(k) ?? 0;
  memoria.set(k, v);
  const mudou = de > 0 && fmt(de, t) !== fmt(v, t);
  const dif = Math.abs(v - de), num = t === 'p' ? pf.format(dif) : nf.format(Math.round(dif));
  return `<span class="conta ${mudou ? 'mudou' : ''}" data-de="${de}" data-para="${v}" data-t="${t}">${fmt(de, t)}</span>`
    + (mudou && delta ? `<small class="delta ${v > de ? 'sobe' : 'desce'}">${v > de ? '▲' : '▼'} ${num}</small>` : '');
}
function anima(k, prop, v, extra = '', un = '%') {
  const de = memoria.has(k) ? memoria.get(k) : un === '%' ? 0 : v;
  memoria.set(k, v);
  return `data-anim="${prop}" data-para="${v}${un}" style="${prop}:${de}${un};${extra}"`;
}
function ativar() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    for (const el of document.querySelectorAll('[data-anim]')) el.style[el.dataset.anim] = el.dataset.para;
  }));
  for (const el of document.querySelectorAll('.conta')) {
    const de = +el.dataset.de, para = +el.dataset.para, t = el.dataset.t, t0 = performance.now();
    if (de === para) { el.textContent = fmt(para, t); continue; }
    const passo = agora => {
      const k = Math.min(1, (agora - t0) / 1500);
      el.textContent = fmt(de + (para - de) * (1 - (1 - k) ** 3), t);
      if (k < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }
}

// ======================= D — PAINEL =======================
// Tela 1: majoritárias (Presidente, Governador, Senado). Tela 2: proporcionais (deputados).
// Paleta categórica validada do skill de dataviz; cor fixa por entidade (candidato/agremiação), nunca por posição.
function corD(ns, chave) {
  const k = ns + ':' + chave;
  if (!coresD.has(k)) {
    const i = proxCor.get(ns) ?? 0;
    proxCor.set(ns, i + 1);
    coresD.set(k, i < 8 ? `var(--s${i + 1})` : 'var(--outros)'); // 9ª+ vira "outros", nunca uma cor gerada
  }
  return coresD.get(k);
}
let semeado = false;
function semearCoresAgr() {
  if (semeado) return;
  semeado = true;
  const tot = new Map();
  for (const id of ['depfed', 'depest']) for (const a of C(id).agremiacoes) tot.set(a.sigla, (tot.get(a.sigla) ?? 0) + a.vagas * 1e9 + a.votos);
  [...tot].filter(([, v]) => v >= 1e9).sort((a, b) => b[1] - a[1]).forEach(([s]) => corD('agr', s));
}
const corAgr = s => corD('agr', s);
const nomeBonito = s => String(s).toLowerCase().replace(/(^|[\s.-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/ (Da|De|Do|Dos|Das|E) /g, w => w.toLowerCase());
// Leituras do histórico para um cargo (sem repetir leituras idênticas do TSE).
const pontos = id => hist.filter((p, i) => p.c[id] && !(hist[i + 1]?.c[id]?.hora === p.c[id].hora && hist[i + 1]?.c[id]?.ap === p.c[id].ap));
const anteriorD = id => pontos(id).at(-2)?.c[id] ?? null;
const serieCand = (id, n) => pontos(id).filter(p => p.c[id].c[n]).map(p => [p.c[id].ap, p.c[id].c[n][1], p.c[id].hora]);
const media = v => v.reduce((a, b) => a + b, 0) / v.length;
// Inclinação (regressão linear) de % de votos × % apurado nas últimas 8 leituras, em p.p. a cada 10% apurado.
function tendencia(id, n) {
  const s = serieCand(id, n).slice(-8);
  if (s.length < 3) return null;
  const mx = media(s.map(p => p[0])), my = media(s.map(p => p[1]));
  const sxx = s.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
  if (sxx < 0.25) return null;
  return s.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / sxx * 10;
}
// Votos válidos que faltam, supondo o mesmo comparecimento nas seções restantes.
function restante(c) {
  const f = c.totais.eleitoradoApurado / c.totais.eleitorado;
  return f > 0 && f < 1 ? c.totais.validos / f - c.totais.validos : null;
}
function deltaPp(v, neutro = false) {
  const r = Math.round(v * 100) / 100;
  if (!r) return '<span class="d">= 0,00</span>';
  return `<span class="d ${neutro ? '' : r > 0 ? 'sobe' : 'desce'}">${r > 0 ? '▲' : '▼'} ${pf.format(Math.abs(r))}</span>`;
}
const deltaInt = v => v ? `<span class="d ${v > 0 ? 'sobe' : 'desce'}">${v > 0 ? '▲' : '▼'} ${Math.abs(v)}</span>` : '<span class="d">=</span>';
function spark(vals, w = 72, h = 22, vivo = false) {
  if (vals.length < 2) return `<svg class="spark" width="${w}" height="${h}" aria-hidden="true"></svg>`;
  const mn = Math.min(...vals), mx = Math.max(...vals), d = mx - mn || 1;
  const pts = vals.map((v, i) => [2 + i / (vals.length - 1) * (w - 6), h - 4 - (v - mn) / d * (h - 8)]);
  const [lx, ly] = pts.at(-1);
  return `<svg class="spark" width="${w}" height="${h}" aria-hidden="true"><polyline points="${pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ')}"/>${vivo ? `<circle class="ping" cx="${lx}" cy="${ly}" r="2.5"/>` : ''}<circle cx="${lx}" cy="${ly}" r="2.5"/></svg>`;
}

function painel() {
  semearCoresAgr();
  const P = C('presidente'), G = C('governador');
  const leituras = pontos('presidente'), inicio = leituras[0] ? new Date(leituras[0].t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';
  const kpi = (rot, id, campo, valor, sub = '', neutro = true) => {
    const serie = pontos(id).map(p => p.c[id][campo]);
    const ant = serie.length > 1 ? serie.at(-2) : null;
    return `<div class="db-kpi"><span class="db-kpi-rot">${rot}</span><b class="db-kpi-val">${conta('d-kpi-' + rot, valor, 'p')}</b>
      ${campo === 'ap' ? `<div class="db-prog" style="--atraso:${rot.length % 3}s"><i ${anima('d-kpi-prog-' + rot, 'width', valor)}></i></div>` : ''}
      <span class="db-kpi-sub">${ant == null ? '' : deltaPp(valor - ant, neutro) + ' p.p. na última leitura'}${sub}</span>${spark(serie, 72, 22, true)}</div>`;
  };
  return `<div class="db">
    <header class="db-topo">
      <div class="db-marca"><b>Apuração 2026</b><span>Presidente e Pará · dados oficiais do TSE</span></div>
      <nav class="db-abas" role="tablist" aria-label="Telas do painel">
        ${[[1, 'Majoritárias', 'Presidente · Governador · Senado'], [2, 'Proporcionais', 'Deputados federais e estaduais']].map(([n, t, sub]) =>
          `<button role="tab" aria-selected="${tela === n}" data-tela="${n}"><b>${n}</b><span>${t}<small>${sub}</small></span></button>`).join('')}
      </nav>
      <div class="db-status">
        <span class="db-vivo"><i></i>Ao vivo</span>
        <span data-relogio></span>
        <span>TSE ${esc(P.hora)}</span>
        <span data-contagem></span>
        <button class="db-tema" data-tema-toggle title="Alternar tema claro/escuro" aria-label="Alternar tema claro/escuro">◐</button>
      </div>
    </header>
    <div class="db-ciclo" title="Tempo até a próxima consulta ao TSE"><i data-ciclo></i></div>
    <div class="db-ticker" aria-label="Destaques ao vivo"><b><i></i>Destaques</b>
      <div class="db-janela"><div class="db-rolo">${(t => t + t)(destaques().map(d => `<span>${d}</span>`).join(''))}</div></div></div>
    <section class="db-kpis">
      ${kpi('Seções apuradas · Brasil', 'presidente', 'ap', P.apurado)}
      ${kpi('Seções apuradas · Pará', 'governador', 'ap', G.apurado)}
      ${kpi('Comparecimento · Brasil', 'presidente', 'comp', P.totais.comparecimento, ` · abstenção ${pf.format(P.totais.abstencao)}%`)}
      ${kpi('Comparecimento · Pará', 'governador', 'comp', G.totais.comparecimento, ` · abstenção ${pf.format(G.totais.abstencao)}%`)}
      <div class="db-kpi"><span class="db-kpi-rot">Acompanhamento</span><b class="db-kpi-val">${leituras.length} leituras</b>
        <span class="db-kpi-sub">desde ${inicio} · o TSE publica a cada poucos minutos</span></div>
    </section>
    <main class="db-tela">${tela === 1 ? dbTela1() : dbTela2()}</main>
    <p class="db-rodape">Estimativas de votos a apurar, virada e 1º turno supõem que as seções ainda não apuradas têm o mesmo comparecimento das já apuradas. Como a ordem de chegada das urnas não é aleatória, use-as como referência, não como previsão. Nas proporcionais, a distribuição de cadeiras é a calculada pelo TSE com os votos de agora.</p>
  </div>`;
}

const dbTela1 = () => `<div class="db-grade3">${['presidente', 'governador', 'senador'].map(dbMaj).join('')}</div>`;
function dbMaj(id) {
  const c = C(id), [a, b, d3] = c.candidatos, duas = c.vagas === 2;
  const noGrafico = c.candidatos.slice(0, duas ? 4 : 2);
  noGrafico.forEach(x => corD(id, x.n));
  const ant = anteriorD(id);
  const linhas = c.candidatos.slice(0, duas ? 6 : 5).map(x => {
    const corX = noGrafico.includes(x) ? corD(id, x.n) : 'var(--outros)';
    const pa = ant?.c[x.n]?.[1];
    return `<li class="db-cand" data-flip="${id}-${x.n}" style="--atraso:${(c.candidatos.indexOf(x) * 0.35).toFixed(2)}s">
      <span class="db-sw" style="background:${corX}"></span>
      <span class="db-nome"><b>${esc(nomeBonito(x.nome))}</b><small>${esc(x.partido)} · ${conta(`d-${id}-${x.n}-v`, x.votos)} votos</small></span>
      <span class="db-barra" aria-hidden="true"><i ${anima(`d-${id}-${x.n}-b`, 'width', x.pct, `background:${corX}`)}></i>${duas ? '' : '<em></em>'}</span>
      <span class="db-pct">${conta(`d-${id}-${x.n}-p`, x.pct, 'p')}</span>
      <span class="db-delta">${pa == null ? '' : deltaPp(x.pct - pa)}</span>
    </li>`;
  }).join('');
  graficos.set(id, {
    rotulo: `Evolução do percentual de votos válidos de ${c.titulo}`,
    ref: duas ? null : 50,
    series: noGrafico.map(x => ({ nome: nomeBonito(x.nome), cor: corD(id, x.n), pts: serieCand(id, x.n) })),
  });
  const manchete = duas
    ? `<b class="db-heroi menor">${esc(nomeBonito(a.nome))} e ${esc(nomeBonito(b.nome))}</b><span>ocupam as 2 vagas · 3º lugar a ${pf.format(b.pct - d3.pct)} p.p. da 2ª vaga</span>`
    : `<b class="db-heroi ${id === 'presidente' ? '' : 'menor'}">${conta(`d-${id}-heroi`, a.pct, 'p')}</b><span>${esc(nomeBonito(a.nome))} lidera, ${pf.format(a.pct - b.pct)} p.p. à frente de ${esc(nomeBonito(b.nome))}</span>`;
  return `<article class="db-card">
    <header class="db-card-topo">
      <div><h2>${esc(c.titulo)}${duas ? 'es' : ''}</h2><span>${esc(c.local)} · ${duas ? '2 vagas' : '1 vaga'}</span></div>
      <div class="db-apu">${conta(`d-${id}-ap`, c.apurado, 'p')}<small>das seções apuradas</small></div>
    </header>
    <div class="db-manchete">${manchete}</div>
    <ol class="db-cands">${linhas}</ol>
    <figure class="db-fig">
      <figcaption><span>% dos votos válidos conforme as seções são apuradas</span>
        <span class="db-leg">${noGrafico.map(x => `<span><i class="db-sw" style="background:${corD(id, x.n)}"></i>${esc(nomeBonito(x.nome))}</span>`).join('')}</span></figcaption>
      <div class="db-graf" data-graf="${id}"></div>
    </figure>
    ${dbAnalise(c)}
  </article>`;
}
function dbAnalise(c) {
  const id = c.id, [a, b, d3] = c.candidatos, duas = c.vagas === 2;
  const [def, per] = duas ? [b, d3] : [a, b]; // quem defende a vaga × quem persegue
  const L = def.votos - per.votos, R = restante(c);
  const margens = pontos(id).map(p => (p.c[id].c[def.n]?.[1] ?? NaN) - (p.c[id].c[per.n]?.[1] ?? NaN)).filter(v => !Number.isNaN(v));
  const nm = x => esc(nomeBonito(x.nome));
  const itens = [[duas ? 'Disputa pela 2ª vaga' : 'Vantagem do líder', `${nf.format(L)} votos · ${pf.format(def.pct - per.pct)} p.p. ${spark(margens, 56, 18)}`, `${nm(def)} sobre ${nm(per)}`]];
  if (R) {
    itens.push(['Válidos a apurar (est.)', `≈ ${cf.format(R)}`, `${pf.format(100 - c.apurado)}% das seções ainda faltam`]);
    const pp = L / R * 100;
    itens.push([duas ? 'Para tomar a 2ª vaga' : 'Para virar', pp > 100 ? 'fora de alcance' : `+${pf.format(pp)} p.p.`, `${nm(per)} precisa superar ${nm(def)} por essa margem no que falta`]);
    if (!duas) {
      const s = (0.5 * (c.totais.validos + R) - a.votos) / R * 100;
      itens.push(['Vencer no 1º turno', s <= 0 ? 'já tem a maioria (est.)' : s > 100 ? 'fora de alcance (est.)' : `${pf.format(s)}% do que falta`, `${nm(a)} tem ${pf.format(a.pct)}% dos válidos até agora`]);
    }
  }
  const tend = c.candidatos.slice(0, duas ? 4 : 2).map(x => [x, tendencia(id, x.n)]).filter(([, t]) => t != null);
  itens.push(['Tendência recente', tend.length ? tend.map(([x, t]) => `<span class="db-tend">${nm(x)} ${deltaPp(t)}</span>`).join('') : '<span class="db-vazio">aguardando mais leituras</span>',
    tend.length ? 'p.p. a cada 10% de seções, nas últimas leituras' : 'aparece a partir da 3ª leitura com avanço na apuração']);
  return `<dl class="db-analise">${itens.map(([r, v, sub]) => `<div><dt>${r}</dt><dd>${v}</dd>${sub ? `<dd class="db-sub">${sub}</dd>` : ''}</div>`).join('')}</dl>`;
}

// Disputa interna: o primeiro da fila de cada agremiação contra o último que entra.
function filaInterna(c) {
  const proj = c.candidatos.filter(x => x.projetado);
  return c.agremiacoes.filter(a => a.vagas > 0).map(a => {
    const ultimo = proj.filter(x => x.agr === a.sigla).sort((x, y) => y.votos - x.votos).at(-1);
    const prox = c.candidatos.filter(x => x.agr === a.sigla && !x.projetado && x.valido).sort((x, y) => y.votos - x.votos)[0];
    return ultimo && prox ? { a, ultimo, prox, gap: ultimo.votos - prox.votos } : null;
  }).filter(Boolean).sort((p, q) => p.gap - q.gap);
}
// Faixa de destaques: Brasil (foco em Presidente) intercalado com o Pará, 2 pra 1, recalculada a cada leitura.
function destaques() {
  const br = destaquesBrasil(), pa = destaquesPara(), out = [];
  while (br.length || pa.length) {
    out.push(...br.splice(0, 2));
    if (pa.length) out.push(pa.shift());
  }
  return out;
}
const REGIOES = {
  Norte: ['ac', 'am', 'ap', 'pa', 'ro', 'rr', 'to'], Nordeste: ['al', 'ba', 'ce', 'ma', 'pb', 'pe', 'pi', 'rn', 'se'],
  'Centro-Oeste': ['df', 'go', 'ms', 'mt'], Sudeste: ['es', 'mg', 'rj', 'sp'], Sul: ['pr', 'rs', 'sc'],
};
function destaquesBrasil() {
  const ufs = dados.ufs ?? {}, [a, b] = C('presidente').candidatos, out = [];
  const lista = Object.values(ufs).filter(u => u.uf !== 'zz' && u.candidatos.length > 1);
  if (!lista.length) return out;
  const nm = x => esc(nomeBonito(x.nome));
  const duelo = (rot, u) => {
    const [l, s2] = [...u.candidatos].sort((p, q) => q.votos - p.votos);
    return `<b>${rot}</b>${nm(l)} ${pf.format(l.pct)}% × ${nm(s2)} ${pf.format(s2.pct)}% · ${pf.format(u.apurado)}% das seções`;
  };
  const dif = u => u.candidatos[0].pct - u.candidatos[1].pct;
  const lideres = new Map();
  for (const u of lista) lideres.set(u.candidatos[0].nome, (lideres.get(u.candidatos[0].nome) ?? 0) + 1);
  out.push(`<b>Presidente · placar dos estados</b>${[...lideres].sort((p, q) => q[1] - p[1]).map(([n, k]) => `${esc(nomeBonito(n))} lidera em ${k} UF${k > 1 ? 's' : ''}`).join(', ')}`);
  for (const [reg, siglas] of Object.entries(REGIOES)) {
    const us = siglas.map(sg => ufs[sg]).filter(Boolean), vv = us.reduce((t, u) => t + u.validos, 0);
    if (!vv) continue;
    const votos = n => us.reduce((t, u) => t + (u.candidatos.find(x => x.n === n)?.votos ?? 0), 0);
    const secoes = us.reduce((t, u) => t + u.secoes, 0), apuradas = us.reduce((t, u) => t + u.secoesApuradas, 0);
    out.push(duelo(`Presidente · ${reg}`, { apurado: apuradas / secoes * 100, candidatos: [a, b].map(x => ({ nome: x.nome, votos: votos(x.n), pct: votos(x.n) / vv * 100 })) }));
  }
  [...lista].sort((p, q) => q.eleitorado - p.eleitorado).slice(0, 8).forEach(u => out.push(duelo(`Presidente · ${u.nome}`, u)));
  const comAvanco = lista.filter(u => u.apurado >= 5).sort((p, q) => dif(p) - dif(q));
  if (comAvanco.length) {
    const ap = comAvanco[0], fo = comAvanco.at(-1);
    out.push(`<b>Presidente · disputa mais apertada</b>${ap.nome}: ${nm(ap.candidatos[0])} ${pf.format(ap.candidatos[0].pct)}% × ${nm(ap.candidatos[1])} ${pf.format(ap.candidatos[1].pct)}%, ${pf.format(dif(ap))} p.p.`);
    out.push(`<b>Presidente · maior vantagem</b>${fo.nome}: ${nm(fo.candidatos[0])} com ${pf.format(fo.candidatos[0].pct)}%, ${pf.format(dif(fo))} p.p. à frente`);
  }
  const ritmo = [...lista].sort((p, q) => q.apurado - p.apurado);
  out.push(`<b>Apuração por estado</b>mais adiantado: ${ritmo[0].nome} ${pf.format(ritmo[0].apurado)}% · mais atrasado: ${ritmo.at(-1).nome} ${pf.format(ritmo.at(-1).apurado)}%`);
  if (ufs.zz?.candidatos.length > 1) out.push(duelo('Presidente · Exterior', ufs.zz));
  return out;
}
function destaquesPara() {
  const nm = x => esc(nomeBonito(x.nome)), out = [];
  const P = C('presidente'), G = C('governador');
  out.push(`<b>Apuração</b>Brasil ${pf.format(P.apurado)}% · Pará ${pf.format(G.apurado)}% das seções`);
  for (const id of ['presidente', 'governador']) {
    const c = C(id), [a, b] = c.candidatos, ant = anteriorD(id);
    const m = a.pct - b.pct, mAnt = ant?.c[a.n] && ant?.c[b.n] ? ant.c[a.n][1] - ant.c[b.n][1] : null;
    out.push(`<b>${c.titulo} · ${c.local}</b>${nm(a)} lidera com ${pf.format(a.pct)}%, ${pf.format(m)} p.p. à frente de ${nm(b)}`
      + (mAnt == null || Math.abs(m - mAnt) < 0.005 ? '' : ` · vantagem ${m > mAnt ? 'subiu' : 'caiu'} ${pf.format(Math.abs(m - mAnt))} p.p. na última leitura`));
  }
  const S = C('senador'), [, s2, s3] = S.candidatos;
  out.push(`<b>Senado · Pará</b>2ª vaga: ${nm(s2)} ${pf.format(s2.pct)}% × ${nm(s3)} ${pf.format(s3.pct)}%, diferença de ${nf.format(s2.votos - s3.votos)} votos`);
  for (const id of ['depfed', 'depest']) {
    const c = C(id), ini = pontos(id)[0]?.c[id], rot = id === 'depfed' ? 'Dep. Federal' : 'Dep. Estadual';
    for (const a of c.agremiacoes) {
      const dv = ini?.a?.[a.sigla] ? a.vagas - ini.a[a.sigla][1] : 0;
      if (dv) out.push(`<b>${rot}</b>${esc(a.sigla)} ${dv > 0 ? 'ganhou' : 'perdeu'} ${Math.abs(dv)} cadeira${Math.abs(dv) > 1 ? 's' : ''} desde o início do acompanhamento`);
    }
    const f = filaInterna(c)[0];
    if (f) out.push(`<b>${rot}</b>disputa interna mais apertada: ${esc(f.a.sigla)}, ${nm(f.ultimo)} × ${nm(f.prox)}, ${nf.format(f.gap)} votos`);
  }
  out.push(`<b>Comparecimento</b>Brasil ${pf.format(P.totais.comparecimento)}% · Pará ${pf.format(G.totais.comparecimento)}%`);
  return out;
}
const dbTela2 = () => `<div class="db-grade2">${['depfed', 'depest'].map(dbProp).join('')}</div>`;
function dbProp(id) {
  const c = C(id), ag = c.agremiacoes, ps = pontos(id), ant = anteriorD(id), ini = ps[0]?.c[id];
  const proj = c.candidatos.filter(x => x.projetado).sort((x, y) => y.votos - x.votos);
  const cadeiras = ag.filter(a => a.vagas > 0).flatMap(a => proj.filter(x => x.agr === a.sigla));
  const waffle = cadeiras.map((x, i) => `<span class="db-seat" title="${esc(x.agr)} · ${esc(nomeBonito(x.nome))} · ${nf.format(x.votos)} votos"
    ${anima(`d-${id}-seat-${i}`, 'background', corAgr(x.agr), `--i:${i}`, '')}></span>`).join('');
  const linhasAgr = ag.filter(a => a.vagas > 0 || (c.qe && a.votos >= c.qe * 0.5)).map(a => {
    const dv = ini?.a?.[a.sigla] ? a.vagas - ini.a[a.sigla][1] : null;
    return `<tr data-flip="${id}-agr-${a.sigla}">
      <td><span class="db-sw" style="background:${a.vagas ? corAgr(a.sigla) : coresD.get('agr:' + a.sigla) ?? 'var(--outros)'}"></span>${esc(a.sigla)}${a.federacao ? ' <small>federação</small>' : ''}</td>
      <td class="n">${conta(`d-${id}-agr-${a.sigla}-v`, a.votos)}</td>
      <td class="n db-oculta-mob">${pf.format(a.votos / c.totais.validos * 100)}%</td>
      <td class="n">${c.qe ? pf.format(a.votos / c.qe) : '—'}</td>
      <td class="n"><b>${conta(`d-${id}-agr-${a.sigla}-c`, a.vagas)}</b></td>
      <td class="n">${dv == null ? '' : deltaInt(dv)}</td>
    </tr>`;
  }).join('');
  const linhasCand = proj.map(x => {
    const pa = ant?.c[x.n]?.[2];
    const serie = ps.map(p => p.c[id].c[x.n]?.[1]).filter(v => v != null);
    return `<tr data-flip="${id}-${x.n}">
      <td class="n">${x.pos}º</td>
      <td class="n">${pa == null ? (ant ? '<span class="d">novo</span>' : '') : deltaInt(pa - x.pos)}</td>
      <td><span class="db-sw" style="background:${corAgr(x.agr)}"></span><b>${esc(nomeBonito(x.nome))}</b> <small>${esc(x.partido)}</small>${x.eleito ? ' <span class="db-ok">✓ eleito</span>' : ''}</td>
      <td class="n">${conta(`d-${id}-${x.n}-v`, x.votos)}</td>
      <td class="n db-oculta-mob">${pf.format(x.pct)}%</td>
      <td class="db-oculta-mob">${spark(serie, 64, 18)}</td>
    </tr>`;
  }).join('');
  const fila = filaInterna(c);
  const nm = x => esc(nomeBonito(x.nome));
  return `<article class="db-card">
    <header class="db-card-topo">
      <div><h2>${esc(c.titulo)}</h2><span>${esc(c.local)} · ${c.vagas} cadeiras</span></div>
      <div class="db-apu">${conta(`d-${id}-ap`, c.apurado, 'p')}<small>das seções apuradas</small></div>
    </header>
    <dl class="db-mini">
      <div><dt>Votos válidos</dt><dd>${conta(`d-${id}-vv`, c.totais.validos)}</dd></div>
      <div><dt>Quociente eleitoral</dt><dd>${c.qe ? conta(`d-${id}-qe`, c.qe) : '—'}</dd></div>
      <div><dt>Votos de legenda</dt><dd>${pf.format(c.totais.legenda / c.totais.validos * 100)}%</dd></div>
      <div><dt>Brancos · nulos</dt><dd>${pf.format(c.totais.brancos)}% · ${pf.format(c.totais.nulos)}%</dd></div>
    </dl>
    <section class="db-sec">
      <h3>Bancada projetada <small>cada quadrado é uma cadeira; passe o mouse para ver quem ocupa</small></h3>
      <div class="db-waffle" role="img" aria-label="Distribuição projetada das ${c.vagas} cadeiras por agremiação">${waffle}</div>
      <div class="db-rolagem"><table class="db-tab">
        <thead><tr><th>Agremiação</th><th class="n">Votos</th><th class="n db-oculta-mob">% válidos</th><th class="n" title="Votos da agremiação divididos pelo quociente eleitoral">Quocientes</th><th class="n">Cadeiras</th><th class="n" title="Variação desde a primeira leitura do acompanhamento">Δ desde o início</th></tr></thead>
        <tbody>${linhasAgr}</tbody>
      </table></div>
    </section>
    <section class="db-sec">
      <h3>Projetados para as ${c.vagas} cadeiras <small>posição geral por votos · Δ desde a leitura anterior</small></h3>
      <div class="db-rolagem"><table class="db-tab">
        <thead><tr><th class="n">Pos.</th><th class="n">Δ</th><th>Candidato</th><th class="n">Votos</th><th class="n db-oculta-mob">%</th><th class="db-oculta-mob">Evolução do %</th></tr></thead>
        <tbody>${linhasCand}</tbody>
      </table></div>
    </section>
    <section class="db-sec">
      <h3>Disputa interna <small>1º da fila × último que entra, na mesma agremiação</small></h3>
      <div class="db-rolagem"><table class="db-tab">
        <thead><tr><th>Agremiação</th><th>Último que entra</th><th>1º da fila</th><th class="n">Diferença</th></tr></thead>
        <tbody>${fila.map(f => `<tr data-flip="${id}-fila-${f.a.sigla}">
          <td><span class="db-sw" style="background:${corAgr(f.a.sigla)}"></span>${esc(f.a.sigla)}</td>
          <td>${nm(f.ultimo)} <small>${nf.format(f.ultimo.votos)}</small></td>
          <td>${nm(f.prox)} <small>${nf.format(f.prox.votos)}</small></td>
          <td class="n"><b>${conta(`d-${id}-fila-${f.a.sigla}`, f.gap)}</b></td></tr>`).join('')}</tbody>
      </table></div>
    </section>
  </article>`;
}

// ---------- gráfico de linhas (SVG à mão), desenhado na largura real do container ----------
const passoBonito = raw => [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50].find(x => x >= raw) ?? 100;
const faixa = (a, b, p) => { const r = []; for (let v = a; v <= b + 1e-9; v += p) r.push(+v.toFixed(6)); return r; };
const fmtTick = (v, p) => v.toFixed(p >= 1 ? 0 : Number.isInteger(+(p * 10).toFixed(6)) ? 1 : 2).replace('.', ',');
function svgLinhas(id, cfg, W, animar) {
  const H = 210, m = { t: 14, r: 58, b: 26, l: 38 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
  const series = cfg.series.filter(s => s.pts.length);
  const xs = [...new Set(series.flatMap(s => s.pts.map(p => p[0])))].sort((p, q) => p - q);
  if (!xs.length || pw < 80) return '';
  let x0 = xs[0], x1 = xs.at(-1);
  if (x1 - x0 < 0.5) { x0 -= 1; x1 += 1; } else x1 += (x1 - x0) * 0.03;
  const ys = series.flatMap(s => s.pts.map(p => p[1]));
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (cfg.ref != null && cfg.ref > y0 - 8 && cfg.ref < y1 + 8) { y0 = Math.min(y0, cfg.ref); y1 = Math.max(y1, cfg.ref); }
  const folga = Math.max(0.4, (y1 - y0) * 0.12);
  const py = passoBonito((y1 - y0 + 2 * folga) / 4);
  y0 = Math.floor((y0 - folga) / py) * py; y1 = Math.ceil((y1 + folga) / py) * py;
  const px = passoBonito((x1 - x0) / Math.max(2, Math.floor(pw / 90)));
  const X = v => m.l + (v - x0) / (x1 - x0) * pw, Y = v => m.t + (1 - (v - y0) / (y1 - y0)) * ph;
  cfg.escala = { X, x0, x1, m, pw, xs };
  const grade = faixa(y0, y1, py).map(v => `<line class="g" x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}"/><text class="t" x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end">${fmtTick(v, py)}</text>`).join('')
    + faixa(Math.ceil(x0 / px) * px, x1, px).map(v => `<text class="t" x="${X(v)}" y="${H - 7}" text-anchor="middle">${fmtTick(v, px)}%</text>`).join('');
  const ref = cfg.ref != null && cfg.ref >= y0 && cfg.ref <= y1
    ? `<line class="ref" x1="${m.l}" x2="${W - m.r}" y1="${Y(cfg.ref)}" y2="${Y(cfg.ref)}"/><text class="t" x="${m.l + 6}" y="${Y(cfg.ref) + 14}">maioria absoluta (${cfg.ref}%)</text>` : '';
  // Rótulo de ponta = só o valor; se dois colidem, o de baixo desce com uma linha-guia.
  const pontas = series.map(s => { const p = s.pts.at(-1); return { s, x: X(p[0]), y: Y(p[1]), v: p[1] }; }).sort((p, q) => p.y - q.y);
  let ult = -Infinity;
  for (const p of pontas) { p.ly = Math.max(p.y, ult + 15); ult = p.ly; }
  const linhas = series.map(s => `<path class="l" stroke="${s.cor}" d="${s.pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('')}"/>`).join('');
  const marcas = pontas.map(p => `<circle class="ping" cx="${p.x}" cy="${p.y}" r="4" fill="${p.s.cor}"/><circle class="pt" cx="${p.x}" cy="${p.y}" r="4" fill="${p.s.cor}"/>`
    + (p.ly - p.y > 2 ? `<line class="guia" x1="${p.x + 5}" y1="${p.y}" x2="${p.x + 10}" y2="${p.ly - 4}"/>` : '')
    + `<text class="v" x="${p.x + 10}" y="${p.ly + 4}">${pf.format(p.v)}%</text>`).join('');
  // Revelação suave do trecho novo: o clip começa onde estava a última leitura e corre até o fim.
  const chave = 'graf-' + id, apAnt = memoria.get(chave);
  const de = !animar ? W : apAnt == null ? m.l : Math.min(W, X(apAnt) + 1);
  memoria.set(chave, xs.at(-1));
  return `<svg width="${W}" height="${H}" role="img" aria-label="${esc(cfg.rotulo)}">
    <defs><clipPath id="cl-${id}"><rect x="0" y="0" height="${H}" width="${de}" data-tw="width" data-para="${W}"/></clipPath></defs>
    ${grade}<line class="eixo" x1="${m.l}" x2="${W - m.r}" y1="${m.t + ph}" y2="${m.t + ph}"/>${ref}
    <g clip-path="url(#cl-${id})">${linhas}${marcas}</g>
    <line class="mira" x1="-10" x2="-10" y1="${m.t}" y2="${m.t + ph}"/>
    <rect class="hit" x="${m.l}" y="${m.t}" width="${pw}" height="${ph}"/>
  </svg>${xs.length < 2 ? '<p class="db-vazio">A linha aparece a partir da 2ª leitura do TSE.</p>' : ''}<div class="db-tip" hidden></div>`;
}
function ligarHover(el, cfg) {
  const svg = el.querySelector('svg');
  if (!svg || !cfg.escala) return;
  const tip = el.querySelector('.db-tip'), mira = svg.querySelector('.mira'), hit = svg.querySelector('.hit');
  const { X, x0, x1, m, pw, xs } = cfg.escala;
  hit.addEventListener('pointermove', e => {
    const r = svg.getBoundingClientRect(), xv = x0 + (e.clientX - r.left - m.l) / pw * (x1 - x0);
    const ap = xs.reduce((p, q) => Math.abs(q - xv) < Math.abs(p - xv) ? q : p);
    const px = X(ap);
    mira.setAttribute('x1', px); mira.setAttribute('x2', px); mira.classList.add('on');
    const vals = cfg.series.map(s => [s, s.pts.findLast(p => p[0] === ap)]).filter(([, p]) => p).sort((p, q) => q[1][1] - p[1][1]);
    tip.innerHTML = `<b>${pf.format(ap)}% apurado${vals[0]?.[1][2] ? ' · ' + esc(vals[0][1][2]) : ''}</b>`
      + vals.map(([s, p]) => `<div><i style="background:${s.cor}"></i>${esc(s.nome)}<span>${pf.format(p[1])}%</span></div>`).join('');
    tip.hidden = false;
    tip.style.left = Math.max(0, Math.min(px + 12, r.width - tip.offsetWidth)) + 'px';
    tip.style.top = m.t + 'px';
  });
  hit.addEventListener('pointerleave', () => { tip.hidden = true; mira.classList.remove('on'); });
}
function pintarGraficos(animar) {
  for (const el of document.querySelectorAll('[data-graf]')) {
    const cfg = graficos.get(el.dataset.graf);
    if (!cfg) continue;
    el.innerHTML = svgLinhas(el.dataset.graf, cfg, el.clientWidth, animar && !preferirCalmo());
    ligarHover(el, cfg);
    for (const r of el.querySelectorAll('[data-tw]')) {
      const attr = r.dataset.tw, de = +r.getAttribute(attr), para = +r.dataset.para, t0 = performance.now();
      if (de === para) continue;
      const passo = agora => {
        const k = Math.min(1, (agora - t0) / 1100);
        r.setAttribute(attr, de + (para - de) * (1 - (1 - k) ** 3));
        if (k < 1) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    }
  }
}
let redim;
addEventListener('resize', () => { clearTimeout(redim); redim = setTimeout(() => pintarGraficos(false), 150); });

// FLIP: linhas que trocam de posição deslizam do lugar antigo pro novo; linhas novas entram com fade.
function capturar() {
  const m = new Map();
  for (const el of document.querySelectorAll('[data-flip]')) m.set(el.dataset.flip, el.getBoundingClientRect().top);
  return m;
}
function flip(antes) {
  if (preferirCalmo() || !antes.size) return;
  for (const el of document.querySelectorAll('[data-flip]')) {
    const y0 = antes.get(el.dataset.flip);
    if (y0 == null) { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, easing: 'ease-out' }); continue; }
    const dy = y0 - el.getBoundingClientRect().top;
    if (Math.abs(dy) > 1) el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
}
function entrada() {
  if (preferirCalmo()) return;
  document.querySelectorAll('.db-kpi, .db-card').forEach((el, i) => el.animate(
    [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
    { duration: 500, delay: i * 60, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
}
async function trocarTela(n) {
  if (n === tela) return;
  const atual = document.querySelector('.db-tela'), dir = n > tela ? 1 : -1;
  if (atual && !preferirCalmo()) await atual.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-24 * dir}px)` }], { duration: 180, easing: 'ease-in', fill: 'forwards' }).finished;
  tela = n;
  desenhar('tela');
  const nova = document.querySelector('.db-tela');
  if (nova && !preferirCalmo()) nova.animate([{ opacity: 0, transform: `translateX(${24 * dir}px)` }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
  syncUrlTela();
}

function syncUrlTela() {
  const u = new URL(location.href);
  if (tela === 2) u.searchParams.set("tela", "2");
  else u.searchParams.delete("tela");
  history.replaceState(null, "", u);
}


function mesclarApi(api) {
  const cargos = { ...complemento.cargos, ...(api.cargos || {}) };
  // Presidente da API sobrescreve; demais vêm do fixture até #4/#6.
  if (api.cargos?.presidente) cargos.presidente = api.cargos.presidente;
  return {
    ...api,
    cargos,
    ufs: api.ufs && Object.keys(api.ufs).length ? api.ufs : complemento.ufs,
  };
}

function garantirHist() {
  if (hist.some((p) => p.sim)) return;
  const base = complemento.historico.map((p) => ({ ...p, sim: true }));
  const vivos = hist.filter((p) => p.vivoApi);
  hist = base.concat(vivos);
}

function atualizarHistComPresidente() {
  garantirHist();
  const P = dados.cargos.presidente;
  if (!P) return;
  const ultima = hist.at(-1);
  const chave = { ap: P.apurado, hora: P.hora };
  if (ultima?.c?.presidente?.hora === chave.hora && Math.abs((ultima.c.presidente.ap ?? 0) - chave.ap) < 1e-9) return;
  const cands = {};
  for (const x of P.candidatos.slice(0, 8)) cands[x.n] = [x.votos, x.pct, x.pos];
  hist = hist.filter((p) => !p.vivoApi).concat([{
    t: Date.now(),
    vivoApi: true,
    c: {
      ...Object.fromEntries(ORDEM.map((id) => {
        const cargo = dados.cargos[id];
        if (!cargo) return [id, ultima?.c?.[id]];
        if (id === "presidente") {
          return [id, {
            ap: P.apurado, hora: P.hora, vv: P.totais?.validos ?? 0,
            comp: P.totais?.comparecimento ?? 0, bra: P.totais?.brancos ?? 0, nul: P.totais?.nulos ?? 0,
            c: cands,
          }];
        }
        // keep fixture series for other cargos
        return [id, ultima?.c?.[id] ?? hist.at(-1)?.c?.[id]];
      })),
    },
  }]);
}

function festa(antes, depois) {
  const viradas = ["presidente", "governador", "senador"].filter((id) => {
    const k = id === "senador" ? 2 : 1;
    const topo = (d) => d.cargos[id]?.candidatos.slice(0, k).map((x) => x.n).sort().join();
    return topo(antes) && topo(antes) !== topo(depois);
  });
  const ap = (d, id) => pf.format(d.cargos[id].apurado) + "%";
  const resumo = `Atualizado às ${depois.cargos.presidente.hora} · Brasil ${ap(antes, "presidente")} → ${ap(depois, "presidente")} · Pará ${ap(antes, "governador")} → ${ap(depois, "governador")}`;
  aviso(viradas.length ? `${resumo} · mudou a liderança em ${viradas.map((id) => ROTULO[id]).join(", ")}` : resumo);
}

function aviso(texto) {
  const el = document.getElementById("aviso");
  if (!el) return;
  el.innerHTML = `<i></i>${esc(texto)}`;
  el.classList.add("on");
  clearTimeout(aviso.t);
  aviso.t = setTimeout(() => el.classList.remove("on"), 6000);
}

function tique() {
  const s = dados?.proximaConsulta ? Math.max(0, Math.round((dados.proximaConsulta - Date.now()) / 1000)) : null;
  for (const el of document.querySelectorAll("[data-contagem]")) {
    el.textContent = s === null ? "consultando o TSE…" : s ? `próxima consulta ao TSE em ${s}s` : "consultando o TSE…";
  }
  for (const el of document.querySelectorAll("[data-relogio]")) {
    el.textContent = new Date().toLocaleTimeString("pt-BR");
  }
  const [a, b] = [dados?.consultadoEm, dados?.proximaConsulta];
  for (const el of document.querySelectorAll("[data-ciclo]")) {
    el.style.width = a && b > a ? Math.min(100, ((Date.now() - a) / (b - a)) * 100) + "%" : "0%";
  }
}

function desenhar(modo = "atualiza") {
  garantirHist();
  const pronto = dados && ORDEM.every((id) => dados.cargos?.[id]);
  const antes = modo === "atualiza" ? capturar() : new Map();
  graficos.clear();
  app.innerHTML = pronto
    ? painel()
    : `<div class="db"><p class="db-vazio" style="padding:48px 16px">Contando votos… ${dados?.erro ? esc(dados.erro) : "Primeira consulta ao TSE em andamento."}</p></div>`;
  ativar();
  if (pronto) {
    pintarGraficos(true);
    flip(antes);
    if (modo === "entrada") entrada();
    const rolo = document.querySelector(".db-rolo");
    if (rolo) {
      const dur = Math.max(30, rolo.scrollWidth / 2 / 55);
      rolo.style.animationDuration = dur + "s";
      rolo.style.animationDelay = -((performance.now() / 1000) % dur) + "s";
    }
  }
  tique();
}

async function puxar() {
  try {
    const novo = await (await fetch("/api/apuracao", { cache: "no-store" })).json();
    const mesclado = mesclarApi(novo);
    const mudou = novo.versao !== versaoReal;
    if (!mudou && dados) {
      Object.assign(dados, { proximaConsulta: novo.proximaConsulta, consultadoEm: novo.consultadoEm, erro: novo.erro });
      return;
    }
    const anterior = dados;
    dados = mesclado;
    versaoReal = novo.versao;
    atualizarHistComPresidente();
    desenhar(anterior?.cargos?.presidente ? "atualiza" : "entrada");
    if (mudou && anterior?.cargos?.presidente && mesclado.cargos?.presidente) festa(anterior, mesclado);
  } catch (e) {
    if (!dados) {
      dados = mesclarApi({ versao: 0, consultadoEm: Date.now(), proximaConsulta: Date.now() + 60000, erro: String(e.message || e), cargos: {} });
      garantirHist();
      desenhar("entrada");
    }
  }
}

export function iniciarPainel() {
  try {
    const t = localStorage.getItem("tema") ?? "";
    // Protótipo: '' = escuro, 'claro' = claro (aceita legado 'escuro').
    document.body.dataset.tema = t === "claro" ? "claro" : "";
  } catch {}
  app.addEventListener("click", (e) => {
    const aba = e.target.closest("[data-tela]");
    if (aba) trocarTela(+aba.dataset.tela);
    if (e.target.closest("[data-tema-toggle]")) {
      document.body.dataset.tema = document.body.dataset.tema === "claro" ? "" : "claro";
      try {
        localStorage.setItem("tema", document.body.dataset.tema);
      } catch {}
    }
  });
  addEventListener("keydown", (e) => {
    if (e.key === "1") trocarTela(1);
    if (e.key === "2") trocarTela(2);
  });
  syncUrlTela();
  puxar();
  setInterval(puxar, 5000);
  setInterval(tique, 1000);
}
