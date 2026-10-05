/**
 * Aceite da issue #37 — variante A (arquivo do 1º turno).
 * Seams: apresentarFaixa (arquivo × ao vivo), contagem/barra sem count-up,
 * HTML do painel e do cartão (KPI, rodapé, hist vazio, tendência, title).
 */
import { vi } from "vitest";

vi.hoisted(() => {
	const g = globalThis as typeof globalThis & {
		matchMedia?: (query: string) => {
			matches: boolean;
			media: string;
			addEventListener: () => void;
			removeEventListener: () => void;
		};
	};
	if (typeof g.matchMedia !== "function") {
		g.matchMedia = (query: string) => ({
			matches: false,
			media: query,
			addEventListener() {},
			removeEventListener() {},
		});
	}
});

import { describe, expect, it } from "vitest";
import {
	MSG_FIGURA_ARQUIVO,
	apresentarFaixa,
	apuracaoArquivada,
	figuraSemLinha,
	htmlRodapeArquivo,
	kpiAcompanhamento,
	limitesContagem,
	nascerBarra,
	textoTendenciaVazia,
} from "../public/js/arquivo.js";
import { renderizarCartaoMajoritario } from "../public/js/tela1-cartao.js";
import { renderizarPainel } from "../public/js/tela1-painel.js";
import {
	conta,
	definirArquivoCongelado,
} from "../public/js/tela1-util.js";

const HORA = "19:14:08";

function cargo(apurado = 100) {
	return {
		titulo: "Presidente",
		local: "Brasil",
		vagas: 1,
		apurado,
		hora: HORA,
		candidatos: [
			{
				n: "13",
				nome: "LULA DA SILVA",
				partido: "PT",
				votos: 1_000_000,
				pct: 50.12,
				foto: "",
			},
			{
				n: "22",
				nome: "JAIR BOLSONARO",
				partido: "PL",
				votos: 900_000,
				pct: 40.01,
				foto: "",
			},
		],
		totais: { comparecimento: 80.5, abstencao: 19.5, validos: 1_000 },
	};
}

function analiseSemTendencia() {
	return {
		defensor: { n: "13", nome: "LULA", votos: 1, pct: 50 },
		perseguidor: { n: "22", nome: "BOLSONARO", votos: 1, pct: 40 },
		vantagemVotos: 10,
		vantagemPp: 10,
		evolucaoVantagemPp: [],
		validosAApurar: null,
		tendencias: [],
	};
}

describe("faixa de status — arquivo × ao vivo", () => {
	it("com encerrada, mostra Encerrada, carimbo e uma só hora do TSE", () => {
		const faixa = apresentarFaixa({
			encerrada: true,
			proximaConsulta: null,
			consultadoEm: 1_700_000_000_000,
			erro: null,
		});
		expect(faixa).toEqual({
			modo: "arquivo",
			rotulo: "Encerrada",
			consulta: false,
			carimbo: "Arquivo · 1º turno",
			rotuloTse: "Última atualização do TSE",
			mostrarIdade: false,
		});
	});

	it("com proximaConsulta nula depois de consultar, trata como arquivo", () => {
		expect(
			apuracaoArquivada({
				proximaConsulta: null,
				consultadoEm: 1_700_000_000_000,
				erro: null,
			}),
		).toBe(true);
		expect(
			apresentarFaixa({
				proximaConsulta: null,
				consultadoEm: 1_700_000_000_000,
			}).rotulo,
		).toBe("Encerrada");
	});

	it("ao vivo, mantém pulso, próxima consulta e a idade relativa", () => {
		const faixa = apresentarFaixa({
			encerrada: false,
			proximaConsulta: Date.now() + 30_000,
			consultadoEm: Date.now(),
			erro: null,
		});
		expect(faixa.modo).toBe("ao-vivo");
		expect(faixa.rotulo).toBe("Ao vivo");
		expect(faixa.consulta).toBe(true);
		expect(faixa.carimbo).toBeNull();
		expect(faixa.rotuloTse).toBe("Dados do TSE");
		expect(faixa.mostrarIdade).toBe(true);
	});

	it("com erro do TSE, a faixa fica instável mesmo se a consulta ainda não foi marcada", () => {
		const faixa = apresentarFaixa({
			erro: "HTTP 503",
			proximaConsulta: Date.now() + 60_000,
			consultadoEm: Date.now(),
		});
		expect(faixa.modo).toBe("instavel");
		expect(faixa.rotulo).toBe("TSE instável");
		expect(faixa.consulta).toBe(true);
		expect(faixa.carimbo).toBeNull();
	});

	it("antes da primeira consulta, proximaConsulta nula não é arquivo", () => {
		expect(
			apuracaoArquivada({
				proximaConsulta: null,
				consultadoEm: null,
				erro: null,
			}),
		).toBe(false);
	});
});

