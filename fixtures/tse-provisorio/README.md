# Fixtures provisórias do TSE

Gravação real das respostas brutas do TSE na noite de **04/10/2026**, para os testes.

## Presidente e majoritárias

- `ele-c.json` — config oficial
- `indice.jsonl` — uma linha por ciclo/arquivo (ciclo, chave, URL, ETag, cache-control)
- `<ciclo>/presidente.json` — Presidente (Brasil)
- `<ciclo>/governador.json` / `senador.json` — Governador e Senado do Pará (quando gravados)

## Deputados do Pará (issue #6)

- `2026-10-04T21-56-47-000Z/depfed.json` — Deputado Federal (c0006), gravação real
- `2026-10-04T21-56-47-000Z/depest.json` — Deputado Estadual (c0007), gravação real
- `2026-10-04T21-56-47-000Z-derivada-antes/` — **DERIVADA** da gravação real (ver README na pasta): troca mínima de `vag` (PSD/PSB) e um candidato inválido sintético no PL, para o teste de dança de cadeiras
- `sintetica-quase-fim/governador.json` — **SINTÉTICA** (issue #5): ~99% apurado com os mesmos votos, para testar margem “fora de alcance” e “já tem a maioria (est.)”

## Presidente por UF (issue #7)

- `ufs/presidente-ufs.json` — 27 UFs + exterior (`zz`), **sintéticas** (valores controlados para placar, regiões, colégios, disputa e ritmo)
- `ufs/gerar.mjs` — regenera o JSON

**Provisórias:** a issue #2 substituirá/estenderá este conjunto com a sequência final da apuração (todos os cargos e UFs). O formato (pastas por ciclo + `indice.jsonl`) deve ser preservado.

Origem: `gravacao-tse-provisoria.tgz` anexada à issue #3; Governador/Senado na #4; Deputados na #6; UFs sintéticas na #7.
