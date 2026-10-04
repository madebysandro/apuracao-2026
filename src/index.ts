import { PollerApuracao } from "./poller/poller";

export { PollerApuracao };

function poller(env: Env) {
	return env.POLLER.getByName("singleton");
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/api/apuracao") {
			const estado = await poller(env).obterEstado();
			return Response.json(estado, {
				headers: { "cache-control": "no-store" },
			});
		}

		if (url.pathname.startsWith("/api/")) {
			return new Response("não achei", { status: 404 });
		}

		return env.ASSETS.fetch(request);
	},
} satisfies ExportedHandler<Env>;
