# Notas de design: 2º turno (insumo para a spec)

Decisões tomadas no protótipo `docs/prototipo/segundo-turno/` (branch `prototipo/segundo-turno`). Escrevi como regras, para virarem spec e issues. O que segue a regra de **delta mínimo** reaproveita a marcação `.db-*` e os tokens de produção sem mudar nada.

## Fatos oficiais que mudam o produto

- O 2º turno de 2026 usa o **pleito 3221**: federal `6258` (Presidente, abrangência `br`) e estadual `6260` (Governador só em AM, RN, DF, ES e AC). **O Pará não tem 2º turno.** O arquivo `…/6260/dados/pa/pa-c0003-e006260-u.json` responde 404.
- A URL do Presidente é a mesma do 1º turno, com outro código: `ele2026/6258/dados/{uf}/{uf}-c0001-e006258-u.json`. Para o poller, basta trocar `ELEICAO_FEDERAL` de 6257 para 6258.
- O arquivo do 2º turno já está publicado e zerado desde 10/10, com `t:"2"`, 2 candidatos e `e.te = 150.238.779`.
- Consequência: no site, o 2º turno é **só Presidente** (Brasil + 27 UFs + exterior).
- **Decisão de 11/10 (Sandro): foco só nacional.** O 2º turno não tem nada específico do Pará: nem cartão, nem KPI, nem destaque, nem link, nem a Tela 2 de arquivo. O Pará é uma das 27 UFs, sem ênfase.
- O TSE publica o resultado **por município** (`…/dados/<uf>/<uf><cód>-c0001-e<ele>-u.json`, com os códigos em `…/config/mun-e<ele>-cm.json`) e o do **exterior** (`…/dados/zz/zz-c0001-e<ele>-u.json`). Os dois existem para o 6257 (1º turno, final) e para o 6258 (2º turno, zerado). O protótipo usa os do 6257 como dados reais.

## Estrutura

