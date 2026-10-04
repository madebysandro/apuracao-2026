# Fixtures provisórias do TSE

Gravação real das respostas brutas do TSE na noite de **04/10/2026**, para os testes.

## Presidente (Brasil)

- `ele-c.json` — config oficial
- `indice.jsonl` — uma linha por ciclo em que o arquivo mudou (ciclo, chave, URL, ETag, cache-control)
- `<ciclo>/presidente.json` — corpo JSON daquele ciclo

## Deputados do Pará (issue #6)

- `2026-10-04T21-56-47-000Z/depfed.json` — Deputado Federal (c0006), gravação real
- `2026-10-04T21-56-47-000Z/depest.json` — Deputado Estadual (c0007), gravação real
- `2026-10-04T21-56-47-000Z-derivada-antes/` — **DERIVADA** da gravação real (ver README na pasta): troca mínima de `vag` (PSD/PSB) e um candidato inválido sintético no PL, para o teste de dança de cadeiras

**Provisórias:** a issue #2 substituirá/estenderá este conjunto com a sequência final da apuração (todos os cargos e UFs). O formato (pastas por ciclo + `indice.jsonl`) deve ser preservado.
