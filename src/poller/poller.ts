import { DurableObject } from "cloudflare:workers";
import {
	configTseDeEnv,
	metasCargos,
	urlArquivoCargo,
	type ConfigTse,
} from "../config/tse";
import { SIGLAS_UF, urlPresidenteUf } from "../config/ufs";
import { normalizarGovernador } from "../dominio/cargos/governador";
import {
	normalizarPresidente,
	type DadosBrutosCargo,
} from "../dominio/cargos/presidente";
import {
	normalizarPresidenteUf,
	ufMudou,
} from "../dominio/cargos/presidente-uf";
import {
	ehCargoProporcional,
	normalizarProporcional,
} from "../dominio/cargos/proporcional";
import { normalizarSenador } from "../dominio/cargos/senador";
import { montarDestaques } from "../dominio/destaques";
import { analisarMajoritarias } from "../dominio/majoritarias/analise";
import {
	analiseProporcional,
	aplicarVariacoes,
	instantaneoDe,
} from "../dominio/proporcionais/variacoes";
import type {
	AnaliseApuracao,
	Cargo,
	EstadoApuracao,
	Leitura,
	MetaCargo,
	UfPresidente,
} from "../dominio/tipos";
import { buscarArquivoTse, ErroTse } from "./cliente-tse";
import { escoposProntosParaEncerrar } from "./encerrada";
import { montarLeitura } from "./historico";
import { fonteVariacoesDo } from "./variacoes-do";

const CHAVE_ESTADO = "estado";
const CHAVE_ETAGS = "etags";
const CHAVE_HISTORICO = "historico";
const CHAVE_BACKOFF = "backoffSegundos";

type Etags = Record<string, string>;

function estadoVazio(): EstadoApuracao {
	return {
		versao: 0,
		consultadoEm: null,
		proximaConsulta: null,
		erro: null,
		cargos: {},
		ufs: {},
		analise: { majoritarias: {}, proporcionais: {}, destaques: [] },
	};
}

function cargoMudou(antes: Cargo | undefined, novo: Cargo): boolean {
	if (!antes) return true;
	if (antes.apurado !== novo.apurado) return true;
	if (
		antes.candidatos.some((c, i) => c.votos !== novo.candidatos[i]?.votos)
	) {
		return true;
	}
	// Proporcionais: a dança de cadeiras pode mudar só o `vag`.
	const agrAntes = antes.agremiacoes ?? [];
	const agrNovo = novo.agremiacoes ?? [];
	if (agrAntes.length !== agrNovo.length) return true;
	const mapa = new Map(agrAntes.map((a) => [a.sigla, a.vagas]));
	return agrNovo.some((a) => mapa.get(a.sigla) !== a.vagas);
}

function normalizarCargo(
	meta: MetaCargo,
	json: DadosBrutosCargo,
	cfg: ConfigTse,
): Cargo | null {
	if (meta.id === "presidente") return normalizarPresidente(meta, json, cfg);
	if (meta.id === "governador") return normalizarGovernador(meta, json, cfg);
	if (meta.id === "senador") return normalizarSenador(meta, json, cfg);
	if (ehCargoProporcional(meta.id)) {
		return normalizarProporcional(meta, json, cfg);
	}
	return null;
}

/**
 * Durable Object singleton: único poller do TSE para todos os visitantes.
 * Intervalo via alarme (respeita max-age / Retry-After), não Cron Trigger.
 * Estado + histórico ficam no storage do DO.
 */
export class PollerApuracao extends DurableObject<Env> {
	private cfg(): ConfigTse {
		return configTseDeEnv(this.env);
	}

	private async lerEstado(): Promise<EstadoApuracao> {
		return (
			(await this.ctx.storage.get<EstadoApuracao>(CHAVE_ESTADO)) ??
			estadoVazio()
		);
	}

	async obterEstado(): Promise<EstadoApuracao> {
		await this.garantirAlarme();
		return this.lerEstado();
	}

	/** Leituras posteriores a `desde` (para tendência e minigráficos na Tela 1). */
	async obterHistorico(desde = 0): Promise<Leitura[]> {
		const historico =
			(await this.ctx.storage.get<Leitura[]>(CHAVE_HISTORICO)) ?? [];
		return historico.filter((p) => p.t > desde);
	}

