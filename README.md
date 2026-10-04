# Apuração 2026 · Presidente e Pará

Painel público para acompanhar a apuração do 1º turno das eleições de 2026 (04/10/2026) com dados oficiais do TSE: Presidente (Brasil e por estado) e, no Pará, Governador, Senado, Deputados Federais e Deputados Estaduais.

- **Spec da implementação:** issue #1
- **Protótipo (fonte primária das decisões):** branch [`prototipo/apuracao`](../../tree/prototipo/apuracao). Para rodar: `node prototipo-apuracao/server.mjs` e abrir http://localhost:5173/?variant=D

## Fonte dos dados

API pública de resultados do TSE (`https://resultados.tse.jus.br/oficial/ele2026`). Um único Durable Object consulta o TSE para todos os visitantes, respeitando `cache-control`, ETag e respostas 429. O navegador só conversa com o nosso Worker, porque o TSE não libera CORS.

## Desenvolvimento

```bash
npm install
npm run dev          # wrangler dev
npm test             # Vitest pool de Workers + TSE falso (fixtures)
npm run typecheck
npm run deploy:dry-run
```

Endereços após o deploy:

- Domínio próprio: `https://apuracao.madebysandro.app`
- Fallback `workers.dev`: `https://apuracao-2026.<sua-subconta>.workers.dev`

## Workers Builds (Cloudflare)

Conectar o repositório para deploy a cada merge na `main`:

1. No [dashboard da Cloudflare](https://dash.cloudflare.com/?to=/:account/workers-and-pages), crie (ou selecione) o Worker com o **mesmo nome** do `wrangler.jsonc`: `apuracao-2026`.
2. Em **Settings → Builds → Connect**, conecte o GitHub `madebysandro/apuracao-2026`.
3. Configure:
   - **Production branch:** `main`
   - **Root directory:** `/` (raiz do repositório)
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`
4. Confirme que a zona `madebysandro.app` está na mesma conta — o `wrangler.jsonc` já declara a custom domain `apuracao.madebysandro.app` e mantém `workers_dev: true`.
5. Faça merge na `main` (ou um push) para disparar o primeiro build.

## Organização dos módulos (paralelismo #4 / #6 / #8)

| Área | Onde mexer | Issue |
| --- | --- | --- |
| Poller / política de consulta | `src/poller/` | #4 |
| Normalização por cargo | `src/dominio/cargos/` (um arquivo por cargo) | #4 / #6 |
| Config TSE (base e códigos) | `src/config/tse.ts` | — |
| Front Tela 1 (majoritárias) | `public/js/tela1-*.js`, `public/js/app.js` | #4 |
| Front Tela 2 (proporcionais) | `public/js/tela2-*.js` (a criar) | #6 |
| Tema / CSS / painel D / movimento | `public/css/tema.css`, `public/js/painel/`, `public/js/movimento/` | #8 |
| Fixtures TSE | `fixtures/tse-provisorio/` (provisórias; #2 substitui) | #2 |

## Fixtures provisórias

`fixtures/tse-provisorio/` contém a gravação real do TSE da noite de 04/10/2026, reduzida a Presidente (Brasil). Formato: pastas por ciclo + `indice.jsonl` + `ele-c.json`. A issue #2 deve substituir/estender esse conjunto após o fim da apuração, mantendo o formato.
