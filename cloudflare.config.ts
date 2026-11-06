import { bindings, defineConfig, defineWorker, exports } from "cf/config";
import * as entrypoint from "./src/index.ts" with { type: "cf-worker" };

const worker = defineWorker({
	name: "apuracao-2026",
	compatibilityDate: "2026-08-22",
	entrypoint,
	workersDev: true,
	cache: {
		enabled: true,
	},
	observability: {
		enabled: true,
		traces: {
			enabled: true,
		},
	},
	assets: {
		runWorkerFirst: [
			"/api/*",
		],
	},
	domains: [
		"apuracao.madebysandro.app",
	],
	exports: {
		PollerApuracao: exports.durableObject({ storage: "sqlite" }),
	},
	env: {
		TSE_BASE: bindings.text("https://resultados.tse.jus.br/oficial"),
		ELEICAO_FEDERAL: bindings.text("6257"),
		ELEICAO_ESTADUAL: bindings.text("6259"),
		ASSETS: bindings.assets(),
	},
});

export default defineConfig({
	worker: {
		...worker,
		env: {
			...worker.env,
			POLLER: bindings.durableObject({
				worker,
				exportName: "PollerApuracao",
			}),
		},
	},
});
