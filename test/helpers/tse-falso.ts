import { http, HttpResponse } from "msw";
import { network } from "./rede";

import cicloA from "../../fixtures/tse-provisorio/2026-10-04T21-36-05-598Z/presidente.json";
import cicloB from "../../fixtures/tse-provisorio/2026-10-04T21-39-46-908Z/presidente.json";
import depfedReal from "../../fixtures/tse-provisorio/2026-10-04T21-56-47-000Z/depfed.json";
import depestReal from "../../fixtures/tse-provisorio/2026-10-04T21-56-47-000Z/depest.json";
import depfedDerivada from "../../fixtures/tse-provisorio/2026-10-04T21-56-47-000Z-derivada-antes/depfed.json";
import depestDerivada from "../../fixtures/tse-provisorio/2026-10-04T21-56-47-000Z-derivada-antes/depest.json";

/**
 * Sequência provisória de Presidente (Brasil) gravada em 04/10/2026.
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

const URL_PRESIDENTE =
	"https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json";
const URL_DEPFED =
	"https://resultados.tse.jus.br/oficial/ele2026/6259/dados/pa/pa-c0006-e006259-u.json";
const URL_DEPEST =
	"https://resultados.tse.jus.br/oficial/ele2026/6259/dados/pa/pa-c0007-e006259-u.json";

export type ModoProporcionais = "real" | "cadeiras";

export type OpcoesTseFalso = {
	/** Padrão: "real" (gravação atual). "cadeiras" começa na derivada e avança para a real. */
	proporcionais?: ModoProporcionais;
};

export type TseFalso = {
	indice: number;
	indiceProp: number;
	avancar: () => void;
	avancarProporcionais: () => void;
	urlPresidente: string;
	urlDepfed: string;
	urlDepest: string;
};

function responderArquivo(
	request: { headers: { get(name: string): string | null } },
	atual: { etag: string; cacheControl: string; corpo: object },
) {
	const inm = request.headers.get("if-none-match");
	if (inm && inm === atual.etag) {
		return new HttpResponse(null, {
			status: 304,
			headers: {
				etag: atual.etag,
				"cache-control": atual.cacheControl,
			},
		});
	}
	return HttpResponse.json(atual.corpo, {
		headers: {
			etag: atual.etag,
			"cache-control": atual.cacheControl,
		},
	});
}

/** Instala o handler MSW que serve a sequência atual do TSE falso. */
export function instalarTseFalso(opcoes: OpcoesTseFalso = {}): TseFalso {
	const estado = { indice: 0, indiceProp: 0 };
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

	network.use(
		http.get(URL_PRESIDENTE, ({ request }) => {
			const atual = SEQUENCIA_PRESIDENTE[estado.indice];
			if (!atual) {
				return new HttpResponse("fixture esgotada", { status: 500 });
			}
			return responderArquivo(request, atual);
		}),
		http.get(URL_DEPFED, ({ request }) =>
			responderArquivo(request, propAtual().depfed),
		),
		http.get(URL_DEPEST, ({ request }) =>
			responderArquivo(request, propAtual().depest),
		),
	);

	return {
		get indice() {
			return estado.indice;
		},
		get indiceProp() {
			return estado.indiceProp;
		},
		avancar() {
			estado.indice += 1;
		},
		avancarProporcionais() {
			estado.indiceProp += 1;
		},
		urlPresidente: URL_PRESIDENTE,
		urlDepfed: URL_DEPFED,
		urlDepest: URL_DEPEST,
	};
}
