/**
 * PROTOTYPE — modo arcade do 2º turno. ?variant=v2 (padrão)|a|b|c|ia · ?motion=reduced · DADOS DE EXEMPLO.
 * Os números vêm do mesmo gerador do protótipo aprovado (painel/js/mock-2t.js); o simulador anda
 * por um roteiro fixo de leituras (ROTEIRO) que passa pelas 3 viradas do exemplo e termina em 100%.
 */
import { gerar } from "../painel/js/mock-2t.js";
import { CORES, criarPalco } from "./palco.js";
import { carregarFoto, FOTOS, pintarEm, pixelar } from "./rosto.js";
import { alternarSom, configurarSom, efeito, voz } from "./som.js";

const VARIANTES = {
	v2: { nome: "luta 2.5D de IA", detalhe: "three.js: câmera, faíscas, câmera lenta e K.O. · sátira" },
	a: { nome: "16-bit", detalhe: "lutadores em pixel art, cenário noturno" },
	b: { nome: "HUD sobre o painel", detalhe: "camada arcade liga/desliga sobre o painel sério" },
	c: { nome: "neon minimalista", detalhe: "rostos, barras e placar em neon" },
	ia: { nome: "imagens de IA", detalhe: "sátira com as imagens geradas por IA, sem retoque" },
};
const CHAVES = Object.keys(VARIANTES);
const qs = new URLSearchParams(location.search);
const variante = VARIANTES[qs.get("variant")] ? qs.get("variant") : "v2";
const v2 = variante === "v2";
// v2 usa as mesmas imagens de IA (e o mesmo selo) da variante ia para retratos, tela VS e vitória
const ia = variante === "ia" || v2 ? await import("./ia.js") : null;
const reduzido = qs.get("motion") === "reduced" || (qs.get("motion") !== "full" && matchMedia("(prefers-reduced-motion: reduce)").matches);
document.body.dataset.variant = v2 ? "ia v2" : variante; // v2 herda o CSS da ia ([data-variant~="ia"])
if (v2) configurarSom({ robo: true, trilha: "v2" });
document.documentElement.dataset.motion = reduzido ? "reduced" : "full";

// Leituras do gerador (1..60) usadas pelo simulador; 0 = antes da 1ª seção. Viradas em 3, 11 e 31.
const ROTEIRO = [0, 1, 3, 6, 9, 11, 16, 24, 28, 31, 36, 44, 52, 60];
const PERFECT_LOTE = 59; // % dos votos novos da leitura que fazem "PERFECT" (regra no README)
const NOMES = { 22: "FLÁVIO BOLSONARO", 13: "LULA" };
const CURTO = { 22: "FLÁVIO", 13: "LULA" };
const pf = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const p1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const e1 = await (await fetch("dados/estado-1t.json")).json();
const col = await (await fetch("dados/colegios-1t.json")).json();
const { hist } = gerar(e1, col, "encerrado");
const passos = ROTEIRO.map((n) => {
	if (!n) return { n, ap: 0, hora: "17:00", pct: { 22: null, 13: null }, votos: { 22: 0, 13: 0 } };
	const p = hist[n - 1].c.presidente;
	return { n, ap: p.ap, hora: p.hora.slice(0, 5), pct: { 22: p.c["22"][1], 13: p.c["13"][1] }, votos: { 22: p.c["22"][0], 13: p.c["13"][0] } };
});

// ---- estado + gancho para o teste (window.__arcade) ----
const S = { fase: "selecao", i: -1, lider: null, sequencia: { 22: 0, 13: 0 }, arcade: true };
const sonda = (window.__arcade = { eventos: [], tremidas: 0, flashes: 0, fase: "selecao" });

const $ = (s) => document.querySelector(s);
const lado = (n) => $(`.hud-lado[data-n="${n}"]`);

