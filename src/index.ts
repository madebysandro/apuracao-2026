import { PollerApuracao } from "./poller/poller";

export { PollerApuracao };

/** Cache curto na borda: muitos visitantes não viram uma chamada ao DO cada um. */
const CACHE_API_APURACAO =
	"public, max-age=0, s-maxage=5, must-revalidate";

function poller(env: Env) {
	return env.POLLER.getByName("singleton");
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/api/apuracao") {
			const estado = await poller(env).obterEstado();
			return Response.json(estado, {
				headers: { "cache-control": CACHE_API_APURACAO },
			});
		}

		if (url.pathname.startsWith("/api/")) {
			return new Response("não achei", { status: 404 });
		}

		return env.ASSETS.fetch(request);
	},
} satisfies ExportedHandler<Env>;
