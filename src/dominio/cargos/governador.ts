import type { ConfigTse } from "../../config/tse";
import type { Cargo, MetaCargo } from "../tipos";
import { normalizarMajoritario } from "./majoritario";
import type { DadosBrutosCargo } from "./presidente";

/** Normaliza o arquivo de Governador (Pará) do TSE. */
export function normalizarGovernador(
	meta: MetaCargo,
	dados: DadosBrutosCargo,
	cfg: ConfigTse,
): Cargo {
	return normalizarMajoritario(meta, dados, cfg);
}
