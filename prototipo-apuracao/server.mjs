// PROTÓTIPO descartável — apuração 2026 (Presidente + Pará).
// Um único poller consulta o TSE para todos os visitantes, respeitando cache-control/429;
// o navegador só lê /api/apuracao e /api/historico deste servidor (o TSE não manda CORS).
// Rodar: node prototipo-apuracao/server.mjs  →  http://localhost:5173/?variant=A
import { createServer } from 'node:http';
import { stat, writeFile } from 'node:fs/promises';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const PORT = Number(process.env.PORT ?? 5173);
const PUBLIC = join(import.meta.dirname, 'public');
const TSE = 'https://resultados.tse.jus.br/oficial/ele2026';
// Códigos do 1º turno 2026 lidos de /oficial/comum/config/ele-c.json (6257 federal, 6259 estadual).
const CARGOS = [
  { id: 'presidente', titulo: 'Presidente', local: 'Brasil', ele: '6257', uf: 'br', cd: '0001' },
  { id: 'governador', titulo: 'Governador', local: 'Pará', ele: '6259', uf: 'pa', cd: '0003' },
  { id: 'senador', titulo: 'Senador', local: 'Pará', ele: '6259', uf: 'pa', cd: '0005' },
  { id: 'depfed', titulo: 'Deputado Federal', local: 'Pará', ele: '6259', uf: 'pa', cd: '0006' },
  { id: 'depest', titulo: 'Deputado Estadual', local: 'Pará', ele: '6259', uf: 'pa', cd: '0007' },
];
const urlTse = c => `${TSE}/${c.ele}/dados/${c.uf}/${c.uf}-c${c.cd}-e${c.ele.padStart(6, '0')}-u.json`;
const num = s => Number(String(s ?? '0').replace(',', '.')) || 0;

const estado = { versao: 0, cargos: {}, consultadoEm: null, proximaConsulta: null, erro: null };
const etags = {};

function normalizar(c, d) {
  const carg = d.carg[0];
  const vagas = Number(carg.nv) || 1;
  const proporcional = c.id.startsWith('dep');
  const agremiacoes = carg.agr.map(a => {
    const cands = a.par.flatMap(p => p.cand.map(x => ({
      n: x.n,
      nome: x.nmu,
      partido: p.sg,
      agr: a.com.replace(/\s+/g, ''),
      votos: Number(x.vap) || 0,
      pct: num(x.pvapn),
      eleito: x.e === 's',
      situacao: x.st,
      valido: x.dvt === 'Válido',
      foto: `${TSE}/${c.ele}/fotos/${c.uf}/${x.sqcand}.jpeg`,
    }))).sort((x, y) => y.votos - x.votos);
    const vag = Number(a.vag) || 0;
    // O TSE já distribui as cadeiras por agremiação (QE/QP + sobras); levam os mais votados de cada uma.
    if (proporcional) {
      const validos = cands.filter(x => x.valido);
      validos.slice(0, vag).forEach(x => { x.projetado = true; });
      validos.slice(vag, vag + 2).forEach(x => { x.fila = true; }); // próximos da fila na agremiação
    }
    const nominais = a.par.reduce((s, p) => s + (Number(p.tvtn) || 0), 0);
    const legenda = a.par.reduce((s, p) => s + (Number(p.tvtl) || 0), 0);
    return { sigla: a.com.replace(/\s+/g, ''), nome: a.nm, federacao: a.tp === 'f', nominais, legenda, votos: nominais + legenda, vagas: vag, cands };
  });
  const todos = agremiacoes.flatMap(a => a.cands).sort((x, y) => y.votos - x.votos);
  todos.forEach((x, i) => { x.pos = i + 1; });
  return {
    id: c.id, titulo: c.titulo, local: c.local, vagas,
    apurado: num(d.s?.pstn), hora: d.hg,
    qe: Number(carg.qe) || null,
    totais: {
      eleitorado: Number(d.e?.te) || 0, eleitoradoApurado: Number(d.e?.est) || 0,
      comparecimento: num(d.e?.pcn), abstencao: num(d.e?.pan),
      validos: Number(d.v?.vv) || 0, legenda: Number(d.v?.vl) || 0,
      brancos: num(d.v?.pvbn), nulos: num(d.v?.ptvnn),
    },
    // ponytail: no proporcional corta a cauda (fica top vagas+15, projetados e os 2 próximos de cada agremiação)
    candidatos: proporcional ? todos.filter((x, i) => i < vagas + 15 || x.projetado || x.fila) : todos,
    agremiacoes: proporcional ? agremiacoes.map(({ cands, ...a }) => a).sort((x, y) => y.vagas - x.vagas || y.votos - x.votos) : undefined,
  };
}

