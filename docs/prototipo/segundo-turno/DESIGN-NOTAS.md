# Notas de design: 2º turno (insumo para a spec)

Decisões tomadas no protótipo `docs/prototipo/segundo-turno/` (branch `prototipo/segundo-turno`). Escrevi como regras, para virarem spec e issues. O que segue a regra de **delta mínimo** reaproveita a marcação `.db-*` e os tokens de produção sem mudar nada.

## Fatos oficiais que mudam o produto

- O 2º turno de 2026 usa o **pleito 3221**: federal `6258` (Presidente, abrangência `br`) e estadual `6260` (Governador só em AM, RN, DF, ES e AC). **O Pará não tem 2º turno.** O arquivo `…/6260/dados/pa/pa-c0003-e006260-u.json` responde 404.
- A URL do Presidente é a mesma do 1º turno, com outro código: `ele2026/6258/dados/{uf}/{uf}-c0001-e006258-u.json`. Para o poller, basta trocar `ELEICAO_FEDERAL` de 6257 para 6258.
- O arquivo do 2º turno já está publicado e zerado desde 10/10, com `t:"2"`, 2 candidatos e `e.te = 150.238.779`.
- Consequência: no site, o 2º turno é **só Presidente** (Brasil + 27 UFs + exterior). Governador, Senado e Deputados do Pará viram arquivo final do 1º turno.

## Estrutura

1. **Abas:** o modelo "Tela 1 / Tela 2" continua, mas com outros rótulos:
   - **1 · 2º turno** (Presidente · Brasil e estados);
   - **2 · 1º turno · Pará** (Governador, Senado e Deputados · final).

   As teclas 1 e 2 e `?tela=` continuam iguais. Não criei uma 3ª aba, para não ter o que manter.
2. **Faixa de status:** é a mesma da produção, com um estado novo:
   - **Aguardando 17h** (ponto cinza, sem pulso, "Primeiros resultados às 17:00") antes da primeira seção;
   - depois "Ao vivo";
   - por fim "Encerrada", com o carimbo **"Resultado final · 2º turno"** (o mesmo mecanismo do arquivo do 1º turno, #37, com o texto vindo do estado).
3. **Tela 1 (2º turno):** a ordem é DESTAQUES → 5 KPIs → grade de 2/3 + 1/3.
   - **KPIs:** seções apuradas do Brasil e do Pará; comparecimento do Brasil e do Pará **com Δ vs 1º turno**; e o acompanhamento.
   - **Esquerda, 2/3:** o cartão "Presidente · 2º turno" (placar, cabo de guerra, frase, gráfico da vantagem, análise e momentos da noite).
   - **Direita, 1/3:** o cartão Pará e, embaixo, "Do 1º ao 2º turno".
   - **Linha inteira:** "Estados e regiões".
   - **Abaixo de 1240 px:** tudo numa coluna, nesta ordem: duelo, Pará, comparação, estados.
4. **Tela 2 (arquivo):**
   - um aviso tracejado ("Arquivo do 1º turno · 04/10 · resultado final…");
   - os cartões de **Governador e Senado de produção** em modo arquivo (`encerrada:true`), com "eleito no 1º turno" no lugar de "lidera";
   - "Proporcionais · Pará" com a Tela 2 de produção sem mudanças.

   A faixa de destaques dessa tela mostra os destaques finais do 1º turno, com o rótulo "1º TURNO".

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

## Pará

- O cartão Pará fica sempre visível na Tela 1: Presidente no Pará com as linhas `.db-cand` de produção, mas o Δ é **em relação ao 1º turno no Pará**, não à leitura anterior.
- A seção "Decidido no 1º turno" mostra o Governador eleito, os 2 senadores eleitos e os deputados, com o botão "Ver o arquivo do 1º turno no Pará →" (Tela 2).

## Perguntas em aberto

1. **Eleitorado e seções diferentes:** o arquivo 6258 traz `te = 150.238.779` e `ts = 469.329`, contra 158.745.502 e 499.248 no 6257. Pode ser uma consolidação preliminar do TSE ou uma agregação diferente de seções. Até isso se esclarecer, comparar votos absolutos entre os turnos engana. Por isso o protótipo compara em % do eleitorado. **Rever com o arquivo do dia 25.**
2. **Histórico:** separar as leituras do 2º turno das do 1º (namespace por eleição ou por turno no KV ou no armazenamento do poller), para que "Momentos da noite" e o gráfico não misturem as duas noites.
3. **Ordem dos lados:** usei a ordem do arquivo do TSE (22, 13). A alternativa neutra é a ordem numérica (13, 22). É uma decisão editorial do Sandro.
4. **Antes das 17h:** o mapa fica todo cinza. Vale um "fantasma" do líder do 1º turno em cada UF?
5. **Governadores de 2º turno em outras UFs** (AM, RN, DF, ES, AC): fora de escopo (o site é "Presidente e Pará"). Talvez um item no ticker, mas exigiria consultar o 6260.
6. **Eleito oficial:** confirmar se o TSE marca `e:"s"` / `st:"Eleito"` no 2º turno, como no 1º, para o selo "✓ Eleito" e para trocar a faixa para "Encerrada".
7. **Tela 2:** confirmar se o arquivo do Pará na Tela 2 deve continuar lendo o snapshot final (estático) em vez de consultar o 6259 a cada ciclo. Recomendo estático: menos requisições e nada muda.