// ---- banner, switcher, créditos ----
const bar = document.createElement("div");
bar.id = "proto-switcher";
bar.innerHTML = `<button type="button" data-ps="-1" aria-label="Variante anterior">←</button>
  <div class="ps-label"><b>${variante.toUpperCase()} — ${VARIANTES[variante].nome}</b><small>${VARIANTES[variante].detalhe} · ${CHAVES.indexOf(variante) + 1}/${CHAVES.length}</small>
  <span class="ps-antigas">${v2 ? "antigas:" : '<a href="?variant=v2">← v2</a> · antigas:'} ${CHAVES.slice(1).map((k) => `<a href="?variant=${k}"${k === variante ? ' aria-current="page"' : ""}>${k}</a>`).join(" ")}</span></div>
  <button type="button" data-ps="1" aria-label="Próxima variante">→</button>`;
document.body.append(bar);
const irVariante = (d) => {
	const url = new URL(location.href);
	url.searchParams.set("variant", CHAVES[(CHAVES.indexOf(variante) + d + CHAVES.length) % CHAVES.length]);
	location.assign(url.href);
};
bar.addEventListener("click", (ev) => {
	const b = ev.target.closest("[data-ps]");
	if (b) irVariante(Number(b.dataset.ps));
});
document.addEventListener("keydown", (ev) => {
	const t = ev.target;
	if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t?.isContentEditable) return;
	if (ev.key === "ArrowLeft") irVariante(-1);
	if (ev.key === "ArrowRight") irVariante(1);
});

// ---- rostos: mesma pixelização para os dois ----
// v2: nenhuma foto real (só as imagens de IA)
const fotos = v2 ? null : { 22: await carregarFoto(22), 13: await carregarFoto(13) };
// retratos 40×40 (HUD, seleção, vitória) e cabeça 24×24 no palco: mesmos números para os dois
const rosto40 = fotos && { 22: pixelar(fotos[22], 40, 22, CORES[22].gi), 13: pixelar(fotos[13], 40, 13, CORES[13].gi) };
const rosto24 = fotos && { 22: pixelar(fotos[22], 24, 22, CORES[22].gi), 13: pixelar(fotos[13], 24, 13, CORES[13].gi) };
if (fotos)
	for (const n of [22, 13]) {
		pintarEm(lado(n).querySelector(".retrato"), rosto40[n]);
		pintarEm($(`#selecao figure[data-n="${n}"] canvas`), rosto40[n]);
	}
const credito = (n) => {
	const f = FOTOS[n];
	if (fotos[n].origem === "commons") return `${CURTO[n]}: <a href="${f.fonte}" target="_blank" rel="noopener">${f.credito}</a> (${f.licenca}, Wikimedia Commons)`;
	if (fotos[n].origem === "tse") return `${CURTO[n]}: foto oficial de candidatura, TSE`;
	return `${CURTO[n]}: sem foto`;
};
$("#creditos").innerHTML = ia
	? `<b>Imagens criadas com IA para fins de humor. Não retratam fatos reais.</b> <small>Geradas por Sandro Costa no Higgsfield e ampliadas; aqui só recortadas, redimensionadas e sem o fundo branco.</small>`
	: `Fotos reais, recortadas e pixeladas por código (expressão original, sem edição por IA) · ${credito(22)} · ${credito(13)} · obra derivada sob CC BY-SA 4.0.`;

// ---- variante (ia): retratos, fichas, tela VS e vitória com as imagens de IA (selo em cada quadro) ----
if (ia) {
	const m = ia.manifesto;
	for (const n of [22, 13]) {
		lado(n).querySelector(".retrato").before(ia.quadroIA(m.retrato[n], `Retrato de ${NOMES[n]} (imagem gerada por IA)`, "ia-retrato"));
		$(`#selecao figure[data-n="${n}"] canvas`).before(ia.quadroIA(m.ficha[n], `${NOMES[n]} como lutador (imagem gerada por IA)`, "ia-ficha"));
	}
	const vs = document.createElement("div");
	vs.className = "ia-vs";
	vs.append(ia.quadroIA(m.vs, "Tela de VS com os dois candidatos como lutadores (imagem gerada por IA)"), $("#selecao .vs"));
	$('#selecao figure[data-n="22"]').after(vs);
}