// Histórico das leituras: o TSE só entrega o retrato atual, a tendência a gente acumula.
const ARQ_HIST = join(import.meta.dirname, 'historico.PROTOTIPO-apagar.json');
const historico = existsSync(ARQ_HIST) ? JSON.parse(readFileSync(ARQ_HIST, 'utf8')) : [];
const r3 = x => Math.round(x * 1000) / 1000;
function registrar() {
  const c = {};
  for (const [id, x] of Object.entries(estado.cargos)) {
    c[id] = {
      ap: r3(x.apurado), hora: x.hora, vv: x.totais.validos,
      comp: r3(x.totais.comparecimento), bra: r3(x.totais.brancos), nul: r3(x.totais.nulos),
      c: Object.fromEntries(x.candidatos.map(k => [k.n, [k.votos, r3(k.pct), k.pos]])),
      ...(x.agremiacoes && { a: Object.fromEntries(x.agremiacoes.map(a => [a.sigla, [a.votos, a.vagas]])) }),
    };
  }
  if (historico.length && JSON.stringify(historico.at(-1).c) === JSON.stringify(c)) return;
  historico.push({ t: Date.now(), c });
  writeFile(ARQ_HIST, JSON.stringify(historico)).catch(e => console.error('histórico:', e.message));
}

// Presidente em cada UF (e no exterior), para a faixa de destaques do painel.
const UFS = {
  ac: 'Acre', al: 'Alagoas', am: 'Amazonas', ap: 'Amapá', ba: 'Bahia', ce: 'Ceará', df: 'Distrito Federal', es: 'Espírito Santo',
  go: 'Goiás', ma: 'Maranhão', mg: 'Minas Gerais', ms: 'Mato Grosso do Sul', mt: 'Mato Grosso', pa: 'Pará', pb: 'Paraíba',
  pe: 'Pernambuco', pi: 'Piauí', pr: 'Paraná', rj: 'Rio de Janeiro', rn: 'Rio Grande do Norte', ro: 'Rondônia', rr: 'Roraima',
  rs: 'Rio Grande do Sul', sc: 'Santa Catarina', se: 'Sergipe', sp: 'São Paulo', to: 'Tocantins', zz: 'Exterior',
};
estado.ufs = {};
function normalizarUf(uf, d) {
  const candidatos = d.carg[0].agr
    .flatMap(a => a.par.flatMap(p => p.cand.map(x => ({ n: x.n, nome: x.nmu, votos: Number(x.vap) || 0, pct: num(x.pvapn) }))))
    .sort((x, y) => y.votos - x.votos)
    .slice(0, 4);
  return {
    uf, nome: UFS[uf], hora: d.hg, apurado: num(d.s?.pstn),
    secoes: Number(d.s?.ts) || 0, secoesApuradas: Number(d.s?.st) || 0,
    eleitorado: Number(d.e?.te) || 0, validos: Number(d.v?.vv) || 0, candidatos,
  };
}

