import { http, HttpResponse } from "msw";
import { network } from "./rede";

import cicloA from "../../fixtures/tse-provisorio/2026-10-04T21-36-05-598Z/presidente.json";
import cicloB from "../../fixtures/tse-provisorio/2026-10-04T21-39-46-908Z/presidente.json";
import governador from "../../fixtures/tse-provisorio/2026-10-04T21-57-01-000Z/governador.json";
import senador from "../../fixtures/tse-provisorio/2026-10-04T21-57-01-000Z/senador.json";

/**
 * Sequência provisória gravada em 04/10/2026.
 * A issue #2 substituirá/estenderá estas fixtures; o mecanismo (índice + avanço)
 * permanece.
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
] as const;

const FIXTURES_PA = {
	governador: {
		etag: '"7b3afcbce1289c6f7258c539ff158bd1"',
		cacheControl: "max-age=50",
		corpo: governador,
	},
	senador: {
		etag: '"fc182858b3f6823b19fb155edb20e63d"',
		cacheControl: "max-age=58",
		corpo: senador,
	},
} as const;

export const URLS_TSE = {
	presidente:
		"https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json",
	governador:
		"https://resultados.tse.jus.br/oficial/ele2026/6259/dados/pa/pa-c0003-e006259-u.json",
	senador:
		"https://resultados.tse.jus.br/oficial/ele2026/6259/dados/pa/pa-c0005-e006259-u.json",
} as const;

export type PedidoTse = {
	url: string;
	ifNoneMatch: string | null;
};

export type TseFalso = {
	indice: number;
	pedidos: PedidoTse[];
	avancar: () => void;
	/** Próxima resposta do Presidente será 429 com este Retry-After (segundos). */
	simular429: (retryAfter: number) => void;
	/** Próxima resposta do Presidente será erro HTTP genérico. */
	simularErro: (status?: number) => void;
	/** Sobrescreve o Cache-Control do próximo 200/304 do Presidente. */
	definirCacheControlPresidente: (cacheControl: string) => void;
	urlPresidente: string;
};

type ModoEspecial =
	| { tipo: "429"; retryAfter: number }
	| { tipo: "erro"; status: number }
	| null;

/** Instala o handler MSW que serve a sequência atual do TSE falso. */
export function instalarTseFalso(): TseFalso {
	const estado = {
		indice: 0,
		pedidos: [] as PedidoTse[],
		modo: null as ModoEspecial,
		cacheControlPresidente: null as string | null,
	};

	const responderArquivo = (
		url: string,
		ifNoneMatch: string | null,
		atual: { etag: string; cacheControl: string; corpo: object },
	) => {
		estado.pedidos.push({ url, ifNoneMatch });
		const cacheControl =
			estado.cacheControlPresidente && url === URLS_TSE.presidente
				? estado.cacheControlPresidente
				: atual.cacheControl;
		if (estado.cacheControlPresidente && url === URLS_TSE.presidente) {
			estado.cacheControlPresidente = null;
		}

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
		http.get(URLS_TSE.governador, ({ request }) =>
			responderArquivo(
				request.url,
				request.headers.get("if-none-match"),
				FIXTURES_PA.governador,
			),
		),
		http.get(URLS_TSE.senador, ({ request }) =>
			responderArquivo(
				request.url,
				request.headers.get("if-none-match"),
				FIXTURES_PA.senador,
			),
		),
	);

	return {
		get indice() {
			return estado.indice;
		},
		get pedidos() {
			return estado.pedidos;
		},
		avancar() {
			estado.indice += 1;
		},
		simular429(retryAfter: number) {
			estado.modo = { tipo: "429", retryAfter };
		},
		simularErro(status = 503) {
			estado.modo = { tipo: "erro", status };
		},
		definirCacheControlPresidente(cacheControl: string) {
			estado.cacheControlPresidente = cacheControl;
		},
		urlPresidente: URLS_TSE.presidente,
	};
}
