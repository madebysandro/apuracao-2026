import type { ConfigTse } from "../../config/tse";
import type { Cargo, MetaCargo } from "../tipos";
import type { DadosBrutosCargo } from "./dados-brutos";
import { normalizarMajoritario } from "./majoritario";

export type { DadosBrutosCargo } from "./dados-brutos";

/**
 * Normaliza o arquivo de Presidente (Brasil) do TSE.
 * Separado por cargo para a issue #4/#6 poderem mexer em arquivos diferentes.
 */
export function normalizarPresidente(
	meta: MetaCargo,
	dados: DadosBrutosCargo,
	cfg: ConfigTse,
): Cargo {
	return normalizarMajoritario(meta, dados, cfg);
}
