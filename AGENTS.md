# Agentes

- Workflow: crie ou use uma issue antes de código; siga `/implement` (TDD, typecheck, testes, code-review); abra o PR com `Closes #N` e, no corpo, a saída de `npm test` e `npm run build` mais o resumo do code-review.
- Fidelidade: tag `prototipo-painel-v1`, checklist `docs/prototipo/README.md`, variante D. Guardrail: barra rosa, variantes A/B/C, Three.js, mascotes e confetti ficam de fora.
- Docs: poller e deploy no README; checklist visual em `docs/prototipo/README.md`.
- Deploy: produção só na `main`, pela Cloudflare Workers Builds; sem preview de branch.
- Rules: se `.cursor/rules/ponytail.mdc` não carregar no boot do cloud agent, releia o arquivo do disco.
