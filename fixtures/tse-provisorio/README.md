# Fixtures reais do TSE (04/10/2026)

Sequência real das respostas brutas do TSE, recortada da gravação das
**21:04 BRT** (ainda em andamento). Cada pasta é um ciclo; só entram os
arquivos que o gravador registrou naquele instante. Metadados (ETag,
cache-control, URL) estão em `indice.jsonl`.

## Ciclos no repositório

| Ciclo | Papel |
| --- | --- |
| `2026-10-04T21-36-05-598Z` | Início — leitura completa (5 cargos + Presidente nas 27 UFs e exterior) |
| `2026-10-04T21-38-48-884Z` | Antes da troca de cadeira (Dep. Federal: PSB 2 / PSD 1) |
| `2026-10-04T21-39-46-908Z` | Depois da troca (PSB 1 / PSD 2) + 2ª leitura de Presidente |
| `2026-10-04T21-44-49-070Z` | 3ª leitura de Presidente (tendência) |
| `2026-10-04T23-17-25-721Z` | Meio da noite |
| `2026-10-05T00-01-02-086Z` | Mais recente da cópia (~97% no Pará; margem do Governador fora de alcance) |

Também: `ele-c.json` (config oficial do TSE). O gravador guardou o arquivo na
raiz da gravação, sem linha própria de ETag/cache-control no `indice.jsonl`.

## O que os testes exercitam

- Avanço da apuração (Presidente em 3 leituras → tendência).
- Troca real de cadeiras entre agremiações (PSD/PSB).
- Arquivo sem mudança → 304 via ETag (`If-None-Match`).
- Presidente por UF / exterior com ETags reais do índice.
- Governador quase no fim (leitura mais recente), sem fixture sintética.

Origem: `gravacao-tse-2104.tar.gz` (cópia do gravador às 21:04 BRT). Ignorar `._*` (lixo do macOS).
