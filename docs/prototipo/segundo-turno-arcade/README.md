# Protótipo descartável: modo arcade do 2º turno

> **Protótipo. Não mergear na `main`.** Branch: `prototipo/segundo-turno-arcade` (sai de `prototipo/segundo-turno`). Nada aqui altera `src/`, `public/` ou o wrangler.
> Todos os números do 2º turno são **dados de exemplo**, e uma faixa amarela fixa avisa isso em todas as telas.

## A pergunta

Um "modo arcade" para a noite do 2º turno (Presidente: **22 Flávio Bolsonaro × 13 Lula**), inspirado nos jogos de luta 2D do começo dos anos 90, é divertido **e** continua legível e neutro? E qual dose funciona melhor: um jogo inteiro, uma camada sobre o painel sério ou um placar neon enxuto?

## Como rodar

```bash
cd docs/prototipo/segundo-turno-arcade
python3 -m http.server 8777
# http://localhost:8777/?variant=a   (16-bit)
# http://localhost:8777/?variant=b   (HUD sobre o painel)
# http://localhost:8777/?variant=c   (neon minimalista)
# http://localhost:8777/?variant=ia  (imagens geradas por IA, sátira)
# acrescente &motion=reduced para testar o caminho de movimento reduzido
```

É um site estático, sem build nem CDN, só com caminhos relativos. Para trocar de variante, use as setas ← → ou a barra rosa flutuante. A barra rosa e a faixa amarela "DADOS DE EXEMPLO" **não fazem parte do design**.

## Variantes (`?variant=`)

