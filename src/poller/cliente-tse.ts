export type RespostaTse =
	| { maxAge: number; json: unknown; etag: string | null }
	| { maxAge: number; json: null; etag: string | null };

export class ErroTse extends Error {
	espera?: number;
	constructor(message: string, espera?: number) {
		super(message);
		this.name = "ErroTse";
		this.espera = espera;
	}
}

/**
 * Busca um arquivo do TSE com If-None-Match e devolve o max-age do cache-control.
 * Isolado do Durable Object para a política de consulta poder evoluir (#4) sem
 * misturar com normalização ou front.
 */
export async function buscarArquivoTse(
	url: string,
	etagAnterior: string | null | undefined,
): Promise<RespostaTse> {
	const headers: Record<string, string> = {};
	if (etagAnterior) headers["if-none-match"] = etagAnterior;

	const resposta = await fetch(url, { headers });

	if (resposta.status === 429) {
		const retry = Number(resposta.headers.get("retry-after")) || 120;
		throw new ErroTse("TSE pediu calma (429)", retry);
	}

	const maxAge = Number(
		/max-age=(\d+)/.exec(resposta.headers.get("cache-control") ?? "")?.[1] ??
			60,
	);
	const etag = resposta.headers.get("etag");

	if (resposta.status === 304) {
		return { maxAge, json: null, etag: etag ?? etagAnterior ?? null };
	}
	if (!resposta.ok) {
		throw new ErroTse(`TSE respondeu ${resposta.status} para ${url}`);
	}

	return { maxAge, json: await resposta.json(), etag };
}
