import { setupNetwork } from "@msw/cloudflare";

/** Rede MSW compartilhada — intercepta o fetch de saída do Worker/DO para o TSE. */
export const network = setupNetwork();
