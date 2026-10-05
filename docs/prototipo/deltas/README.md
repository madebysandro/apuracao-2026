# Protótipo throwaway — deltas mínimos do arquivo (1º turno encerrado)

**Pergunta:** três variantes de delta mínimo do estado de arquivo da eleição encerrada, no look de produção, trocáveis via `?variant=`.

**OVERRIDE** da regra “radicalmente diferente” do `/prototype`: Sandro rejeitou redesigns. Cada variante muda só o necessário.

| `?variant=` | O que muda vs produção |
|---|---|
| **A** | Faixa **Encerrada** (não “Ao vivo”) + carimbo Arquivo; rodapé de arquivo + link TSE; sem “aguardando leituras” a 100% |
| **B** | A + placar de **Presidente acima** dos KPIs; abas em PT humano; rótulos da faixa no celular |
| **C** | B + abas ARIA (setas); waffle tocável; ticker pausável por toque |

Dados: `estado.json` congelado de `https://apuracao.madebysandro.app/api/apuracao` (encerrada:true, 100%).

Deploy: Cloudflare Pages `apuracao-proto-deltas`. Branch: `proto/deltas-arquivo`. **Não mergear na main.**

Abrir: `https://apuracao-proto-deltas.pages.dev/?variant=A` (ou B / C). Setas ← → ou a barra rosa.
