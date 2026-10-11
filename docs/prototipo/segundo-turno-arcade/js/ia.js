/**
 * PROTOTYPE — variante ?variant=ia: as imagens geradas por IA do Sandro, usadas como estão
 * (só recorte, escala e fundo branco removido; ver ia-recortar.py). Toda imagem vai dentro de um
 * .ia-quadro com o selo fixo "Imagem gerada por IA · sátira".
 * O K.O. dos dois sai do quadro "golpeado" + CSS (queda, poeira, clarão): o quadro de K.O. no chão
 * da folha de Lula tem o rosto errado e, por isonomia, nenhum dos dois é usado.
 */
export const SELO = "Imagem gerada por IA · sátira";
export const manifesto = await (await fetch("ia/manifesto.json")).json();

export function quadroIA({ arquivo, w, h }, alt, classe = "") {
	const q = document.createElement("span");
	q.className = `ia-quadro ${classe}`;
	q.innerHTML = `<img alt="" width="${w}" height="${h}" decoding="async"><small class="ia-selo">${SELO}</small>`;
	const img = q.querySelector("img");
	img.src = arquivo;
	img.alt = alt;
	return q;
}

// Para onde cada quadro olha na folha original; o lado esquerdo (22) olha para a direita e o
// direito (13) para a esquerda. Espelha só quando precisa: mesma regra para os dois.
export const OLHA = { guarda: "d", chute: "e", golpeado: "d", vitoria: "" };
export const QUER = { 22: "d", 13: "e" };
const ALTURA = 72; // % do palco para um quadro de 390 px (altura da guarda)

export function criarPalcoIA(wrap, { reduzido, nomes }) {
	const palco = document.createElement("div");
	palco.className = "ia-palco";
	const lut = {};
	for (const n of [22, 13]) {
		const el = document.createElement("div");
		el.className = "lutador";
		el.dataset.n = String(n);
		el.append(quadroIA(manifesto.poses[n].guarda, `${nomes[n]} (imagem gerada por IA)`));
		el.insertAdjacentHTML("beforeend", `<i class="poeira" aria-hidden="true"></i>`);
		palco.append(el);
		lut[n] = el;
	}
	const faisca = document.createElement("i");
	faisca.className = "faisca";
	palco.append(faisca);
	wrap.prepend(palco);

	const timers = {};
	function pose(n, nome) {
		const el = lut[n];
		const p = manifesto.poses[n][nome];
		const img = el.querySelector("img");
		img.src = p.arquivo;
		img.width = p.w;
		img.height = p.h;
		el.dataset.pose = nome;
		el.style.height = `${(p.h / 390) * ALTURA}%`;
		el.style.aspectRatio = `${p.w} / ${p.h}`;
		el.style.setProperty("--ar", String(p.w / p.h));
		el.classList.toggle("espelha", Boolean(OLHA[nome]) && OLHA[nome] !== QUER[n]);
	}
	const reinicia = (el, cls) => {
		el.classList.remove(cls);
		void el.offsetWidth;
		el.classList.add(cls);
	};

	return {
		estado({ lider, fase }) {
			if (fase === "fim") return; // o K.O. (ko) já montou o quadro final
			for (const n of [22, 13]) {
				clearTimeout(timers[n]);
				lut[n].classList.remove("ataca", "atingido", "ko");
				lut[n].classList.toggle("lider", lider === n && fase !== "selecao");
				pose(n, "guarda");
			}
		},
		golpe(atacante, int) {
			const alvo = atacante === 22 ? 13 : 22;
			pose(atacante, "chute");
			pose(alvo, "golpeado");
			// reduzido: estado estático (chute × golpeado) até a próxima leitura, sem avanço nem faísca
			if (reduzido) return;
			palco.style.setProperty("--int", String(int));
			reinicia(lut[atacante], "ataca");
			reinicia(lut[alvo], "atingido");
			faisca.dataset.alvo = String(alvo);
			reinicia(faisca, "pop");
			for (const n of [atacante, alvo])
				timers[n] = setTimeout(() => {
					lut[n].classList.remove("ataca", "atingido");
					pose(n, "guarda");
				}, 650);
		},
		ko(vencedor) {
			const perdedor = vencedor === 22 ? 13 : 22;
			for (const n of [22, 13]) clearTimeout(timers[n]);
			pose(perdedor, "golpeado");
			pose(vencedor, "vitoria");
			lut[perdedor].classList.remove("ataca", "atingido");
			lut[perdedor].classList.add("ko"); // queda, poeira e clarão no CSS; reduzido: só a pose final
			if (!reduzido) reinicia(palco, "clarao");
		},
	};
}