| `variant` | O que é |
|---|---|
| `a` (padrão) | **16-bit completo.** Tela de seleção com os retratos e "VS", e escolha do cenário: **Belém, Ver-o-Peso à noite** (o Mercado de Ferro com as quatro torrinhas, a baía do Guajará e barcos regionais) ou **Brasília, o Congresso à noite** (torres gêmeas, cúpula, "prato" e espelho d'água). Depois vem a luta num canvas de 320×180 ampliado em pixel art, com linhas de varredura de CRT. Os lutadores são idênticos: quimono na cor da entidade, faixa preta, luvas brancas e o número no peito. A cabeça é a foto real pixelada. O topo tem as barras amarelas de vida com os retratos e o cronômetro no meio. |
| `b` | **HUD sobre o painel sério.** O painel aprovado do 2º turno (cópia em `painel/`) roda num iframe e acompanha o simulador leitura a leitura. Por cima dele fica uma camada arcade: barras amarelas, cronômetro, retratos, ROUND/FIGHT/REVERSAL/K.O. e as telas de seleção e de vitória. O botão **🕹 Modo arcade** liga e desliga a camada, e o painel continua por baixo. |
| `c` | **Neon minimalista.** Fundo preto, os dois rostos em anéis neon, barras finas que brilham, um cronômetro fino e um pulso de luz que cruza a tela do atacante até o atingido. Não há lutadores nem cenário. |
| `ia` | **Imagens geradas por IA (sátira).** Usa as ilustrações que o Sandro gerou com IA, sem retoque. A tela de seleção mostra a cena VS e uma ficha de cada lutador. No HUD, os retratos são recortes dos rostos. A luta acontece num palco em CSS (céu de fim de tarde e chão), com os quadros de pose recortados e sem o fundo branco. Detalhes em [Variante `ia`](#variante-ia-imagens-geradas-por-ia). |

## Regras do duelo (iguais para os dois lados)

- **Vida = % dos votos válidos** de cada um, em escala honesta de 0 a 100% (com uma marca nos 50%). Antes da 1ª seção, as barras ficam em 50/50 e o placar mostra "—".
- **Cronômetro = % que falta apurar**, arredondado para cima. Ele "zera" em 100%.
- **ROUND 1 → FIGHT!** aparecem quando a apuração começa (o 1º clique sai da tela de seleção).
- **Golpe:** a cada atualização do TSE, quem ganhou p.p. bate e o outro sente. A intensidade é `min(1, √(|Δp.p.| / 4))`, e escala o avanço, o recuo, as faíscas, o tremor e o volume do impacto. A raiz serve para que variações de 0,1 p.p. ainda apareçam.
- **Combo:** atualizações seguidas ganhando p.p. somam "N HIT COMBO", mostrado a partir de 2.
- **REVERSAL!** é a troca de liderança. Tem flash, arpejo e um registro em destaque em "Lances da noite".
- **PERFECT** aparece quando um lado leva **≥ 59% dos votos novos daquela leitura**. Num duelo em %, um sempre ganha o que o outro perde, então "ganhar sem perder" não serve de critério. O critério escolhido é vencer o lote com folga. No roteiro, acontece uma vez para cada lado.
- **K.O.** vem na leitura de 100%. Depois aparece a tela **WINNER**, com o retrato do vencedor e a mesma frase para qualquer um dos dois: *"A urna falou. Bom combate — e até a próxima eleição."*
- **Aura** em volta de quem lidera e **retrato machucado** de quem levou o golpe: tinta vermelha, rachadura desenhada por cima e um piscar. A foto em si nunca é alterada.

O vencedor do exemplo (13, com 51,57%) é **arbitrário**: foi herdado do protótipo aprovado, que precisava de viradas para exercitar o painel. Para o roteiro terminar com o 22 na frente, basta inverter o sinal de `SWING` em `painel/js/mock-2t.js`.

## Simulador

- **▶ Próxima atualização:** avança uma leitura. O roteiro tem 14 passos (`ROTEIRO` em `js/arcade.js`) e usa leituras do mesmo gerador do protótipo aprovado: 0% → 0,6% → 2,8% → 6,3% → 12% → 16% → 28% → 52% → 60% → 67% → 78% → 91% → 97% → 100%. Ele passa pelas **3 viradas** do exemplo (13 assume aos 2,8%, 22 retoma aos 16% e 13 vira de novo aos 67%).
- **⏵ Autoplay:** uma leitura a cada 2,6 s, até o fim. O mesmo botão pausa.
- **↺ Reiniciar:** volta para a tela de seleção.
- "Lances da noite" registra cada golpe, virada, PERFECT e o K.O. Isso garante que nada se perde no modo reduzido.
- `window.__arcade` expõe `{ fase, eventos, tremidas, flashes }` para o smoke test.

## Som

- **Desligado por padrão.** O botão "🔇 Som desligado" fica sempre visível. O `AudioContext` só é criado ou retomado dentro do clique nesse botão. Desligar suspende o contexto e cancela a fala.
- Tudo é sintetizado com Web Audio, sem nenhum arquivo de áudio:
  - a trilha é uma composição original para este protótipo (Lá menor, i–VI–VII–V, 132 bpm, com melodia em onda quadrada, baixo em triângulo e chimbal/caixa de ruído filtrado);
  - os efeitos são bip de menu, impacto (ruído + queda de tom, escalado pela intensidade), arpejo de virada, acorde de PERFECT, queda de K.O. e fanfarra de vitória.
- **Voz do locutor** ("Round one", "Fight!", "Reversal!", "Perfect!", "K.O.", "Winner!"): é a voz do sistema via `speechSynthesis` (en-US, grave). Se o sistema não tiver vozes, sobra o efeito sintetizado.

## Movimento reduzido

O modo reduzido vale quando o sistema pede `prefers-reduced-motion: reduce` ou quando a URL tem `?motion=reduced` (`?motion=full` força o modo completo). O `<html>` ganha `data-motion="reduced"`, e:

- não há tremor, flash, zoom nos letreiros, rastro, faíscas, avanço ou balanço dos lutadores;
- os golpes viram **mudança de estado estática**: quem ganhou fica na pose de soco e quem perdeu na pose de dor até a próxima leitura, o retrato atingido fica com tinta e rachadura fixas (sem piscar) e o letreiro troca de texto no lugar;
- as barras mudam sem transição, e "Lances da noite" e a linha de status narram tudo em texto.

## Rostos: fotos reais, pixeladas por código

Os rostos vêm de fotos públicas com licença clara, em que os dois aparecem com expressão forte e de intensidade parecida, rindo e comemorando. A licença foi conferida na página de cada arquivo no Commons, pela API `prop=imageinfo&iiprop=extmetadata`.

| | Arquivo | Autor / crédito | Licença |
|---|---|---|---|
| 22 | [File:Entrevistas_Diversas_01.09.26.jpg](https://commons.wikimedia.org/wiki/File:Entrevistas_Diversas_01.09.26.jpg). Senador Flávio Bolsonaro concede entrevista, 01/09/2026 (origem: [Flickr da Agência Senado](https://www.flickr.com/photos/agenciasenado/55502431873/)) | Geraldo Magela/Agência Senado | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| 13 | [File:30.10.2022-_Lula,_presidente_eleito,_discursa_na_Paulista.jpg](https://commons.wikimedia.org/wiki/File:30.10.2022-_Lula,_presidente_eleito,_discursa_na_Paulista.jpg). Lula na Avenida Paulista, 30/10/2022 (origem: [Flickr Lula Oficial](https://www.flickr.com/photos/157736962@N05/52468189984/)) | Ricardo Stuckert/Lula Oficial | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |

- `dados/fotos/22-commons.jpg` e `13-commons.jpg` são **só recortes quadrados em volta da cabeça, redimensionados para 320 px** (Pillow: `crop` + `resize`). Não houve outra edição.
- No navegador, `js/rosto.js` aplica **o mesmo tratamento aos dois**: reduz para 40×40 (retratos) ou 24×24 (cabeça no palco) e quantiza a cor para RGB555, que é literalmente 16 bits. É determinístico, sem filtro, sem deformação, sem IA e sem trocar a expressão. A cabeça é sempre desenhada em pé, sem espelhar nem girar.
- Como as fotos são CC BY-SA 4.0, as versões recortadas e pixeladas também ficam sob **CC BY-SA 4.0**. O crédito aparece na tela, no rodapé, com link para a página do Commons.
- **Reserva:** se a foto do Commons não carregar, entra a foto oficial de candidatura do TSE (`dados/fotos/{sqcand}.jpeg`, a fonte do painel desde a #13: `…/ele2026/6258/fotos/br/280002551544.jpeg` e `280002542548.jpeg`). Se essa também falhar, aparece um quadro com o número. O crédito na tela acompanha o que foi usado.

## Originalidade

Este protótipo usa só as **convenções do gênero**: tela de seleção com "VS", barras de vida no alto com o cronômetro no meio, "ROUND 1 / FIGHT!", rastro e faíscas de impacto, "PERFECT", "K.O.", tela de vitória, pixel art 16-bit e CRT. Nada foi copiado de nenhum jogo:

- **Arte:** os lutadores, os cenários, as faíscas e a fonte 3×5 dos números são desenhados em código (`fillRect` em `js/palco.js`). Não há sprite, personagem, figurino icônico (o quimono é na cor da entidade, sem faixa de cabeça), logotipo nem cenário de jogo nenhum. Ver-o-Peso e Congresso são desenhos livres de lugares reais.
- **Fontes:** só as do sistema (`ui-monospace`/`system-ui`). O aspecto "em blocos" vem de sombras em degrau no CSS.
- **Som:** tudo é sintetizado na hora. A melodia foi composta para cá, não imita trilha de jogo, e as vozes são do sintetizador do sistema.
- **Nomes:** não há nome, marca ou golpe de franquia. Os termos ROUND, FIGHT, PERFECT, REVERSAL, K.O. e WINNER são vocabulário genérico de luta.
- **Neutralidade:** os dois lutadores são idênticos, com os mesmos golpes, efeitos, regras e frase de vitória. Muda só a cor (22 azul `--s1`, 13 laranja `--s2`, como no protótipo aprovado) e o número.

## Variante `ia`: imagens geradas por IA

**Origem.** As imagens foram geradas por IA pelo Sandro no Higgsfield e depois ampliadas por upscale fiel, sem edição, para 4096×3072. Os originais ficam **fora do repositório** (`/workspace/arcade-upscale/`): `cena-flavio.png`, `cena-lula.png`, `cena-vs.png`, `poses-flavio.png` e `poses-lula.png`.

**O que se fez com elas: só recortar, redimensionar e tirar o fundo branco das poses.** Nada foi retocado, recolorido ou gerado de novo. O script é `ia-recortar.py` (Pillow + numpy) e roda com `python3 -I ia-recortar.py /workspace/arcade-upscale ia`. Nas poses, o alfa sai assim: o papel é o pixel com todos os canais ≥ 226; o fundo é o papel ligado às bordas, achado por flood-fill; e fica só o boneco ligado a uma semente, outro flood-fill que descarta respingos e pedaços de poses vizinhas. Para as bordas saírem suaves, o trabalho é feito a 2× e reduzido no fim. Tudo é salvo em WebP. O `ia/manifesto.json` guarda os tamanhos, e o total fica em **~0,5 MB**.

| Arquivo em `ia/` | Fonte e recorte (coordenadas na prévia 1200×900; × 3,413 = px do original) | Saída |
|---|---|---|
| `vs.webp` | `cena-vs.png` inteira | 1600×1200 |
| `22-ficha.webp`, `13-ficha.webp` | `cena-flavio.png` e `cena-lula.png`, o **mesmo** retângulo (40,148)–(660,900): o lutador da esquerda, sem o HUD que já vem desenhado na imagem | 496×602 |
| `22-retrato.webp`, `13-retrato.webp` | o quadro de retrato que já vem no canto das mesmas cenas, (20,20)–(138,140), igual nas duas | 200×203 |
| `{22,13}-guarda/chute/golpeado/vitoria.webp` | `poses-flavio.png` e `poses-lula.png`, um retângulo por pose e sem o fundo; a mesma escala nas duas folhas (a guarda de Lula com 390 px) | 198–390 × 310–414 |

**Poses usadas, as mesmas para os dois:** guarda (parado), chute (quem ganhou p.p. na leitura), golpeado (quem perdeu) e vitória (WINNER). Os golpes, os tempos e as regras de espelhamento são idênticos: cada quadro só é espelhado se, na folha, olha para o lado oposto ao do adversário.

- **K.O. no chão: excluído.** Em `poses-lula.png`, o quadro do K.O. no chão tem o **rosto do outro candidato**. Por isso ele **nunca é usado**, nem mesmo como arquivo. Por isonomia, o K.O. no chão de `poses-flavio.png` também fica de fora. O K.O. dos dois é montado igual, a partir do quadro **golpeado** com CSS: queda para trás de 80° (girando no pé de trás, por 0,9 s), poeira e clarão branco no palco. Com movimento reduzido, aparece só a pose final deitada, sem queda, poeira ou clarão. O `ia-recortar.py` termina conferindo, por miniatura em tons de cinza, que nenhum arquivo de `ia/` se parece com os dois quadros de K.O. no chão. O `smoke.mjs` confere que `ia/` só tem os arquivos do manifesto.
- **Soco: não usado.** Em `poses-flavio.png`, a folha tem uma guarda grande a mais, que se sobrepõe a duas poses: esconde a perna da frente da guarda pequena e o pé de trás do soco. Por isso, a guarda de Flávio é a grande, reduzida à altura da de Lula, e recortada com três polígonos que só separam os vizinhos que encostam nela. Como o soco de Flávio está incompleto na fonte, o soco fica de fora **para os dois**, e o golpe é sempre o chute.

**Selo e aviso.** Toda imagem mostrada (cena VS, fichas, retratos e cada quadro de pose, inclusive no K.O. e na vitória) fica dentro de um `.ia-quadro` com o selo fixo **"Imagem gerada por IA · sátira"**. O selo é um elemento do DOM por cima da imagem, sem botão para esconder, e nos retratos pequenos usa 6,5–7 px. O rodapé fixo, sempre visível nesta variante, diz: *"Imagens criadas com IA para fins de humor. Não retratam fatos reais."* No retrato atingido, nada é pintado por cima do rosto, ao contrário das outras variantes: só a borda fica vermelha e pisca.

**Diferenças de neutralidade observadas nas imagens (registradas, não corrigidas):**

- **Partido e número:** só Lula tem marcas partidárias. Nas cenas aparecem a estrela do PT com a sigla "PT" no ombro e o "13" tatuado no braço, e nas poses, a estrela vermelha nos ombros. Flávio não tem símbolo do PL nem o número 22, só pequenos emblemas com a bandeira do Brasil e a faixa verde-amarela.
- **Roupa:** Flávio veste colete e paletó escuros de terno, com camisa branca (e gravata verde na vitória) e a faixa nas cores nacionais. Lula usa colete vermelho com faixa vermelha, a cor do partido. As duas roupas são rasgadas nos ombros, com mãos enfaixadas e musculatura parecida, e a qualidade do desenho é equivalente.
- **Torcida e cenário:** a praça é a mesma, com igreja colonial e piso de pedras portuguesas, e o adversário genérico de regata também. Muda a torcida: em `cena-flavio`, ela veste verde e amarelo, com faixa do Brasil; em `cena-lula`, aparece uma torcida de vermelho com bandeira vermelha à esquerda e outra de verde e amarelo à direita. Em `cena-vs`, a torcida de vermelho fica atrás de Flávio e a de verde e amarelo com a bandeira do Brasil, atrás de Lula.
- **Expressão:** no retrato, Flávio aparece sério, de boca fechada, e Lula sorri de boca aberta. Na luta, os dois estão de cenho franzido. Na vitória, Flávio ergue os punhos e Lula faz "V" com as duas mãos, e os dois sorriem. O quadro "golpeado" de Lula é mais teatral (cabeça jogada para trás, braços abertos e quadro mais largo) do que o de Flávio, que se encolhe.
- **Idade e escala:** Lula é desenhado mais velho (cabelo e barba brancos), com o mesmo corpo musculoso. Na mesma escala de folha, os quadros de Lula saem um pouco mais altos (chute com 414 px, contra 390 px de Flávio).
- **Qualidade das folhas:** a de Flávio tem a guarda sobreposta (veja acima). A de Lula tem o K.O. com o rosto errado. Os dois problemas foram contornados por exclusão, igual para os dois, sem edição.

## Arquivos

- `ia/` (assets WebP e `manifesto.json` da variante `ia`), `ia-recortar.py` (gera `ia/` a partir dos originais), `js/ia.js` (quadros com selo e palco da variante `ia`).
- `index.html`, `css/arcade.css`, `js/arcade.js` (estado, simulador, HUD, variantes e switcher), `js/palco.js` (canvas da variante a), `js/rosto.js` (pixelização), `js/som.js` (áudio).
- `dados/estado-1t.json`, `dados/br-c0001-e006258-u.json`: cópias do protótipo `segundo-turno`. `dados/fotos/`: as fotos do Commons recortadas e as fotos do TSE de reserva.
- `painel/`: cópia do protótipo aprovado (`docs/prototipo/segundo-turno/`). Os patches estão marcados com `ARCADE`:
  - `mock-2t.js`: fotos locais, janelas de apuração em ondas (para o exemplo ter 3 viradas) e `gerar(e1, variante, n)`;
  - `app-2t.js`: aceita `?n=` e `postMessage({ arcadeN })`;
  - `proto-switcher.js`: com `?embed`, não mostra a barra nem a faixa.

## Verificação

Smoke com Playwright (Chromium headless): `smoke.mjs`. Rode a partir de um diretório que tenha o `playwright` instalado, com o servidor de pé: `node smoke.mjs http://127.0.0.1:8777/`. As capturas ficam em `/tmp/arcade-shots/`, fora do repositório.

Cada caso cobre as 3 variantes a 1440×900 e a 390×844, com movimento completo e com `reducedMotion: 'reduce'`, além de `?motion=reduced` a 1440 px. Em todos, o smoke confere:

- que não há erro no console, `pageerror` nem requisição falha;
- a faixa "DADOS DE EXEMPLO" visível e o botão de som visível, começando desligado (`aria-pressed=false`);
- a tela de seleção com "VS" e o crédito das fotos;
- `data-motion` correto;
- que, clicando em "Próxima atualização" até o fim (14 cliques), aparecem ROUND 1, FIGHT!, REVERSAL! (3×), K.O. e a tela WINNER;
- no modo completo, que houve tremor; no reduzido, nenhum `.treme` e nenhum flash;
- que não há texto `undefined`/`NaN` nem rolagem horizontal;
- que "Reiniciar" volta para a seleção e que o som liga no clique.

Na variante (b), confere também que o painel carrega no iframe e chega a "Resultado final" e que o modo arcade desliga e volta. Por fim, o autoplay chega ao fim sozinho.

Na variante `ia`, o smoke confere também: que todo `<img>` visível tem o selo "Imagem gerada por IA · sátira" dentro do mesmo quadro (na seleção, na luta e na vitória); que o rodapé de IA está sempre visível; que o K.O. usa o quadro "golpeado", com a animação `cai-*` no modo completo e sem animação no reduzido; e que `ia/` só tem os arquivos do manifesto, sem nenhum K.O. no chão. Rode `node smoke.mjs http://127.0.0.1:8777/ /caminho/para/ia/`, já que o 2º argumento indica a pasta `ia/` quando o smoke roda copiado.

Resultado com a variante `ia` em 11/10/2026: **23/23 ok**. São 20 casos (a/b/c/ia × desktop/celular × completo/reduzido, mais `?motion=reduced` no desktop), mais o autoplay de a e de ia e a checagem de `ia/`. Na `ia`, todas as imagens têm selo: 7/7 na seleção, 4/4 na luta e 5/5 na vitória.

Resultado anterior, em 11/10/2026: **16/16 ok**: 15 casos (a/b/c × desktop/celular × completo/reduzido, mais `?motion=reduced` no desktop) e o autoplay. O smoke original do protótipo aprovado, rodado contra `painel/`, também passou nos 10 casos.