1. **Uma tela só**, sem abas: o 2º turno é Presidente · Brasil. As teclas 1 e 2 e `?tela=` saem. O `?variant=` do protótipo continua.
2. **Faixa de status:** é a mesma da produção, com um estado novo:
   - **Aguardando 17h** (ponto cinza, sem pulso, "Primeiros resultados às 17:00") antes da primeira seção;
   - depois "Ao vivo";
   - por fim "Encerrada", com o carimbo **"Resultado final · 2º turno"** (o mesmo mecanismo do arquivo do 1º turno, #37, com o texto vindo do estado).
3. **A ordem é** DESTAQUES → 5 KPIs → grade de 2/3 + 1/3.
   - **KPIs:** seções apuradas no Brasil; comparecimento e abstenção no Brasil, **com Δ vs 1º turno**; seções apuradas no exterior; e o acompanhamento.
   - **Esquerda, 2/3:** o cartão "Presidente · 2º turno" (placar, cabo de guerra, frase, gráfico da vantagem, análise e momentos da noite).
   - **Direita, 1/3:** Exterior, depois Comparecimento e abstenção, depois "Do 1º ao 2º turno".
   - **Linha inteira:** "Estados e regiões" e, em seguida, "Maiores colégios eleitorais".
   - **Abaixo de 1240 px:** tudo numa coluna, nesta ordem: duelo, exterior, comparecimento, comparação, estados, colégios.
4. **Destaques:** Brasil, cada região, viradas vs 1º turno, a disputa mais apertada, a virada da noite, o maior colégio (São Paulo) e o exterior.

## Placar do duelo

- **Os lados são fixos por entidade** (ordem do arquivo do TSE: 22 à esquerda, 13 à direita). Eles não trocam na virada. Quem lidera ganha o destaque: % em `--tinta` (o outro fica em `--tinta-2`) e o selo "lidera", que vira "✓ Eleito" no fim. Trocar os lados na virada confundiria quem está olhando.
- O % fica em 48 px (`--t-heroi`) dos dois lados. A vantagem em p.p. fica no centro, com a tipografia de KPI.
- **Cabo de guerra:** uma barra de 12 px com as duas fatias nas cores das entidades e a marca de 50%. Substitui as barras individuais, que num duelo são redundantes.
- **Cores:** a cor segue a entidade, atribuída na ordem do arquivo, então 22 = `--s1` (azul) e 13 = `--s2` (laranja). É coerente com a sessão do 1º turno, em que 22 terminou em 1º. O texto nunca usa a cor da série.
- **Celular:** os dois lados ficam lado a lado com o % em 34 px, e a vantagem desce para uma linha própria.

## Gráfico

- Num duelo, as duas linhas de % são espelhadas (A = 100 − B). Por isso troquei as linhas por **um gráfico de vantagem com sinal** (p.p. de 22 menos 13), com "empate" no zero.
  - Acima do zero, área na cor de 22; abaixo, na cor de 13. Os rótulos de texto são neutros: "▲ Flavio Bolsonaro" e "▼ Lula".
- **O eixo X é fixo em 0–100%**, e a parte ainda não apurada aparece sombreada ("a apurar"). Assim se vê quanto falta.
- A escala Y usa as leituras a partir de 10% apurado, porque as primeiras urnas oscilam muito. Quando o começo fica fora da escala, aparece o aviso "↑ início fora da escala (N)".
- **Viradas:** linha vertical tracejada, um círculo no zero e o rótulo "↻ virada HH:MM".
- A tooltip mostra % apurado, hora, os dois % e a vantagem, no mesmo estilo de `.db-tip`.

## Análise e momentos

- A análise usa as mesmas fórmulas do servidor. **"Vencer no 1º turno" sai**: no 2º turno quem lidera tem a maioria. Ficam vantagem, válidos a apurar (est.), para virar e tendência.
- Quando a apuração encerra, saem as estimativas e entram comparecimento e brancos/nulos (com o valor do 1º turno) e o número de viradas na noite.
- **Momentos da noite:** uma lista calculada do histórico de leituras, com quem abre na frente, a maior vantagem, a metade apurada, cada virada (linha realçada) e o eleito. Isso exige que o servidor guarde o histórico do 2º turno separado do 1º (ver as perguntas em aberto).
- A virada também aparece no resumo da faixa (o comportamento atual: "mudou a liderança em Presidente") e num chip ao lado da frase por até 3 leituras.

## Comparação com o 1º turno (estimativa)

- **Composição do eleitorado:** duas barras empilhadas, 1º turno (final) × 2º turno (seções apuradas), divididas em 22, 13, outros, brancos/nulos e abstenção, como **% do eleitorado**. É comparável mesmo com a apuração parcial.
- **Tabela:** 1º turno, 2º turno e Δ (p.p. dos válidos e, embaixo, votos equivalentes) para cada candidato, mais outros candidatos, brancos/nulos e abstenção.
- **"Para onde foram os votos?"** tem o selo ESTIMATIVA. É o saldo líquido de cada um, dividido pela "fonte" (outros do 1º turno + queda de brancos/nulos + queda da abstenção). O texto explica que o TSE não publica transferência de votos e que há trocas de lado escondidas no saldo.
- **Votos equivalentes** são a fração do eleitorado × o eleitorado do 2º turno, porque o eleitorado do arquivo do 2º turno é diferente (ver as perguntas em aberto).

## Estados e regiões

- **Cartograma em grade** (7 colunas, posição aproximada, exterior como "EXT"). Não é um mapa geográfico: é placar com posição.
  - Cor = líder na UF. A intensidade (`color-mix`) segue a vantagem.
  - A UF que mudou de líder em relação ao 1º turno ganha **contorno e "↻"**.
  - Tem `title`, `aria-label` e `tabindex` para leitura.
- **Placar:** "Flavio N · Lula M UFs lideradas · K viraram".
- **Por região:** os 5 agregados (a mesma soma do servidor), com o líder no 1º turno e "↻ virou".
- **Todas as UFs:** tabela por eleitorado, com cabeçalho fixo e rolagem dentro do cartão (máx. 360 px), e as colunas apurado, %, vantagem, vantagem no 1º turno e ↻.

## Exterior

- É um cartão próprio, com o mesmo formato `.db-cand` do Presidente: as duas linhas, com o Δ **em relação ao 1º turno no exterior** (real: Lula 47,57%, Flavio 43,49%).
- Mostra o eleitorado (916.534 no 1º turno) e o comparecimento, 1º turno real (37,31%, abstenção de 62,69%) × 2º turno. O exterior também aparece como "EXT" no cartograma e na tabela de UFs, como antes. Não entra no placar de UFs.
- Antes de apurar, o texto diz que o exterior costuma ser o último (as urnas fecham no fuso de cada país).

## Comparecimento e abstenção

- **KPIs** de comparecimento e abstenção no Brasil, com Δ em p.p. vs 1º turno.
- **Cartão:** a tabela com Brasil e exterior, com as colunas comparecimento no 1º turno, comparecimento no 2º (Δ embaixo), abstenção no 1º (em votos embaixo) e abstenção no 2º (Δ embaixo). Durante a apuração, o valor do 2º turno é o das seções apuradas.
- Os % do 1º turno são os do TSE (`pcn`/`pan`), calculados sobre o eleitorado das seções instaladas. Por isso diferem um pouco de `c/te`: no exterior, 37,31% contra 37,29%.
- O comparecimento por município fica na tabela dos colégios. Não fiz um quadro por UF: o snapshot de produção não traz o comparecimento por UF. Daria para ler os 27 arquivos de UF, mas não é necessário para a pergunta do protótipo.

## Maiores colégios eleitorais

- São os **10 municípios com mais eleitores** pelo `te` do 1º turno: São Paulo, Rio de Janeiro, Brasília, Belo Horizonte, Salvador, Fortaleza, Manaus, Curitiba, Recife e Porto Alegre. Juntos somam 27,3 milhões de eleitores, 17,2% do país.
- A lista é **fixa, pelo eleitorado do 1º turno**, e não reordena durante a noite.
- Colunas: município com UF e eleitorado; apurado (oculta no celular); o % de cada candidato, com o do 1º turno embaixo; a vantagem, com a do 1º turno e a cor do líder; o comparecimento, com o do 1º turno embaixo (oculto no celular); e "↻ virou".
- No produto real, isso custa **10 requisições a mais por ciclo** (um JSON por município, cerca de 9 KB cada). O código IBGE ↔ TSE e a lista vêm uma vez do `mun-e006258-cm.json`.

## Perguntas em aberto

1. **Eleitorado e seções diferentes:** o arquivo 6258 traz `te = 150.238.779` e `ts = 469.329`, contra 158.745.502 e 499.248 no 6257. Pode ser uma consolidação preliminar do TSE ou uma agregação diferente de seções. Até isso se esclarecer, comparar votos absolutos entre os turnos engana. Por isso o protótipo compara em % do eleitorado. **Rever com o arquivo do dia 25.**
2. **Histórico:** separar as leituras do 2º turno das do 1º (namespace por eleição ou por turno no KV ou no armazenamento do poller), para que "Momentos da noite" e o gráfico não misturem as duas noites.
3. **Ordem dos lados:** usei a ordem do arquivo do TSE (22, 13). A alternativa neutra é a ordem numérica (13, 22). É uma decisão editorial do Sandro.
4. **Antes das 17h:** o mapa fica todo cinza. Vale um "fantasma" do líder do 1º turno em cada UF?
5. **Governadores de 2º turno em outras UFs** (AM, RN, DF, ES, AC): fora de escopo, porque o foco é só nacional e Presidente. Talvez um item no ticker, mas exigiria consultar o 6260.
6. **Eleito oficial:** confirmar se o TSE marca `e:"s"` / `st:"Eleito"` no 2º turno, como no 1º, para o selo "✓ Eleito" e para trocar a faixa para "Encerrada".
7. **Eleitorado municipal do 6258:** o arquivo municipal zerado do 2º turno ainda traz um `te` **parcial** em várias capitais (São Paulo 5.887.209 contra 9.145.124 no 1º turno; Belo Horizonte 764.022 contra 1.966.966; Curitiba 569.895 contra 1.415.148). Fortaleza, Manaus, Recife e Brasília já batem com o 1º turno. É a mesma pergunta do item 1, agora no município. Por isso o protótipo usa o eleitorado do 1º turno para os colégios. **Rever no dia 25**, e escolher o top 10 pelo `te` final do 6258 se a ordem mudar.
8. **Colégios no celular:** a 390 px a tabela de colégios ainda rola na horizontal dentro do cartão (vantagem e ↻), no mesmo padrão `db-rolagem` da tabela de UFs. A alternativa é uma linha por município em 2 andares.
9. **Comparecimento por UF ou região:** fica fora por enquanto (ver "Comparecimento e abstenção"). Vale incluir se o editorial quiser um mapa de abstenção.
