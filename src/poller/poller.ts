import { DurableObject } from "cloudflare:workers";
import {
	configTseDeEnv,
	metasCargos,
	urlArquivoCargo,
	type ConfigTse,
} from "../config/tse";
import {
	normalizarPresidente,
	type DadosBrutosCargo,
} from "../dominio/cargos/presidente";
import {
	ehCargoProporcional,
	normalizarProporcional,
} from "../dominio/cargos/proporcional";
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
} from "../dominio/tipos";
import { buscarArquivoTse, ErroTse } from "./cliente-tse";
import { montarLeitura } from "./historico";
import { fonteVariacoesDo } from "./variacoes-do";

const CHAVE_ESTADO = "estado";
const CHAVE_ETAGS = "etags";
const CHAVE_HISTORICO = "historico";

type Etags = Record<string, string>;

function estadoVazio(): EstadoApuracao {
	return {
		versao: 0,
		consultadoEm: null,
		proximaConsulta: null,
		erro: null,
		cargos: {},
		analise: { proporcionais: {} },
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
		const variacoes = fonteVariacoesDo(this.ctx.storage);
		const analiseProp: NonNullable<AnaliseApuracao["proporcionais"]> = {
			...(estado.analise?.proporcionais ?? {}),
		};

		let esperaSegundos = 60;
		try {
			let mudou = false;
			for (const meta of metasCargos(cfg)) {
				const url = urlArquivoCargo(cfg, meta);
				const { maxAge, json, etag } = await buscarArquivoTse(
					url,
					etags[meta.id],
				);
				esperaSegundos = Math.max(30, maxAge);
				if (etag) etags[meta.id] = etag;
				if (!json) continue;

				let novo: Cargo;
				if (meta.id === "presidente") {
					novo = normalizarPresidente(
						meta,
						json as DadosBrutosCargo,
						cfg,
					);
				} else if (ehCargoProporcional(meta.id)) {
					novo = normalizarProporcional(
						meta,
						json as DadosBrutosCargo,
						cfg,
					);
					const anterior = await variacoes.obterAnterior(meta.id);
					const primeiro = await variacoes.obterPrimeiro(meta.id);
					const enriquecido = aplicarVariacoes(
						novo,
						anterior,
						primeiro,
					);
					analiseProp[meta.id] = analiseProporcional(enriquecido);
					if (cargoMudou(estado.cargos[meta.id], novo)) {
						await variacoes.registrar(
							meta.id,
							instantaneoDe(novo),
						);
					}
					novo = enriquecido;
				} else {
					// Governador/Senado entram na issue #4.
					continue;
				}

				if (cargoMudou(estado.cargos[meta.id], novo)) mudou = true;
				estado.cargos[meta.id] = novo;
			}

			estado.analise = { proporcionais: analiseProp };

			if (mudou) {
				estado.versao += 1;
				await this.registrarLeitura(estado);
			}
			estado.erro = null;
		} catch (erro) {
			const e = erro as ErroTse;
			estado.erro = e.message ?? String(erro);
			esperaSegundos =
				e.espera ??
				Math.min(Math.max(esperaSegundos, 60) * 2, 600);
		}

		estado.consultadoEm = Date.now();
		estado.proximaConsulta = Date.now() + esperaSegundos * 1000;
		await this.ctx.storage.put(CHAVE_ESTADO, estado);
		await this.ctx.storage.put(CHAVE_ETAGS, etags);
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