// ---- variante (a): palco em canvas; (b): painel em iframe; (c): só DOM ----
const palco =
	variante === "a"
		? criarPalco($("#palco"), { reduzido })
		: variante === "ia"
			? ia.criarPalcoIA($(".palco-wrap"), { reduzido, nomes: NOMES })
			: v2
				? await (await import("./v2.js")).criarPalcoV2($(".palco-wrap"), { reduzido })
				: null;
if (variante === "a") {
	palco.rostos(rosto24);
	palco.cenario(); // só nacional: Brasília à noite
}
if (variante !== "a") $("#palco").hidden = true;
if (v2) $("#vitoria h1").textContent = "YOU WIN";

const painel = $("#painel");
if (variante === "b") {
	painel.hidden = false;
	painel.src = "painel/index.html?embed=1&n=0";
	const botao = $("#modo-arcade");
	botao.hidden = false;
	botao.addEventListener("click", () => {
		S.arcade = !S.arcade;
		botao.setAttribute("aria-pressed", String(S.arcade));
		botao.textContent = `🕹 Modo arcade: ${S.arcade ? "ligado" : "desligado"}`;
		document.body.classList.toggle("arcade-off", !S.arcade);
	});
}
const avisarPainel = (n) => painel.contentWindow?.postMessage({ arcadeN: n }, location.origin);

// ---- locutor: fila de textos grandes; tudo vai também para "Lances da noite" ----
const anuncio = $("#anuncio");
let filaAnuncio = Promise.resolve();
function anunciar(texto, { classe = "", dur = 900, falar = null, lance = null } = {}) {
	sonda.eventos.push(texto);
	if (lance) registrar(lance);
	filaAnuncio = filaAnuncio.then(
		() =>
			new Promise((ok) => {
				anuncio.className = classe;
				anuncio.textContent = texto;
				// reduzido: o texto troca no lugar, sem zoom; a classe "entra" só anima no modo completo
				if (!reduzido) {
					void anuncio.offsetWidth;
					anuncio.classList.add("entra");
				}
				if (falar) voz(falar);
				setTimeout(ok, reduzido ? Math.min(dur, 700) : dur);
			}),
	);
	return filaAnuncio;
}
function limparAnuncio() {
	filaAnuncio = filaAnuncio.then(() => {
		anuncio.textContent = "";
		anuncio.className = "";
	});
}
function registrar(txt) {
	const li = document.createElement("li");
	li.innerHTML = txt;
	$("#lances").prepend(li);
}

// ---- impacto: tremor e flash só no modo completo ----
function impacto(alvo, int, virada) {
	const ferido = lado(alvo);
	ferido.classList.remove("ferido");
	void ferido.offsetWidth;
	ferido.classList.add("ferido"); // reduzido: tinta + rachadura estáticas, sem piscar (ver CSS)
	ferido.style.setProperty("--rachadura", String(Math.min(1, 0.3 + int)));
	if (reduzido || v2) return; // v2: tremor, zoom e flash acontecem no 3D, no instante do contato
	const alvoTremor = variante === "b" ? $(".hud") : $(".palco-wrap");
	alvoTremor.style.setProperty("--forca", `${Math.round(2 + 8 * int)}px`);
	alvoTremor.classList.remove("treme");
	void alvoTremor.offsetWidth;
	alvoTremor.classList.add("treme");
	sonda.tremidas++;
	if (virada) {
		document.body.classList.remove("flash");
		void document.body.offsetWidth;
		document.body.classList.add("flash");
		sonda.flashes++;
	}
	if (variante === "c") {
		const pulso = $(".neon-duelo");
		pulso.dataset.de = String(alvo === 22 ? 13 : 22);
		pulso.classList.remove("pulso");
		void pulso.offsetWidth;
		pulso.classList.add("pulso");
	}
}

