import { http, HttpResponse } from "msw";
import { network } from "./rede";

import cicloA from "../../fixtures/tse-provisorio/2026-10-04T21-36-05-598Z/presidente.json";
import cicloB from "../../fixtures/tse-provisorio/2026-10-04T21-39-46-908Z/presidente.json";
import cicloC from "../../fixtures/tse-provisorio/2026-10-04T21-44-49-070Z/presidente.json";
import governador from "../../fixtures/tse-provisorio/2026-10-04T21-57-01-000Z/governador.json";
import governadorQuaseFim from "../../fixtures/tse-provisorio/sintetica-quase-fim/governador.json";
import senador from "../../fixtures/tse-provisorio/2026-10-04T21-57-01-000Z/senador.json";
import depfedReal from "../../fixtures/tse-provisorio/2026-10-04T21-56-47-000Z/depfed.json";
import depestReal from "../../fixtures/tse-provisorio/2026-10-04T21-56-47-000Z/depest.json";
import depfedDerivada from "../../fixtures/tse-provisorio/2026-10-04T21-56-47-000Z-derivada-antes/depfed.json";
import depestDerivada from "../../fixtures/tse-provisorio/2026-10-04T21-56-47-000Z-derivada-antes/depest.json";

/**
 * Sequência provisória gravada em 04/10/2026.
 * A issue #2 substituirá/estenderá estas fixtures; o mecanismo (índice + avanço)
 * permanece. Três ciclos de Presidente permitem tendência (≥ 3 leituras).
 */
export const SEQUENCIA_PRESIDENTE = [
	{
		ciclo: "2026-10-04T21-36-05-598Z",
		etag: '"1d5285921d666c878ec42545a751657b"',
		cacheControl: "max-age=55",
		corpo: cicloA,
	},
	{
		ciclo: "2026-10-04T21-39-46-908Z",
		etag: '"53dc1d917e92e70583eeefee67e53dfa"',
		cacheControl: "max-age=58",
		corpo: cicloB,
	},
	{
		ciclo: "2026-10-04T21-44-49-070Z",
		etag: '"cfcfdb324035e3866fcc731be644e4e4"',
		cacheControl: "max-age=56",
		corpo: cicloC,
	},
] as const;

/** Governador: real → sintético quase no fim (fora de alcance / maioria). */
export const SEQUENCIA_GOVERNADOR = [
	{
		ciclo: "2026-10-04T21-57-01-000Z",
		etag: '"7b3afcbce1289c6f7258c539ff158bd1"',
		cacheControl: "max-age=50",
		corpo: governador,
	},
	{
		ciclo: "sintetica-quase-fim",
		etag: '"sintetica-governador-quase-fim"',
		cacheControl: "max-age=50",
		corpo: governadorQuaseFim,
	},
] as const;

const FIXTURES_PA = {
	senador: {
		etag: '"fc182858b3f6823b19fb155edb20e63d"',
		cacheControl: "max-age=58",
		corpo: senador,
	},
} as const;

/** Gravação real atual dos deputados do Pará (04/10/2026 ~18:55). */
const PROP_REAL = {
	ciclo: "2026-10-04T21-56-47-000Z",
	depfed: {
		etag: '"408b0e6ec49d9ef2de83ae5577967534"',
		cacheControl: "max-age=57",
		corpo: depfedReal,
	},
	depest: {
		etag: '"0b19a78dc50f02abfe1f5928406cb6de"',
		cacheControl: "max-age=59",
		corpo: depestReal,
	},
} as const;

/**
 * Sequência para troca de cadeira: primeiro um JSON DERIVADO da gravação real
 * (PSD +1 / PSB −1 e um inválido sintético no PL), depois a gravação real.
 */
const PROP_CADEIRAS = [
	{
		ciclo: "2026-10-04T21-56-47-000Z-derivada-antes",
		depfed: {
			etag: '"derivada-depfed-antes-psd3-psb0"',
			cacheControl: "max-age=57",
			corpo: depfedDerivada,
		},
		depest: {
			etag: '"derivada-depest-antes"',
			cacheControl: "max-age=59",
			corpo: depestDerivada,
		},
	},
	{
		ciclo: PROP_REAL.ciclo,
		depfed: PROP_REAL.depfed,
		depest: PROP_REAL.depest,
	},
] as const;

export const URLS_TSE = {
	presidente:
		"https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json",
	governador:
		"https://resultados.tse.jus.br/oficial/ele2026/6259/dados/pa/pa-c0003-e006259-u.json",
	senador:
		"https://resultados.tse.jus.br/oficial/ele2026/6259/dados/pa/pa-c0005-e006259-u.json",
	depfed:
		"https://resultados.tse.jus.br/oficial/ele2026/6259/dados/pa/pa-c0006-e006259-u.json",
	depest:
		"https://resultados.tse.jus.br/oficial/ele2026/6259/dados/pa/pa-c0007-e006259-u.json",
} as const;

export type PedidoTse = {
	url: string;
	ifNoneMatch: string | null;
};

export type ModoProporcionais = "real" | "cadeiras";

export type OpcoesTseFalso = {
	/** Padrão: "real" (gravação atual). "cadeiras" começa na derivada e avança para a real. */
	proporcionais?: ModoProporcionais;
};

