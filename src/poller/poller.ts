import { DurableObject } from "cloudflare:workers";
import {
	configTseDeEnv,
	metasCargos,
	urlArquivoCargo,
	type ConfigTse,
} from "../config/tse";
import { normalizarGovernador } from "../dominio/cargos/governador";
import {
	normalizarPresidente,
	type DadosBrutosCargo,
} from "../dominio/cargos/presidente";
import { normalizarSenador } from "../dominio/cargos/senador";
import type { Cargo, EstadoApuracao, Leitura, MetaCargo } from "../dominio/tipos";
import { buscarArquivoTse, ErroTse } from "./cliente-tse";
import { montarLeitura } from "./historico";

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
	};
}

function cargoMudou(antes: Cargo | undefined, novo: Cargo): boolean {
	if (!antes) return true;
	if (antes.apurado !== novo.apurado) return true;
	return antes.candidatos.some(
		(c, i) => c.votos !== novo.candidatos[i]?.votos,
	);
}

function normalizarCargo(
	meta: MetaCargo,
	json: DadosBrutosCargo,
	cfg: ConfigTse,
): Cargo | null {
	if (meta.id === "presidente") return normalizarPresidente(meta, json, cfg);
	if (meta.id === "governador") return normalizarGovernador(meta, json, cfg);
	if (meta.id === "senador") return normalizarSenador(meta, json, cfg);
	// Proporcionais entram na issue #6.
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

	/** Força um ciclo de consulta (usado nos testes e no primeiro aquecimento). */
	async consultarAgora(): Promise<EstadoApuracao> {
		await this.consultar();
		return this.lerEstado();
	}

	async alarm(): Promise<void> {
		await this.consultar();
	}

	private async garantirAlarme(): Promise<void> {
		const alarme = await this.ctx.storage.getAlarm();
		if (alarme != null) return;

		const estado = await this.lerEstado();
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
		const etags =
			(await this.ctx.storage.get<Etags>(CHAVE_ETAGS)) ?? {};
		const backoffAnterior =
			(await this.ctx.storage.get<number>(CHAVE_BACKOFF)) ?? null;

		let maxAgeCiclo = 0;
		let novoBackoff: number | null = null;

		try {
			let mudou = false;
			for (const meta of metasCargos(cfg)) {
				const url = urlArquivoCargo(cfg, meta);
				const { maxAge, json, etag } = await buscarArquivoTse(
					url,
					etags[meta.id],
				);
				maxAgeCiclo = Math.max(maxAgeCiclo, maxAge);
				if (etag) etags[meta.id] = etag;
				if (!json) continue;

				const novo = normalizarCargo(
					meta,
					json as DadosBrutosCargo,
					cfg,
				);
				if (!novo) continue;

				if (cargoMudou(estado.cargos[meta.id], novo)) mudou = true;
				estado.cargos[meta.id] = novo;
			}

			if (mudou) {
				estado.versao += 1;
				await this.registrarLeitura(estado);
			}
			estado.erro = null;
			novoBackoff = null;
		} catch (erro) {
			const e = erro as ErroTse;
			estado.erro = e.message ?? String(erro);
			if (typeof e.espera === "number") {
				maxAgeCiclo = e.espera;
				novoBackoff = null;
			} else {
				const base = backoffAnterior ?? 60;
				maxAgeCiclo = Math.min(base * 2, 600);
				novoBackoff = maxAgeCiclo;
			}
		}

		// Sucesso: max(30 s, maior max-age do ciclo). Erro: Retry-After ou backoff.
		const esperaSegundos = Math.max(30, maxAgeCiclo || 60);
		estado.consultadoEm = Date.now();
		estado.proximaConsulta = Date.now() + esperaSegundos * 1000;
		await this.ctx.storage.put(CHAVE_ESTADO, estado);
		await this.ctx.storage.put(CHAVE_ETAGS, etags);
		if (novoBackoff == null) {
			await this.ctx.storage.delete(CHAVE_BACKOFF);
		} else {
			await this.ctx.storage.put(CHAVE_BACKOFF, novoBackoff);
		}
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
