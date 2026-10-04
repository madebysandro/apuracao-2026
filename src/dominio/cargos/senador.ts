import type { ConfigTse } from "../../config/tse";
import type { Cargo, MetaCargo } from "../tipos";
import { normalizarMajoritario } from "./majoritario";
import type { DadosBrutosCargo } from "./presidente";

/** Normaliza o arquivo de Senador (Pará, 2 vagas) do TSE. */
export function normalizarSenador(
	meta: MetaCargo,
	dados: DadosBrutosCargo,
	cfg: ConfigTse,
): Cargo {
	return normalizarMajoritario(meta, dados, cfg);
}