export type TseFalso = {
	indice: number;
	indiceProp: number;
	indiceGov: number;
	pedidos: PedidoTse[];
	avancar: () => void;
	avancarProporcionais: () => void;
	/** Avança a sequência do Governador (real → quase-fim). */
	avancarGovernador: () => void;
	/** Próxima resposta do Presidente será 429 com este Retry-After (segundos). */
	simular429: (retryAfter: number) => void;
	/** Próxima resposta do Presidente será erro HTTP genérico. */
	simularErro: (status?: number) => void;
	/**
	 * Sobrescreve o Cache-Control do próximo 200/304 de todos os arquivos
	 * (útil para testar max(30 s, max-age) com valor controlado).
	 */
	definirCacheControl: (cacheControl: string) => void;
	urlPresidente: string;
	urlDepfed: string;
	urlDepest: string;
};

type ModoEspecial =
	| { tipo: "429"; retryAfter: number }
	| { tipo: "erro"; status: number }
	| null;

/** Instala o handler MSW que serve a sequência atual do TSE falso. */
export function instalarTseFalso(opcoes: OpcoesTseFalso = {}): TseFalso {
	const estado = {
		indice: 0,
		indiceProp: 0,
		indiceGov: 0,
		pedidos: [] as PedidoTse[],
		modo: null as ModoEspecial,
		cacheControlOverride: null as string | null,
	};
	const modoProp = opcoes.proporcionais ?? "real";

	const propAtual = () => {
		if (modoProp === "cadeiras") {
			return PROP_CADEIRAS[estado.indiceProp] ?? PROP_CADEIRAS.at(-1)!;
		}
		return {
			ciclo: PROP_REAL.ciclo,
			depfed: PROP_REAL.depfed,
			depest: PROP_REAL.depest,
		};
	};

	const responderArquivo = (
		url: string,
		ifNoneMatch: string | null,
		atual: { etag: string; cacheControl: string; corpo: object },
	) => {
		estado.pedidos.push({ url, ifNoneMatch });
		const cacheControl = estado.cacheControlOverride ?? atual.cacheControl;

		if (ifNoneMatch && ifNoneMatch === atual.etag) {
			return new HttpResponse(null, {
				status: 304,
				headers: {
					etag: atual.etag,
					"cache-control": cacheControl,
				},
			});
		}
		return HttpResponse.json(atual.corpo, {
			headers: {
				etag: atual.etag,
				"cache-control": cacheControl,
			},
		});
	};

	network.use(
		http.get(URLS_TSE.presidente, ({ request }) => {
			const ifNoneMatch = request.headers.get("if-none-match");
			if (estado.modo?.tipo === "429") {
				const retryAfter = estado.modo.retryAfter;
				estado.modo = null;
				estado.pedidos.push({ url: request.url, ifNoneMatch });
				return new HttpResponse("calma", {
					status: 429,
					headers: { "retry-after": String(retryAfter) },
				});
			}
			if (estado.modo?.tipo === "erro") {
				const status = estado.modo.status;
				estado.modo = null;
				estado.pedidos.push({ url: request.url, ifNoneMatch });
				return new HttpResponse("falha", { status });
			}
			const atual = SEQUENCIA_PRESIDENTE[estado.indice];
			if (!atual) {
				return new HttpResponse("fixture esgotada", { status: 500 });
			}
			return responderArquivo(request.url, ifNoneMatch, atual);
		}),
		http.get(URLS_TSE.governador, ({ request }) => {
			const atual =
				SEQUENCIA_GOVERNADOR[estado.indiceGov] ??
				SEQUENCIA_GOVERNADOR.at(-1)!;
			return responderArquivo(
				request.url,
				request.headers.get("if-none-match"),
				atual,
			);
		}),
		http.get(URLS_TSE.senador, ({ request }) =>
			responderArquivo(
				request.url,
				request.headers.get("if-none-match"),
				FIXTURES_PA.senador,
			),
		),
		http.get(URLS_TSE.depfed, ({ request }) =>
			responderArquivo(
				request.url,
				request.headers.get("if-none-match"),
				propAtual().depfed,
			),
		),
		http.get(URLS_TSE.depest, ({ request }) =>
			responderArquivo(
				request.url,
				request.headers.get("if-none-match"),
				propAtual().depest,
			),
		),
	);

	return {
		get indice() {
			return estado.indice;
		},
		get indiceProp() {
			return estado.indiceProp;
		},
		get indiceGov() {
			return estado.indiceGov;
		},
		get pedidos() {
			return estado.pedidos;
		},
		avancar() {
			estado.indice += 1;
		},
		avancarProporcionais() {
			estado.indiceProp += 1;
		},
		avancarGovernador() {
			estado.indiceGov += 1;
		},
		simular429(retryAfter: number) {
			estado.modo = { tipo: "429", retryAfter };
		},
		simularErro(status = 503) {
			estado.modo = { tipo: "erro", status };
		},
		definirCacheControl(cacheControl: string) {
			estado.cacheControlOverride = cacheControl;
		},
		urlPresidente: URLS_TSE.presidente,
		urlDepfed: URLS_TSE.depfed,
		urlDepest: URLS_TSE.depest,
	};
}