// Busca com ETag (304 quando nada mudou) e devolve o max-age que o TSE pede.
async function buscar(url, chave) {
  const r = await fetch(url, { headers: etags[chave] ? { 'if-none-match': etags[chave] } : {} });
  if (r.status === 429) throw Object.assign(new Error('TSE pediu calma (429)'), { espera: Number(r.headers.get('retry-after')) || 120 });
  const maxAge = Number(/max-age=(\d+)/.exec(r.headers.get('cache-control') ?? '')?.[1] ?? 60);
  if (r.status === 304) return { maxAge };
  if (!r.ok) throw new Error(`TSE respondeu ${r.status} para ${chave}`);
  etags[chave] = r.headers.get('etag');
  return { maxAge, json: await r.json() };
}

async function consultar() {
  let espera = 60;
  try {
    let mudou = false;
    for (const c of CARGOS) {
      const { maxAge, json } = await buscar(urlTse(c), c.id);
      espera = Math.max(30, maxAge);
      if (!json) continue;
      const novo = normalizar(c, json);
      const antes = estado.cargos[c.id];
      if (!antes || antes.apurado !== novo.apurado || antes.candidatos.some((x, i) => x.votos !== novo.candidatos[i]?.votos)) mudou = true;
      estado.cargos[c.id] = novo;
    }
    // 28 arquivos pequenos, em sequência; uma UF com problema não derruba o ciclo (só o 429 derruba).
    for (const uf of Object.keys(UFS)) {
      try {
        const { json } = await buscar(`${TSE}/6257/dados/${uf}/${uf}-c0001-e006257-u.json`, 'pres-' + uf);
        if (!json) continue;
        const novo = normalizarUf(uf, json), antes = estado.ufs[uf];
        if (!antes || antes.apurado !== novo.apurado || antes.candidatos[0]?.votos !== novo.candidatos[0]?.votos) mudou = true;
        estado.ufs[uf] = novo;
      } catch (e) {
        if (e.espera) throw e;
        console.error(new Date().toISOString(), uf, e.message);
      }
    }
    if (mudou) { estado.versao++; registrar(); }
    estado.erro = null;
  } catch (e) {
    estado.erro = e.message;
    espera = e.espera ?? Math.min(Math.max(espera, 60) * 2, 600);
    console.error(new Date().toISOString(), e.message);
  }
  estado.consultadoEm = Date.now();
  estado.proximaConsulta = Date.now() + espera * 1000;
  console.log(new Date().toISOString(), `versão ${estado.versao}, próxima consulta em ${espera}s`);
  setTimeout(consultar, espera * 1000);
}

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  if (pathname === '/api/historico') {
    const desde = Number(new URL(req.url, 'http://x').searchParams.get('desde')) || 0;
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    return res.end(JSON.stringify(historico.filter(p => p.t > desde)));
  }
  if (pathname === '/api/apuracao') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    return res.end(JSON.stringify(estado));
  }
  const arquivo = join(PUBLIC, normalize(pathname === '/' ? '/index.html' : decodeURIComponent(pathname)));
  if (!arquivo.startsWith(PUBLIC)) return res.writeHead(403).end();
  try {
    const { size } = await stat(arquivo);
    const tipo = TIPOS[extname(arquivo)] ?? 'application/octet-stream';
    // Safari só toca <video> se o servidor aceitar Range.
    const faixa = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
    if (faixa) {
      const ini = Number(faixa[1]) || 0, fim = faixa[2] ? Math.min(Number(faixa[2]), size - 1) : size - 1;
      res.writeHead(206, { 'content-type': tipo, 'accept-ranges': 'bytes', 'content-range': `bytes ${ini}-${fim}/${size}`, 'content-length': fim - ini + 1 });
      return createReadStream(arquivo, { start: ini, end: fim }).pipe(res);
    }
    res.writeHead(200, { 'content-type': tipo, 'accept-ranges': 'bytes', 'content-length': size });
    createReadStream(arquivo).pipe(res);
  } catch {
    res.writeHead(404).end('não achei');
  }
}).listen(PORT, () => console.log(`apuração em http://localhost:${PORT}/?variant=A`));

consultar();
