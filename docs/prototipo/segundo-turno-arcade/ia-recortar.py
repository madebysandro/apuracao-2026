"""PROTOTYPE — gera ia/*.webp a partir das imagens de IA do Sandro (upscales 4096×3072, fora do repo).

Só recorta, redimensiona e remove o fundo branco das poses (alfa por limiar + flood-fill a partir das
bordas, ficando só o boneco que contém a semente). Nada é retocado, recolorido ou gerado. Os quadros
de K.O. no chão NÃO são recortados (em poses-lula.png o rosto é o do outro candidato; por isonomia,
o de Flávio também fica de fora). No fim, confere que nenhum arquivo de ia/ parece com eles.

  python3 -I ia-recortar.py /workspace/arcade-upscale ia
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ORIG, SAIDA = Path(sys.argv[1]), Path(sys.argv[2])
SAIDA.mkdir(exist_ok=True)
K = 4096 / 1200  # as coordenadas abaixo estão na prévia 1200×900
BRANCO = 226  # canal mínimo para contar como papel branco
ESCALA_FOLHA = 390 / (405 * K)  # guarda de Lula (405 px na prévia) → 390 px; mesma escala nas duas folhas

# Quadros de K.O. no chão: nunca recortados, só usados na verificação final.
KO_CHAO = {"poses-flavio": (600, 712, 1000, 885), "poses-lula": (465, 700, 910, 870)}

# pose: (retângulo, semente no boneco, polígonos excluídos = pedaços de poses vizinhas que encostam)
POSES = {
	"22": ("poses-flavio", {
		# a guarda grande de Flávio cobre a perna de trás do soco e o ombro esconde a guarda pequena
		"guarda": ((60, 140, 640, 890), (345, 500), [
			[(0, 0), (335, 0), (335, 233), (224, 243), (206, 258), (199, 300), (197, 360), (203, 420), (190, 455), (0, 455)],
			[(566, 0), (700, 0), (700, 460), (576, 460), (575, 405), (572, 352), (568, 270), (566, 250)],
			[(590, 700), (700, 700), (700, 812), (590, 800)],
		]),
		"chute": ((875, 25, 1185, 430), (1050, 180), []),
		"golpeado": ((600, 390, 865, 712), (760, 520), []),
		"vitoria": ((975, 475, 1180, 892), (1070, 650), []),
	}),
	"13": ("poses-lula", {
		"guarda": ((0, 18, 310, 438), (150, 230), []),
		"chute": ((830, 18, 1185, 448), (1040, 200), []),
		"golpeado": ((15, 475, 420, 870), (180, 650), []),
		"vitoria": ((970, 475, 1180, 892), (1070, 650), []),
	}),
}


def sem_fundo(folha, ret, semente, excluir, escala):
	x0, y0, x1, y1 = ret
	img = folha.crop(tuple(round(v * K) for v in ret))
	w, h = round(img.width * escala * 2), round(img.height * escala * 2)  # trabalha a 2×, reduz no fim
	img = img.resize((w, h), Image.LANCZOS)
	f = w / (x1 - x0)
	a = np.asarray(img)
	papel = a.min(axis=2) >= BRANCO
	m = Image.fromarray(np.where(papel, 255, 0).astype(np.uint8))
	d = ImageDraw.Draw(m)
	for poli in excluir:
		d.polygon([((x - x0) * f, (y - y0) * f) for x, y in poli], fill=255)
	# fundo = papel ligado às bordas (moldura de 1 px de papel para o flood-fill dar a volta)
	m = Image.fromarray(np.pad(np.asarray(m), 1, constant_values=255)).copy()  # copy: imagem de array é só leitura
	ImageDraw.floodfill(m, (0, 0), 100)
	desenho = Image.fromarray(np.where(np.asarray(m) == 100, 0, 255).astype(np.uint8)).copy()
	# só o boneco que contém a semente (descarta respingos e pedaços de poses vizinhas)
	ponto = (round((semente[0] - x0) * f) + 1, round((semente[1] - y0) * f) + 1)
	assert desenho.getpixel(ponto) == 255, f"semente fora do boneco: {semente}"
	ImageDraw.floodfill(desenho, ponto, 128)
	alfa = Image.fromarray(np.where(np.asarray(desenho)[1:-1, 1:-1] == 128, 255, 0).astype(np.uint8))
	img.putalpha(alfa)
	img = img.crop(alfa.getbbox())
	return img.resize((round(img.width / 2), round(img.height / 2)), Image.LANCZOS)


def salvar(img, nome, q=80):
	img.save(SAIDA / nome, "WEBP", quality=q, method=6)
	return {"arquivo": f"ia/{nome}", "w": img.width, "h": img.height}


manifesto = {"poses": {}}
for n, (nome_folha, poses) in POSES.items():
	folha = Image.open(ORIG / f"{nome_folha}.png").convert("RGB")
	manifesto["poses"][n] = {}
	for pose, (ret, semente, excluir) in poses.items():
		escala = ESCALA_FOLHA
		if n == "22" and pose == "guarda":  # guarda grande: reduzida para a altura da guarda de Lula
			escala = 390 / ((ret[3] - ret[1] - 5) * K)
		manifesto["poses"][n][pose] = salvar(sem_fundo(folha, ret, semente, excluir, escala), f"{n}-{pose}.webp", 82)

# cenas: VS inteira (≤1600 px) e um recorte igual nas duas cenas-solo (lutador da esquerda)
vs = Image.open(ORIG / "cena-vs.png").convert("RGB")
manifesto["vs"] = salvar(vs.resize((1600, 1200), Image.LANCZOS), "vs.webp", 78)
for n, arq in (("22", "cena-flavio"), ("13", "cena-lula")):
	cena = Image.open(ORIG / f"{arq}.png").convert("RGB")
	ficha = cena.crop(tuple(round(v * K) for v in (40, 148, 660, 900))).resize((496, 602), Image.LANCZOS)
	retrato = cena.crop(tuple(round(v * K) for v in (20, 20, 138, 140))).resize((200, 203), Image.LANCZOS)
	manifesto.setdefault("ficha", {})[n] = salvar(ficha, f"{n}-ficha.webp", 80)
	manifesto.setdefault("retrato", {})[n] = salvar(retrato, f"{n}-retrato.webp", 85)

(SAIDA / "manifesto.json").write_text(json.dumps(manifesto, indent=1, ensure_ascii=False) + "\n")


# verificação: nenhum arquivo de ia/ pode ser (ou parecer) um quadro de K.O. no chão
def miniatura(img):
	if img.mode == "RGBA":
		fundo = Image.new("RGB", img.size, "white")
		fundo.paste(img, mask=img.getchannel("A"))
		img = fundo
	return np.asarray(img.convert("L").resize((48, 24), Image.BILINEAR), dtype=float)


kos = {k: miniatura(Image.open(ORIG / f"{k}.png").crop(tuple(round(v * K) for v in r))) for k, r in KO_CHAO.items()}
for arq in sorted(SAIDA.glob("*.webp")):
	mini = miniatura(Image.open(arq))
	for k, ko in kos.items():
		dif = np.abs(mini - ko).mean()
		assert dif > 25, f"{arq.name} parece o K.O. no chão de {k} (diferença {dif:.1f})"
	assert not any(p in arq.stem for p in ("ko", "chao", "chão", "floor")), arq.name
print("ok: nenhum arquivo de ia/ corresponde aos quadros de K.O. no chão")
for arq in sorted(SAIDA.iterdir()):
	print(f"{arq.stat().st_size:>8} {arq.name}")