// ---- HUD ----
function pintarHud(p, anterior) {
	for (const n of [22, 13]) {
		const el = lado(n);
		const v = p.pct[n];
		const vida = el.querySelector(".vida");
		const dano = el.querySelector(".dano");
		const larg = v == null ? 50 : v;
		vida.style.width = `${larg}%`;
		// barra vermelha de "dano" fica onde estava e esvazia depois (só no modo completo)
		const antes = anterior?.pct[n] ?? 50;
		dano.style.width = `${Math.max(larg, antes)}%`;
		if (!reduzido) setTimeout(() => (dano.style.width = `${larg}%`), 450);
		else dano.style.width = `${larg}%`;
		el.querySelector(".barra").setAttribute("aria-valuenow", v == null ? "0" : v.toFixed(2));
		el.querySelector(".pct").textContent = v == null ? "—" : `${pf.format(v)}%`;
		el.classList.toggle("lider", S.lider === n);
	}
	$(".tempo").textContent = String(Math.max(0, Math.ceil(100 - p.ap)));
	$(".status").innerHTML =
		p.n === 0
			? `Aguardando a 1ª seção · <b>0,0% apurado</b> · leitura 0/${passos.length - 1} · dados de exemplo`
			: `<b>${p1.format(p.ap)}% apurado</b> · ${p.hora} · leitura ${S.i}/${passos.length - 1} · ${S.lider ? `${S.lider} na frente por ${pf.format(Math.abs(p.pct[22] - p.pct[13]))} p.p.` : "empate"} · dados de exemplo`;
}

function liderDe(p) {
	if (p.pct[22] == null || p.pct[22] === p.pct[13]) return null;
	return p.pct[22] > p.pct[13] ? 22 : 13;
}

// ---- simulador ----
function telaSelecao() {
	S.fase = sonda.fase = "selecao";
	document.body.dataset.fase = "selecao";
	$("#selecao").hidden = false;
	$("#vitoria").hidden = true;
}

function proxima() {
	if (S.fase === "fim") return;
	efeito("bip");
	if (S.fase === "selecao") {
		$("#selecao").hidden = true;
		S.fase = sonda.fase = "luta";
		document.body.dataset.fase = "luta";
		S.i = 0;
		S.lider = null;
		pintarHud(passos[0], null);
		palco?.estado({ lider: null, fase: "luta" });
		avisarPainel(0);
		efeito("inicio");
		anunciar("ROUND 1", { classe: "round", dur: 1100, falar: "Round one", lance: "<b>ROUND 1</b> · 17:00 · urnas fechadas, começa a apuração (exemplo)" });
		anunciar("FIGHT!", { classe: "fight", dur: 800, falar: "Fight!" });
		limparAnuncio();
		return;
	}
	const ant = passos[S.i];
	S.i++;
	const p = passos[S.i];
	const liderAnt = S.lider;
	S.lider = liderDe(p);
	avisarPainel(p.n);
	// golpe: quem ganhou p.p. bate; intensidade ∝ variação (raiz, para pequenas variações aparecerem)
	const base = ant.pct[22] ?? 50;
	const d = p.pct[22] - base;
	const atacante = d > 0 ? 22 : d < 0 ? 13 : null;
	const int = Math.min(1, Math.sqrt(Math.abs(d) / 4));
	const virada = liderAnt != null && S.lider !== liderAnt;
	pintarHud(p, ant);
	palco?.estado({ lider: S.lider, fase: "luta" });
	if (atacante) {
		const alvo = atacante === 22 ? 13 : 22;
		lado(atacante).classList.remove("ferido");
		S.sequencia[atacante]++;
		S.sequencia[alvo] = 0;
		palco?.golpe(atacante, int, { virada });
		impacto(alvo, int, virada);
		if (!v2) efeito("golpe", int); // v2: o palco toca chute e impacto sincronizados com o contato
		const combo = S.sequencia[atacante];
		if (combo >= 2) lado(atacante).querySelector(".hud-nome").dataset.combo = `${combo} HIT COMBO`;
		lado(alvo).querySelector(".hud-nome").dataset.combo = "";
		const lote = { 22: p.votos[22] - ant.votos[22], 13: p.votos[13] - ant.votos[13] };
		const fatia = (lote[atacante] / (lote[22] + lote[13])) * 100;
		const hit = `${p.hora} · ${atacante} ganha ${pf.format(Math.abs(d))} p.p. (${p1.format(p.ap)}% apurado)`;
		if (virada) {
			efeito("virada");
			if (combo >= 2) anunciar(`${combo} HIT COMBO`, { classe: "combo", dur: 700 });
			anunciar("REVERSAL!", { classe: "reversal", dur: 1200, falar: "Reversal!", lance: `<b>REVERSAL!</b> · ${hit} · <b>${atacante} passa à frente</b>` });
		} else registrar(`HIT · ${hit}`);
		if (fatia >= PERFECT_LOTE) {
			efeito("perfect");
			anunciar("PERFECT", { classe: "perfect", dur: 1000, falar: "Perfect!", lance: `<b>PERFECT</b> · ${atacante} levou ${p1.format(fatia)}% dos votos novos desta leitura` });
		}
		limparAnuncio();
	} else registrar(`${p.hora} · sem mudança`);
	if (S.i === passos.length - 1) fim(p);
}

