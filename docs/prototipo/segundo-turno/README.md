# Protótipo descartável: 2º turno (25/10/2026)

> **Protótipo. Não mergear na `main`.** Branch: `prototipo/segundo-turno`. Nada aqui altera `src/`, `public/` ou o wrangler.
> Os números do 2º turno são **dados de exemplo** (fictícios), e há uma faixa rosa avisando isso em todas as telas.

## A pergunta

Como o Painel de produção acompanha o 2º turno, que no site é **só Presidente** (Brasil e por UF)? A ideia é fazer isso sem redesign: o mesmo tema escuro, os mesmos cartões `.db-*` e o mesmo movimento, só com os deltas necessários. O que o protótipo precisa mostrar:

- o duelo de 2 candidatos: placar grande, vantagem, % dos válidos, votos e % apurado;
- a comparação com o 1º turno: delta de cada candidato e para onde foram os votos de "outros" e da abstenção, **como estimativa**;
- as viradas e a vantagem ao longo da apuração;
- o placar por UF e por região, com as UFs que mudaram de líder em relação ao 1º turno;
- o Pará em destaque;
- o que acontece com a Tela 2 (proporcionais) e com Governador e Senado do Pará, que foram decididos no 1º turno e viram arquivo.

## Como rodar

```bash
cd docs/prototipo/segundo-turno
python3 -m http.server 8765
# http://localhost:8765/?variant=parcial        (Tela 1, 2º turno)
# http://localhost:8765/?variant=parcial&tela=2 (Tela 2, arquivo do 1º turno no Pará)
```

Para trocar de estado, use as setas ← → ou a barra rosa flutuante. As teclas 1 e 2 trocam de tela, como em produção. A barra rosa e a faixa "DADOS DE EXEMPLO" **não fazem parte do design**.

## Estados (`?variant=`)

| `variant` | Momento | O que mostra |
|---|---|---|
| `pre` | antes das 17h | O arquivo oficial do 2º turno já está publicado e zerado. A faixa diz "Aguardando 17h · Primeiros resultados às 17:00". Placar 0,00% × 0,00%, gráfico vazio, comparação só com a linha do 1º turno e o mapa cinza, com o placar de UFs do 1º turno. |
| `parcial` | ~35% apurado, 17:53 | Ao vivo. 22 na frente (Sul, Sudeste e Centro-Oeste apuram primeiro). Análise "para virar" e tendência. |
| `virada` | ~76% apurado, 18:46 | Logo depois da troca de liderança: chip "↻ virada às 18:43", marco no gráfico, linha destacada em "Momentos da noite" e resumo na faixa ("mudou a liderança em Presidente"). |
| `encerrado` | 100% | A faixa diz "Encerrada" com o carimbo "Resultado final · 2º turno", o selo "✓ Eleito" aparece e a análise passa a mostrar o resultado (comparecimento, brancos e nulos, número de viradas). |

Se não houver `variant`, o padrão é `parcial`.

## O que é real e o que é exemplo

| Real (TSE / produção) | Exemplo (fictício) |
|---|---|
| `dados/estado-1t.json`: snapshot de `https://apuracao.madebysandro.app/api/apuracao` em 11/10/2026 (1º turno final: Presidente, Governador, Senado, Deputados e as 28 UFs) | Todos os votos, percentuais, % apurado, horários e viradas do 2º turno |
| `dados/br-c0001-e006258-u.json`: arquivo oficial do 2º turno (eleição 6258, dg 10/10/2026), com os candidatos 22 (Flávio Bolsonaro, PL) e 13 (Lula, Fed. Brasil da Esperança), eleitorado de 150.238.779 e 469.329 seções | Comparecimento do 2º turno (+0,6 p.p.), brancos e nulos (4,2%), ritmo de apuração por região |
| Fotos: `…/ele2026/6258/fotos/br/{sqcand}.jpeg` (conferidas, respondem 200) | O vencedor do exemplo (Lula, com 51,6%) é **arbitrário**: serve para exercitar a virada. Os parâmetros estão no topo de `js/mock-2t.js` |

O gerador (`js/mock-2t.js`) parte da divisão F/(F+L) do 1º turno em cada UF, aplica um deslocamento uniforme e faz cada UF apurar numa janela de tempo. O resultado é determinístico, e o formato imita `/api/apuracao` + `/api/historico`. Algumas UFs têm roteiro próprio (AM, MG e TO) para que haja viradas em relação ao 1º turno nos dois sentidos.

## Arquivos

- `index.html`: cópia da página de produção (faixa de status igual), com o caminho relativo.
- `css/tokens.css` e `css/tema.css`: **cópia literal** da produção. `css/proto-2t.css` traz só os blocos novos (`.t2-*`), o estado "aguardando" da faixa, a barra e a faixa do protótipo.
- `js/*.js` e `js/movimento/*`: cópia da produção. Os únicos patches estão marcados com `PROTO-2T`:
  - `arquivo.js`: modo "aguardando" e carimbo vindo do estado;
  - `movimento/faixa-status.js`: classe `.aguardando`;
  - `tela1-cartao.js`: "eleito no 1º turno" em vez de "lidera" quando o cartão é arquivo.
- `js/app-2t.js`: entrada, que substitui o `app.js`. `js/tela-2t.js`: os cartões novos. `js/mock-2t.js`: os dados de exemplo. `js/proto-switcher.js`: a barra.

## Verificação

Rodei um smoke com Playwright (Chromium headless) em `?variant=pre|parcial|virada|encerrado` (Tela 1) e em `parcial&tela=2`, a 1440 px e a 390 px:

- sem erro no console nem `pageerror`;
- nenhum texto "Falha", `undefined` ou `NaN`;
- a faixa "DADOS DE EXEMPLO" aparece;
- sem rolagem horizontal.

Todos os 10 casos passaram. Também testei o link do Pará para a Tela 2, a tecla 1, a seta → da barra, a tooltip do gráfico e o tema claro. As capturas ficaram em `/tmp/proto2t-shots/`, fora do repositório.

## Decisões e perguntas em aberto

Estão em [DESIGN-NOTAS.md](DESIGN-NOTAS.md).
