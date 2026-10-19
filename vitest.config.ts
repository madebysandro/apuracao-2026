import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		cloudflareTest({
			wrangler: { configPath: "./wrangler.jsonc" },
		}),
	],
	test: {
		// Vitest 5.0.4+ liga o fsModuleCache e manda o worker ler
		// node_modules/.vitest-cache/<hash>. O arquivo existe no host, mas o
		// workerd do @cloudflare/vitest-pool-workers@0.23 não enxerga esse
		// disco (readAll). O pacote está congelado e não embute o conteúdo no
		// RPC, como faz o @cloudflare/vitest-plugin. Sem isso, os 8 arquivos
		// de teste falham ao carregar.
		fsModuleCache: false,
		setupFiles: ["./test/setup.ts"],
	},
});