function fim(p) {
	S.fase = sonda.fase = "fim";
	document.body.dataset.fase = "fim";
	pararAuto();
	const venc = S.lider;
	efeito("ko");
	palco?.ko?.(venc);
	// v2: espera a câmera lenta e a queda antes da tela final
	anunciar("K.O.", { classe: "ko", dur: v2 ? 2600 : 1300, falar: "K.O.", lance: `<b>K.O.</b> · ${p.hora} · 100% apurado` }).then(() => {
		palco?.estado({ lider: venc, fase: "fim", vencedor: venc });
		const v = $("#vitoria");
		if (rosto40) pintarEm(v.querySelector("canvas"), rosto40[venc]);
		if (ia) {
			v.querySelector("figure .ia-quadro")?.remove();
			v.querySelector("figure").prepend(ia.quadroIA(ia.manifesto.poses[venc].vitoria, `${NOMES[venc]} comemorando (imagem gerada por IA)`, "ia-vitoria"));
		}
		v.querySelector("figcaption").innerHTML = `<b>${venc}</b> ${NOMES[venc]} <small>${pf.format(p.pct[venc])}% dos válidos</small>`;
		v.dataset.n = String(venc);
		v.hidden = false;
		efeito("vitoria");
		voz(v2 ? "You win!" : "Winner!");
		sonda.eventos.push(v2 ? "YOU WIN" : "WINNER");
		registrar(`<b>WINNER</b> · ${venc} · ${NOMES[venc]} · ${pf.format(p.pct[venc])}% (exemplo)`);
		$("#proxima").disabled = true;
		$("#proxima").textContent = "■ Apuração encerrada";
	});
	limparAnuncio();
}

function reiniciar() {
	pararAuto();
	filaAnuncio = Promise.resolve();
	anuncio.textContent = "";
	anuncio.className = "";
	Object.assign(S, { i: -1, lider: null, sequencia: { 22: 0, 13: 0 } });
	$("#lances").innerHTML = "";
	$("#proxima").disabled = false;
	$("#proxima").textContent = "▶ Próxima atualização";
	for (const n of [22, 13]) {
		lado(n).classList.remove("ferido", "lider");
		lado(n).querySelector(".hud-nome").dataset.combo = "";
	}
	pintarHud(passos[0], null);
	palco?.estado({ lider: null, fase: "selecao" });
	avisarPainel(0);
	telaSelecao();
}

let auto = null;
function pararAuto() {
	clearInterval(auto);
	auto = null;
	$("#auto").setAttribute("aria-pressed", "false");
	$("#auto").textContent = "⏵ Autoplay";
}
$("#auto").addEventListener("click", () => {
	if (auto) return pararAuto();
	if (S.fase === "fim") return;
	$("#auto").setAttribute("aria-pressed", "true");
	$("#auto").textContent = "⏸ Pausar";
	proxima();
	auto = setInterval(proxima, 2600);
});
$("#proxima").addEventListener("click", proxima);
$("#reiniciar").addEventListener("click", reiniciar);
$("#som").addEventListener("click", () => {
	const on = alternarSom();
	$("#som").setAttribute("aria-pressed", String(on));
	$("#som").textContent = on ? "🔊 Som ligado" : "🔇 Som desligado";
});

pintarHud(passos[0], null);
telaSelecao();
palco?.estado({ lider: null, fase: "selecao" });
