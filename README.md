# Apuração 2026 · Presidente e Pará

Painel público para acompanhar a apuração do 1º turno das eleições de 2026 (04/10/2026) com dados oficiais do TSE: Presidente (Brasil e por estado) e, no Pará, Governador, Senado, Deputados Federais e Deputados Estaduais.

- **Spec da implementação:** issue #1
- **Registro de alta fidelidade (o que a produção deve reproduzir):** [`docs/prototipo`](docs/prototipo/README.md): tokens, medidas, textos, animações com tempos e curvas, capturas, vídeos e decisões, com base na tag `prototipo-painel-v1`.
- **Protótipo (fonte primária das decisões):** branch [`prototipo/apuracao`](../../tree/prototipo/apuracao). Para rodar: `node prototipo-apuracao/server.mjs` e abrir http://localhost:5173/?variant=D

## Fonte dos dados

API pública de resultados do TSE (`https://resultados.tse.jus.br/oficial/ele2026`). Um único poller no servidor consulta o TSE para todos os visitantes, respeitando `cache-control`, ETag e respostas 429. O navegador só conversa com o nosso servidor, porque o TSE não libera CORS.