	/** Força um ciclo de consulta (usado nos testes e no primeiro aquecimento). */
	async consultarAgora(): Promise<EstadoApuracao> {
		await this.consultar();
		return this.lerEstado();
	}

	async alarm(): Promise<void> {
		await this.consultar();
	}

	private async garantirAlarme(): Promise<void> {
		const estado = await this.lerEstado();
		// #19: depois do fim, visitante não religa o alarme.
		if (estado.encerrada) return;

		const alarme = await this.ctx.storage.getAlarm();
		if (alarme != null) return;

		if (estado.consultadoEm == null) {
			// Primeira visita: consulta já e agenda o próximo ciclo.
			await this.consultar();
			return;
		}
		await this.ctx.storage.setAlarm(Date.now() + 30_000);
	}

	private async consultar(): Promise<void> {
		const cfg = this.cfg();
		const estado = await this.lerEstado();
		// Já encerrada: não consulta de novo nem reabre o alarme (#19).
		if (estado.encerrada) return;

		const etags =
			(await this.ctx.storage.get<Etags>(CHAVE_ETAGS)) ?? {};
		const backoffAnterior =
			(await this.ctx.storage.get<number>(CHAVE_BACKOFF)) ?? null;
		const variacoes = fonteVariacoesDo(this.ctx.storage);
		const analiseProp: NonNullable<AnaliseApuracao["proporcionais"]> = {
			...(estado.analise?.proporcionais ?? {}),
		};

		let maxAgeCiclo = 0;
		let novoBackoff: number | null = null;
		/** Ciclo sem falha e sem arquivo faltando (304 órfão / UF com erro). */
		let cicloCompleto = true;
		const tfPorEscopo: Record<string, string | undefined> = {
			...(estado.tfPorEscopo ?? {}),
		};

		const guardarTfEscopo = (chave: string, bruto: DadosBrutosCargo) => {
			// Último tf do 200; 304 seguinte reutiliza este valor (#19).
			tfPorEscopo[chave] =
				bruto.tf == null || bruto.tf === ""
					? undefined
					: String(bruto.tf);
		};

		try {
			let mudou = false;
			const metas = metasCargos(cfg);
			for (const meta of metas) {
				const url = urlArquivoCargo(cfg, meta);
				const { maxAge, json, etag } = await buscarArquivoTse(
					url,
					etags[meta.id],
				);
				maxAgeCiclo = Math.max(maxAgeCiclo, maxAge);
				if (etag) etags[meta.id] = etag;
				if (!json) {
					// 304 sem dado prévio: ciclo parcial — não encerra (#19).
					// 304 com dado guardado: apurado/tf do último 200 seguem válidos.
					if (!estado.cargos[meta.id]) cicloCompleto = false;
					continue;
				}
				const bruto = json as DadosBrutosCargo;
				guardarTfEscopo(meta.id, bruto);

				let novo = normalizarCargo(meta, bruto, cfg);
				if (!novo) {
					cicloCompleto = false;
					continue;
				}

				if (ehCargoProporcional(meta.id)) {
					const anterior = await variacoes.obterAnterior(meta.id);
					const primeiro = await variacoes.obterPrimeiro(meta.id);
					const series = await variacoes.obterSeries(meta.id);
					const enriquecido = aplicarVariacoes(
						novo,
						anterior,
						primeiro,
						series,
					);
					analiseProp[meta.id] = analiseProporcional(enriquecido);
					if (cargoMudou(estado.cargos[meta.id], novo)) {
						await variacoes.registrar(
							meta.id,
							instantaneoDe(novo),
						);
					}
					novo = enriquecido;
				}

				if (cargoMudou(estado.cargos[meta.id], novo)) mudou = true;
				estado.cargos[meta.id] = novo;
			}

			// 27 UFs + exterior, em sequência; falha numa UF não derruba o ciclo (só 429).
			// ETag de UF só entra no mapa junto com o dado correspondente (evita 304 órfão).
			const ufs: Record<string, UfPresidente> = {
				...(estado.ufs ?? {}),
			};
			for (const uf of SIGLAS_UF) {
				const chave = `pres-${uf}`;
				try {
					const { maxAge, json, etag } = await buscarArquivoTse(
						urlPresidenteUf(cfg, uf),
						etags[chave],
					);
					maxAgeCiclo = Math.max(maxAgeCiclo, maxAge);
					if (json) {
						const bruto = json as DadosBrutosCargo;
						guardarTfEscopo(uf, bruto);
						const novo = normalizarPresidenteUf(uf, bruto);
						if (ufMudou(ufs[uf], novo)) mudou = true;
						ufs[uf] = novo;
						if (etag) etags[chave] = etag;
						estado.ufs = ufs;
					} else if (ufs[uf] && etag) {
						// 304: só renova ETag; apurado/tf guardados continuam válidos.
						etags[chave] = etag;
					} else {
						cicloCompleto = false;
					}
				} catch (erroUf) {
					cicloCompleto = false;
					const e = erroUf as ErroTse;
					if (typeof e.espera === "number") {
						estado.ufs = ufs;
						throw e;
					}
					console.error(
						new Date().toISOString(),
						uf,
						e.message ?? String(erroUf),
					);
				}
			}
			estado.ufs = ufs;
			estado.tfPorEscopo = tfPorEscopo;

			if (mudou) {
				estado.versao += 1;
				await this.registrarLeitura(estado);
			}

			const historico =
				(await this.ctx.storage.get<Leitura[]>(CHAVE_HISTORICO)) ?? [];
			estado.analise = {
				majoritarias: analisarMajoritarias(estado.cargos, historico),
				proporcionais: analiseProp,
				destaques: montarDestaques(
					estado.cargos,
					ufs,
					historico,
					analiseProp,
				),
			};
			estado.erro = null;
			novoBackoff = null;

			const idsCargos = metas.map((m) => m.id);
			estado.encerrada =
				cicloCompleto &&
				escoposProntosParaEncerrar(estado, idsCargos, SIGLAS_UF);
		} catch (erro) {
			const e = erro as ErroTse;
			estado.erro = e.message ?? String(erro);
			// Erro / 429 neste ciclo: não marcar encerrada (nunca revoga um fim já gravado —
			// consultar() retorna cedo se estado.encerrada).
			estado.encerrada = false;
			if (typeof e.espera === "number") {
				maxAgeCiclo = e.espera;
				novoBackoff = null;
			} else {
				const base = backoffAnterior ?? 60;
				maxAgeCiclo = Math.min(base * 2, 600);
				novoBackoff = maxAgeCiclo;
			}
		}

		estado.consultadoEm = Date.now();
		await this.ctx.storage.put(CHAVE_ETAGS, etags);
		if (novoBackoff == null) {
			await this.ctx.storage.delete(CHAVE_BACKOFF);
		} else {
			await this.ctx.storage.put(CHAVE_BACKOFF, novoBackoff);
		}

		if (estado.encerrada) {
			// #19: fim da apuração — não agenda mais alarme.
			estado.proximaConsulta = null;
			await this.ctx.storage.put(CHAVE_ESTADO, estado);
			await this.ctx.storage.deleteAlarm();
			return;
		}

		// Sucesso: max(30 s, maior max-age do ciclo). Erro: Retry-After ou backoff.
		const esperaSegundos = Math.max(30, maxAgeCiclo || 60);
		estado.proximaConsulta = Date.now() + esperaSegundos * 1000;
		await this.ctx.storage.put(CHAVE_ESTADO, estado);
		await this.ctx.storage.setAlarm(estado.proximaConsulta);
	}

	private async registrarLeitura(estado: EstadoApuracao): Promise<void> {
		const historico =
			(await this.ctx.storage.get<Leitura[]>(CHAVE_HISTORICO)) ?? [];
		const leitura = montarLeitura(estado);
		const anterior = historico.at(-1);
		if (anterior && JSON.stringify(anterior.c) === JSON.stringify(leitura.c)) {
			return;
		}
		historico.push(leitura);
		await this.ctx.storage.put(CHAVE_HISTORICO, historico);
	}
}
