/** Escapa HTML para frases da faixa (textos do TSE / manuais). */
export function escHtml(texto: unknown): string {
	return String(texto ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

/** CAIXA ALTA do TSE → Nome Próprio (com da/de/do/dos/das/e em minúsculas). */
export function nomeBonito(s: string): string {
	return String(s)
		.toLowerCase()
		.replace(/(^|[\s.-])(\p{L})/gu, (_m, a: string, b: string) => a + b.toUpperCase())
		.replace(/ (Da|De|Do|Dos|Das|E) /g, (w) => w.toLowerCase());
}

export const nf = new Intl.NumberFormat("pt-BR");
export const pf = new Intl.NumberFormat("pt-BR", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});
