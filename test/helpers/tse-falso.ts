import { http, HttpResponse } from "msw";
import { network } from "./rede";

import cicloA from "../../fixtures/tse-provisorio/2026-10-04T21-36-05-598Z/presidente.json";
import cicloB from "../../fixtures/tse-provisorio/2026-10-04T21-39-46-908Z/presidente.json";

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

const URL_PRESIDENTE =
	"https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json";

export type TseFalso = {
	indice: number;
	avancar: () => void;
	urlPresidente: string;
};

/** Instala o handler MSW que serve a sequência atual do TSE falso. */
export function instalarTseFalso(): TseFalso {
	const estado = { indice: 0 };

	network.use(
		http.get(URL_PRESIDENTE, ({ request }) => {
			const atual = SEQUENCIA_PRESIDENTE[estado.indice];
			if (!atual) {
				return new HttpResponse("fixture esgotada", { status: 500 });
			}
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
		}),
	);

	return {
		get indice() {
			return estado.indice;
		},
		avancar() {
			estado.indice += 1;
		},
		urlPresidente: URL_PRESIDENTE,
	};
}
