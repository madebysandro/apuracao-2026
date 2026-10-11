/**
 * PROTOTYPE — rostos: foto real (Wikimedia Commons, CC BY-SA 4.0), só recortada e pixelada por código.
 * Mesmo tratamento para os dois: reduz para N×N (média de área do navegador) e quantiza para RGB555,
 * ou seja, 16 bits de cor. Determinístico. Sem filtro, sem deformar, sem trocar a expressão.
 * Se a foto do Commons falhar, cai para a foto oficial do TSE (6258); se falhar também, um quadro com o número.
 */
export const FOTOS = {
	22: {
		arquivo: "dados/fotos/22-commons.jpg",
		reserva: "dados/fotos/280002551544.jpeg",
		credito: "Geraldo Magela/Agência Senado",
		licenca: "CC BY-SA 4.0",
		fonte: "https://commons.wikimedia.org/wiki/File:Entrevistas_Diversas_01.09.26.jpg",
	},
	13: {
		arquivo: "dados/fotos/13-commons.jpg",
		reserva: "dados/fotos/280002542548.jpeg",
		credito: "Ricardo Stuckert/Lula Oficial",
		licenca: "CC BY-SA 4.0",
		fonte: "https://commons.wikimedia.org/wiki/File:30.10.2022-_Lula,_presidente_eleito,_discursa_na_Paulista.jpg",
	},
};

const carregar = (src) =>
	new Promise((ok, erro) => {
		const img = new Image();
		img.onload = () => ok(img);
		img.onerror = erro;
		img.src = src;
	});

/** { img, origem: "commons"|"tse"|null } */
export async function carregarFoto(n) {
	const f = FOTOS[n];
	try {
		return { img: await carregar(f.arquivo), origem: "commons" };
	} catch {
		try {
			return { img: await carregar(f.reserva), origem: "tse" };
		} catch {
			return { img: null, origem: null };
		}
	}
}

/** Canvas N×N com a foto pixelada (RGB555). Foto ausente: fundo na cor + número. */
export function pixelar(foto, lado, n, cor) {
	const c = document.createElement("canvas");
	c.width = c.height = lado;
	const g = c.getContext("2d", { willReadFrequently: true });
	if (!foto.img) {
		g.fillStyle = cor;
		g.fillRect(0, 0, lado, lado);
		g.fillStyle = "#fff";
		g.font = `bold ${Math.round(lado / 2)}px monospace`;
		g.textAlign = "center";
		g.textBaseline = "middle";
		g.fillText(n, lado / 2, lado / 2);
		return c;
	}
	const { img } = foto;
	const q = Math.min(img.width, img.height); // recorte quadrado central (as cópias locais já são quadradas)
	// reduz em dois passos para a média ficar boa (o navegador faz a média de área)
	const meio = document.createElement("canvas");
	meio.width = meio.height = lado * 4;
	const gm = meio.getContext("2d");
	gm.imageSmoothingQuality = "high";
	gm.drawImage(img, (img.width - q) / 2, (img.height - q) / 2, q, q, 0, 0, lado * 4, lado * 4);
	g.imageSmoothingQuality = "high";
	g.drawImage(meio, 0, 0, lado, lado);
	const px = g.getImageData(0, 0, lado, lado);
	for (let i = 0; i < px.data.length; i += 4) for (let k = 0; k < 3; k++) px.data[i + k] = Math.round(px.data[i + k] / 255 * 31) * 255 / 31;
	g.putImageData(px, 0, 0);
	return c;
}

/** Copia um canvas pixelado para outro (sem suavizar). */
export function pintarEm(destino, origem) {
	const g = destino.getContext("2d");
	g.imageSmoothingEnabled = false;
	g.clearRect(0, 0, destino.width, destino.height);
	g.drawImage(origem, 0, 0, destino.width, destino.height);
}
