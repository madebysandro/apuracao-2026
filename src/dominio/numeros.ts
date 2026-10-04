/** Converte números do TSE (texto com vírgula decimal) em number. */
export function numeroTse(valor: unknown): number {
	return Number(String(valor ?? "0").replace(",", ".")) || 0;
}