describe("contagem e barras — arquivo não conta de baixo para 100%", () => {
	it("no arquivo, o número nasce no valor final mesmo se a memória tinha 80", () => {
		expect(limitesContagem(80, 100, true)).toEqual({ de: 100, animar: false });
		expect(limitesContagem(null, 100, true)).toEqual({ de: 100, animar: false });
	});

	it("ao vivo, a primeira contagem sai de 0 e a seguinte sai do valor visto", () => {
		expect(limitesContagem(null, 31.5, false)).toEqual({
			de: 0,
			animar: true,
		});
		expect(limitesContagem(80, 100, false)).toEqual({ de: 80, animar: true });
	});

	it("conta() no arquivo grava data-de igual ao valor final", () => {
		definirArquivoCongelado(false);
		conta("k-mem-80", 80, "p");
		definirArquivoCongelado(true);
		const html = conta("k-mem-80", 100, "p");
		expect(html).toContain('data-de="100"');
		expect(html).toContain('data-para="100"');
		expect(html).not.toContain("mudou");
		definirArquivoCongelado(false);
	});

	it("a barra no arquivo nasce no alvo, sem energia de entrada", () => {
		expect(nascerBarra(100, true)).toMatchObject({
			v: 100,
			vel: 0,
			energia: 0,
		});
		expect(nascerBarra(40, false)).toMatchObject({ v: 0, energia: 1 });
	});
});

describe("painel e cartão — arquivo do 1º turno", () => {
	it("KPI mostra a hora do TSE e o rodapé aponta o resultado oficial", () => {
		const html = renderizarPainel({
			cargos: { presidente: cargo(), governador: cargo() },
			hist: [],
			tela: 1,
			graficos: new Map(),
			horaTse: HORA,
			encerrada: true,
		});
		expect(html).toContain("Última atualização");
		expect(html).toContain(HORA);
		expect(html).not.toContain("leituras");
		expect(html).toContain(htmlRodapeArquivo());
		expect(html).toContain("https://resultados.tse.jus.br/");
		expect(html).toContain(">resultados.tse.jus.br<");
		expect(html.toLowerCase()).not.toContain("ao vivo");
	});

	it("ao vivo, o KPI conta leituras e o rodapé de arquivo não aparece", () => {
		const html = renderizarPainel({
			cargos: { presidente: cargo(40), governador: cargo(40) },
			hist: [],
			tela: 1,
			graficos: new Map(),
			horaTse: HORA,
			encerrada: false,
		});
		expect(html).toContain("Acompanhamento");
		expect(html).toContain("0 leituras");
		expect(html).not.toContain("resultados.tse.jus.br");
		expect(html).not.toContain("Arquivo do 1º turno");
	});

	it("história vazia no arquivo troca a figura pela mensagem de resultado final", () => {
		expect(figuraSemLinha(true, 100, false)).toBe(true);
		expect(figuraSemLinha(false, 40, false)).toBe(false);
		expect(figuraSemLinha(true, 100, true)).toBe(false);
		const html = renderizarCartaoMajoritario(
			"presidente",
			cargo(100),
			[],
			new Map(),
			analiseSemTendencia(),
			{ encerrada: true },
		);
		expect(html).toContain(MSG_FIGURA_ARQUIVO);
		expect(html).not.toContain("<figure");
		expect(html).not.toContain("aguardando mais leituras");
		expect(html).toContain("tendência encerrada com 100% das seções");
	});

	it("ao vivo, com apuração aberta, a figura fica e a tendência ainda espera leituras", () => {
		const html = renderizarCartaoMajoritario(
			"presidente",
			cargo(40),
			[],
			new Map(),
			analiseSemTendencia(),
			{ encerrada: false },
		);
		expect(html).toContain("<figure");
		expect(html).not.toContain(MSG_FIGURA_ARQUIVO);
		expect(html).toContain("aguardando mais leituras");
	});

	it("com 100% das seções, some o “aguardando mais leituras” mesmo sem a flag encerrada", () => {
		const vazio = textoTendenciaVazia({ encerrada: false, apurado: 100 });
		expect(vazio.valor).toBe("tendência encerrada com 100% das seções");
		expect(vazio.sub).not.toContain("aguardando");
		const html = renderizarCartaoMajoritario(
			"presidente",
			cargo(100),
			[],
			new Map(),
			analiseSemTendencia(),
			{ encerrada: false },
		);
		expect(html).not.toContain("aguardando mais leituras");
	});

	it("com histórico de verdade, o arquivo mantém o gráfico", () => {
		const hist = [80, 100].map((ap, i) => ({
			t: i + 1,
			c: {
				presidente: {
					ap,
					hora: `18:0${i}:00`,
					c: {
						13: [100, 48 + i, 0],
						22: [90, 40, 0],
					},
				},
			},
		}));
		const html = renderizarCartaoMajoritario(
			"presidente",
			cargo(100),
			hist,
			new Map(),
			null,
			{ encerrada: true },
		);
		expect(html).toContain("<figure");
		expect(html).not.toContain(MSG_FIGURA_ARQUIVO);
	});

	it("nome truncado leva title com o nome completo", () => {
		const html = renderizarCartaoMajoritario(
			"presidente",
			cargo(40),
			[],
			new Map(),
			null,
			{ encerrada: false },
		);
		expect(html).toContain('title="Lula da Silva"');
	});

	it("o KPI de arquivo usa a hora do TSE e o ao vivo conta as leituras", () => {
		expect(
			kpiAcompanhamento({
				arquivada: true,
				hora: HORA,
				nLeituras: 0,
				inicio: "—",
			}),
		).toEqual({
			rotulo: "Última atualização",
			valor: HORA,
			sub: "última atualização do TSE · 1º turno encerrado · 2º turno em 25/10",
		});
		expect(
			kpiAcompanhamento({
				arquivada: false,
				hora: HORA,
				nLeituras: 0,
				inicio: "—",
			}).valor,
		).toBe("0 leituras");
	});
});
