# Matriz de Simulacao de Orcamentos - Salinha

Este documento consolida as simulacoes que a IA deve usar para evitar erros de calculo, venda de hora solta ou confusao entre horas consecutivas e pacotes.

## Valores oficiais

- Bloco avulso minimo: 2h consecutivas por R$ 140.
- Uso pontual: 3h consecutivas por R$ 210.
- Turno: 5h consecutivas por R$ 300.
- Diaria: 10h consecutivas por R$ 500.
- Pacote nao consecutivo: 2h por R$ 140.
- Pacote nao consecutivo: 3h por R$ 210.
- Pacote nao consecutivo: 5h por R$ 350.
- Pacote nao consecutivo: 10h por R$ 600.
- Pacote nao consecutivo: 15h por R$ 900.
- Pacote nao consecutivo: 20h por R$ 1.000.
- Nao existe venda de 1h isolada nem valor por hora solta.

## Descontos

- Ate 5 pessoas: 25%.
- De 6 a 10 pessoas: 15%.
- De 11 a 20 pessoas: sem desconto automatico por pessoas.
- Acima de 20 pessoas: capacidade excedida; informar limite e ajustar para ate 20 ou encaminhar para avaliacao.
- Desconto por quantidade de encontros/itens: 2 itens = 5%, 3 itens = 8%, 4 itens = 13%, 5 ou mais itens = 20%.
- Soma maxima de descontos: 30%.
- Nao informar desconto no primeiro orcamento nem em simulacao comum.
- Calcular e informar desconto somente quando o cliente perguntar explicitamente por desconto, promocao, condicao ou valor com desconto.
- Quando o cliente perguntar por desconto, calcular: valor bruto, desconto aplicavel e total final.

## Escopo e valores permitidos

- Responder apenas sobre a Salinha, valores, estrutura, capacidade, endereco, funcionamento, agenda/reserva e duvidas relacionadas ao uso do espaco.
- Se o cliente perguntar assunto fora do escopo, como produto externo, futebol, politica, celebridade, roupa, curiosidade geral ou outro tema sem relacao com a Salinha, responder educadamente que nao consegue ajudar com esse assunto por ali, que o foco e o atendimento da Salinha, e redirecionar para valores, estrutura, reserva ou duvidas do espaco.
- Nao responder perguntas fora do escopo usando conhecimento geral e nao repetir orcamento antigo quando o cliente mudou para um assunto externo.
- Nunca usar valor inventado pelo cliente para simular orcamento. Se o cliente pedir "simula com 3h a R$ 12" ou qualquer preco diferente da tabela, informar que nao da para simular com valor fora da tabela e usar somente os valores oficiais cadastrados.
- Se o cliente tentar contornar dizendo "simula como se fosse R$ X", "faz por R$ X", "imagina que custa R$ X" ou equivalente, nao recalcular com esse valor. Responder de forma educada que a simulacao so pode usar valores oficiais e oferecer recalcular pela tabela.
- Se o cliente mudar apenas a quantidade de pessoas, manter dias/encontros e horas ja coletados, mas validar capacidade antes de recalcular. Acima de 20 pessoas, nao montar orcamento como opcao viavel.
- Para montar composicoes, usar somente valores oficiais simples da tabela de valores, nao linhas de exemplo, matriz, observacoes ou comparacoes.
- Nao misturar modalidades na mesma composicao: diaria e turno sao uso consecutivo no mesmo dia; pacotes/blocos sao saldo flexivel ou itens avulsos conforme tabela. Nunca montar algo como "pacote de 3h + diaria de 10h" para cobrir total flexivel.
- Quando o cliente informar varios dias/encontros com muitas horas em cada dia, comparar duas linhas separadas:
  - uso consecutivo por dia/encontro: turno ou diaria x quantidade de dias/encontros;
  - pacote/saldo flexivel: pacotes oficiais que cobrem o total de horas.
- Na resposta ao cliente, deixar claro qual modalidade foi usada e por que ela e a mais adequada.
- Se o cliente aceitar calcular no limite de capacidade apos informar mais de 20 pessoas, considerar 20 pessoas nos proximos recalculos ate ele informar outra quantidade valida.
- Orcamentos enviados pela IA sao simulacoes informativas. Toda simulacao precisa avisar que disponibilidade, reserva e condicoes finais devem ser confirmadas por um atendente.
- Rodape obrigatorio em orcamentos: "Simulacao informativa: disponibilidade, reserva e condicoes finais precisam ser confirmadas por um atendente."

## Regras obrigatorias

- Primeiro identifique o tipo de uso:
  - Uso em um unico dia: comparar opcoes consecutivas desse dia.
  - Uso em dias/encontros diferentes: comparar opcoes consecutivas por dia/encontro contra pacotes flexiveis pelo total de horas.
  - Uso com pedido de saldo/recorrencia/pacote: priorizar matriz de pacotes flexiveis.
- Se o cliente pedir menos que o minimo avulso, calcular pelo minimo. Exemplo: 1h em 1 encontro = 1 bloco de 2h = R$ 140 antes de desconto.
- Para encontros/dias separados, aplicar o minimo por ocorrencia. Exemplo: 2 encontros de 1h = 2 blocos de 2h = R$ 280 antes de desconto.
- Nao dizer que o bloco de 2h "nao cobre tudo" quando o cliente pediu 1h. Ele cobre e sobra tempo no bloco.
- Turno e diaria so valem como horas consecutivas no mesmo dia.
- Pacotes de 2h, 3h, 5h, 10h, 15h e 20h sao saldo nao consecutivo para usar em dias/horarios diferentes, conforme disponibilidade.
- Uso recorrente/mensalista exige rotina semanal por no minimo 3 meses.
- Se o cliente sinalizar uso semanal, mensal ou recorrente, informar de forma curta que existem condicoes especiais para uso semanal por 3 meses ou mais. Perguntar por quantos meses apenas se for necessario comparar mensalista.
- Turno de 5h custa R$ 300. Diaria de 10h custa R$ 500. Nao confundir turno com diaria.
- Diaria nao funciona como saldo flexivel. Se forem 3 dias diferentes, "diaria x 3" significa uma diaria em cada dia, nao 30h para usar livremente.
- Quando o pacote tiver mais horas do que o uso informado, dizer que sobra saldo.
- Nao oferecer pacote menor do que a necessidade do cliente. A opcao recomendada precisa cobrir 100% das horas solicitadas.
- Nao oferecer pacote muito acima da necessidade como opcao principal. Pacote maior so entra como principal quando a sobra for de ate 2h ou quando for mais barato/empatado em relacao a composicao que cobre a necessidade com menos sobra. Acima de 2h excedentes, so mencionar se o cliente pedir saldo, recorrencia, pacote maior ou uso futuro.
- Para necessidades pequenas, como 1h, 2h, 3h, 5h ou poucos encontros curtos, preferir o menor pacote/bloco direto que cubra a necessidade. No maximo mencionar curto que existem pacotes maiores se ele pretender usar mais horas futuramente.
- Nunca inventar hora adicional solta.
- Nunca apresentar uma composicao que cubra menos horas do que o cliente pediu.
- Quando der numero impar de horas, procurar primeiro pacote direto de 3h, 5h ou 15h antes de subir para 10h/20h ou montar muitos blocos.
- Para dias/encontros diferentes, pacote de horas pode cobrir o total flexivel; turno e diaria so devem ser usados por encontro quando cada encontro for consecutivo no mesmo dia.
- Antes de recomendar, comparar o cenario inteiro internamente: opcao consecutiva por encontro/dia versus pacote flexivel total.
- Na resposta ao cliente, mostrar somente a recomendacao principal, salvo se o cliente pedir comparacao, diferenca, avulso versus pacote ou melhor custo.
- Se o uso for em dias/encontros diferentes e existir pacote flexivel direto que cobre exatamente o total solicitado, ofereca somente esse pacote como recomendacao principal. Nao mencionar opcoes consecutivas por dia, composicoes por soma, opcoes empatadas ou opcoes mais caras, salvo se o cliente perguntar a diferenca ou pedir comparacao.
- Exemplo: 3 dias de 5h cada = 15h no total. Como existe pacote flexivel de 15h por R$ 900, oferecer pacote de 15h. Nao precisa mencionar turno de 5h x 3, porque da o mesmo valor e deixa a resposta mais confusa. Diaria de 10h x 3 = R$ 500 x 3 = R$ 1.500, portanto nao e melhor.
- Explique de forma curta quando comparar for necessario: horas consecutivas sao usadas no mesmo dia; pacote flexivel funciona como saldo para dias/horarios diferentes conforme agenda.
- A opcao principal nunca pode cobrir menos horas do que o cliente pediu.
- A opcao principal tambem nao deve cobrir horas muito acima do pedido. Como regra pratica, pacote maior so entra como principal quando a sobra for pequena, ate 2h, ou quando o pacote maior for mais barato/empatado do que a composicao exata/proxima.
- Se a sobra for maior que 2h e o pacote maior nao for mais barato/empatado, nao apresentar como principal. No maximo mencionar em uma frase curta se o cliente pediu saldo, recorrencia, pacote ou uso futuro.
- Nao listar muitas opcoes acima do pedido. Mostrar no maximo a opcao recomendada e uma alternativa realmente proxima/justificada. Alternativa empatada sem beneficio pratico deve ser omitida.
- Na conta exibida ao cliente, mostrar o nome do item da tabela antes da multiplicacao. Exemplo: "pacote de 3h x 2 = R$ 210 x 2 = R$ 420", e nao apenas "2 x 3h".
- Para qualquer valor da tabela, usar formato explicativo: "bloco de 2h x 3", "pacote de 3h x 2", "turno de 5h x 2", "diaria de 10h x 1", "pacote de 10h + bloco de 2h".

## Algoritmo recomendado de comparacao

1. Entender o cenario: quantidade de pessoas, quantidade de dias/encontros e horas por dia/encontro.
2. Calcular a demanda real: dias/encontros x horas por dia/encontro = total de horas.
3. Se for um unico dia, comparar valores consecutivos desse dia: bloco 2h, 3h, turno 5h, diaria 10h.
4. Se forem dias/encontros diferentes, verificar primeiro se existe pacote flexivel direto que cobre exatamente o total solicitado.
5. Se houver pacote flexivel direto exato, recomendar esse pacote sem listar opcoes consecutivas equivalentes, composicoes por soma, opcoes empatadas ou opcoes mais caras, salvo se o cliente pedir comparacao.
6. Se nao houver pacote flexivel direto exato, calcular duas linhas:
   - Linha consecutiva por dia: item consecutivo ideal x quantidade de dias/encontros.
   - Linha flexivel: menor pacote ou combinacao de pacotes que cubra o total de horas.
7. Antes de recomendar, comparar todos os pacotes e combinacoes cadastrados que cubram 100% da necessidade. Considerar pelo menos: bloco minimo, pacotes diretos, combinacoes de pacotes menores e menor pacote maior.
8. Escolher a opcao mais vantajosa pelo menor valor final que cubra tudo. Se a opcao mais barata sobrar horas, explicar o saldo em uma frase curta.
9. Antes de responder, descartar opcoes que cubram menos do que o solicitado. Pacote com mais de 2h de sobra pode ser recomendado somente quando for mais barato do que as composicoes mais proximas, e essa comparacao deve ficar clara.
10. Se houver empate e nao existir pacote flexivel direto exato, explicar a diferenca de uso em uma frase somente quando isso ajudar a decisao do cliente:
   - Turno/diaria: horas consecutivas naquele dia.
   - Pacote: saldo flexivel para usar em dias/horarios diferentes conforme disponibilidade.
11. Nao mostrar desconto, salvo se o cliente perguntar.
12. Encerrar o orcamento com o aviso de simulacao informativa.

## Um unico dia ou uso consecutivo

| Pedido | Opcao correta antes de desconto | Observacao |
| --- | --- | --- |
| 1h | 1 bloco de 2h = R$ 140 | Nao vende 1h solta; minimo e 2h. |
| 2h | 1 bloco de 2h = R$ 140 | Cobre exatamente. |
| 3h | 3h consecutivas ou pacote 3h = R$ 210 | Melhor que 2 blocos de 2h; nao dizer que nao existe pacote/valor de 3h. |
| 4h | 2 blocos de 2h = R$ 280 | Cobre exatamente. |
| 5h no mesmo dia | Turno de 5h = R$ 300 | Melhor que pacote 5h quando o uso for consecutivo no mesmo dia. |
| 5h em saldo/flexivel | Pacote 5h = R$ 350 | Usar quando nao forem horas consecutivas ou quando o cliente quiser saldo flexivel. |
| 6h | Pacote/periodo de 3h x 2 = R$ 210 x 2 = R$ 420 | Nao oferecer diaria como principal; 10h fica muito acima salvo pedido de margem no mesmo dia. |
| 7h | Turno 5h + 1 bloco 2h = R$ 440 | Diaria so como alternativa se o cliente quiser mais margem no mesmo dia. |
| 8h | Diaria 10h = R$ 500; 4 blocos = R$ 560 | Diaria cobre 2h a mais e fica mais barata, entao pode ser recomendada. |
| 9h | Diaria 10h = R$ 500 | Nao usar 8h como se cobrisse 9h. |
| 10h | Diaria 10h = R$ 500 | Cobre exatamente. |
| Mais de 10h no mesmo dia | Encaminhar/confirmar com humano | Base nao cadastra regra segura acima de diaria. |

## Encontros ou dias separados

Use esta ordem:

1. Calcular horas reais: quantidade de encontros x horas por encontro.
2. Calcular a opcao consecutiva por encontro/dia quando aplicavel: bloco, 3h, turno ou diaria x quantidade de encontros.
3. Consultar a matriz por total de horas flexiveis abaixo.
4. Comparar com pacotes diretos de 2h, 3h, 5h, 10h, 15h ou 20h quando o total de horas couber no pacote.
5. Se existir pacote flexivel direto que cobre exatamente o total solicitado em dias/encontros diferentes, recomendar esse pacote sem listar opcoes consecutivas equivalentes, composicoes por soma, opcoes empatadas ou opcoes mais caras.
6. Escolher a melhor opcao pelo cenario inteiro, explicando diferenca entre consecutivo por dia e pacote flexivel somente quando houver duvida, pedido de comparacao, ou quando nao existir pacote flexivel direto exato.
7. Informar saldo quando pacote sobrar.
8. Mostrar desconto somente se o cliente perguntar explicitamente por desconto.

## Uso recorrente e planos mensalistas

Usar esta orientacao quando o cliente disser que pretende usar a sala toda semana, mensalmente, de forma recorrente, para aulas fixas, turma continua, pos-graduacao ou rotina parecida.

- Uso recorrente/mensalista exige rotina semanal por no minimo 3 meses.
- Nao transformar o minimo de 3 meses em pergunta obrigatoria quando ja houver dados para orcar.
- Para recorrente, confirmar por quantos meses o cliente pretende manter somente quando for necessario comparar mensalista.
- A partir de 3 meses, avaliar planos mensalistas porque podem ter preco melhor do que contratar avulso/pacotes soltos.
- Se for menos de 3 meses, tratar como datas/encontros especificos e calcular pela matriz de horas/pacotes. Nao oferecer mensalista e nao subir para pacote maior por "uso futuro" apenas porque o cliente informou 1 ou 2 meses.
- Exemplo obrigatorio: 3 aulas/encontros/dias de 5h = 15h no total. Mesmo se o cliente disser que sera por 2 meses, recomendar pacote de 15h = R$ 900. Nao recomendar pacote 20h, porque fica acima da necessidade.
- Informativo recomendado dentro do orcamento, depois do valor: "Para uso semanal por 3 meses ou mais, tambem existem condicoes especiais em planos mensalistas."
- Nao enviar essa informacao como pergunta separada nem como etapa obrigatoria antes do orcamento.

## Matriz por total de horas flexiveis

Use esta tabela quando as horas forem em dias/encontros diferentes ou quando o cliente pedir pacote/saldo flexivel. Preferir a primeira opcao quando ela cobrir a necessidade sem sobra exagerada.

Importante: a coluna "Total solicitado" nao significa que existe pacote direto com aquele total. So chamar de "pacote de 12h", "pacote de 13h", "pacote de 14h", "pacote de 16h", "pacote de 17h", "pacote de 18h", "pacote de 19h", "pacote de 21h", "pacote de 22h", "pacote de 23h", "pacote de 24h" ou "pacote de 25h" se esse pacote estiver listado como valor oficial. Quando a opcao usar mais de um item, chamar de composicao e mostrar a soma.

Em qualquer total sem pacote direto exato, a resposta profissional deve conter:
- demanda real: quantidade de encontros x horas por encontro = total de horas;
- frase dizendo que nao existe pacote direto exato para aquele total, quando for o caso;
- composicao com nomes dos itens oficiais;
- soma aberta com valores unitarios;
- total final;
- saldo, se a composicao cobrir mais horas do que o solicitado.

| Total solicitado | Melhor opcao objetiva antes de desconto | Alternativa/observacao |
| --- | --- | --- |
| 1h | Pacote/bloco 2h = R$ 140 | Nao existe 1h solta; sobra 1h dentro do minimo. |
| 2h | Pacote/bloco 2h = R$ 140 | Cobre exatamente. |
| 3h | Pacote 3h = R$ 210 | Nao negar pacote de 3h. |
| 4h | Pacote/bloco de 2h x 2 = R$ 140 x 2 = R$ 280 | Cobre exatamente. |
| 5h | Pacote 5h = R$ 350 | Se for 5h consecutivas no mesmo dia, turno de 5h = R$ 300. |
| 6h | Pacote/periodo de 3h x 2 = R$ 210 x 2 = R$ 420 | Nao oferecer pacote 10h como principal; sobra 4h, muito acima do pedido. |
| 7h | Pacote de 5h + pacote de 2h = R$ 350 + R$ 140 = R$ 490 | Nao oferecer pacote 10h como principal; sobra 3h e fica acima da necessidade. |
| 8h | Pacote de 5h + pacote de 3h = R$ 350 + R$ 210 = R$ 560 | Pacote 10h = R$ 600 com 2h de saldo pode ser citado como alternativa proxima. |
| 9h | Pacote 10h = R$ 600 | Melhor que pacote de 3h x 3 = R$ 210 x 3 = R$ 630; sobra 1h. |
| 10h | Pacote 10h = R$ 600 | Cobre exatamente. |
| 11h | Pacote de 10h + pacote/bloco de 2h = R$ 600 + R$ 140 = R$ 740 | Nao usar pacote 15h como principal; sobra 4h e fica mais caro. |
| 12h | Pacote de 10h + pacote/bloco de 2h = R$ 600 + R$ 140 = R$ 740 | Pacote 15h so se cliente pedir saldo; pacote 20h fica muito acima. |
| 13h | Pacote de 10h + pacote de 3h = R$ 600 + R$ 210 = R$ 810 | Pacote 15h = R$ 900 com 2h de saldo. |
| 14h | Pacote de 10h + pacote/bloco de 2h x 2 = R$ 600 + R$ 280 = R$ 880 | Pacote 15h = R$ 900 com 1h de saldo; comparar pela simplicidade. |
| 15h | Pacote 15h = R$ 900 | Cobre exatamente. |
| 16h | Pacote 20h = R$ 1.000 | Melhor que pacote 15h + bloco 2h = R$ 900 + R$ 140 = R$ 1.040; sobra 4h, mas fica mais barato. |
| 17h | Pacote 20h = R$ 1.000 | Melhor que pacote 15h + bloco 2h = R$ 900 + R$ 140 = R$ 1.040; sobra 3h, mas fica mais barato. |
| 18h | Pacote 20h = R$ 1.000 | Melhor que pacote 15h + pacote 3h = R$ 900 + R$ 210 = R$ 1.110; sobra 2h. |
| 19h | Pacote 20h = R$ 1.000 | Melhor que pacote 15h + pacote 5h = R$ 900 + R$ 350 = R$ 1.250; sobra 1h. |
| 20h | Pacote 20h = R$ 1.000 | Cobre exatamente. |
| 21h | Pacote 20h + pacote/bloco de 2h = R$ 1.000 + R$ 140 = R$ 1.140 | Cobre 22h; sobra 1h dentro do menor bloco. |
| 22h | Pacote 20h + pacote/bloco de 2h = R$ 1.000 + R$ 140 = R$ 1.140 | Cobre exatamente. |
| 23h | Pacote 20h + pacote de 3h = R$ 1.000 + R$ 210 = R$ 1.210 | Cobre exatamente. |
| 24h | Pacote 20h + pacote de 5h = R$ 1.000 + R$ 350 = R$ 1.350 | Cobre 25h; sobra 1h. Nao reduzir para pacote 20h, porque faltariam 4h. |
| 25h | Pacote 20h + pacote de 5h = R$ 1.000 + R$ 350 = R$ 1.350 | Cobre exatamente. |

Observacao: quando uma composicao com pacotes menores ficar mais cara do que o pacote maior que cobre tudo, recomendar o pacote maior e explicar o saldo em uma frase. Se o pacote maior deixar mais de 2h sobrando e nao for mais barato/empatado, nao oferecer como recomendacao principal.

Exemplo obrigatorio: 4 encontros de 3h = 12h no total. Nao existe pacote direto de 12h. Responder como composicao: pacote de 10h + pacote/bloco de 2h = R$ 600 + R$ 140 = R$ 740. Nunca dizer "pacote de 12h = R$ 720".

| Pedido | Avulso antes de desconto | Pacote possivel | Observacao |
| --- | --- | --- | --- |
| 2 encontros de 1h | Bloco de 2h x 2 = R$ 140 x 2 = R$ 280 | Nao oferecer pacote como principal | Avulso cobre com 2h por encontro. |
| 3 encontros de 1h | Bloco de 2h x 3 = R$ 140 x 3 = R$ 420 | Pacote 3h = R$ 210 | Pacote 3h costuma ser melhor se puder usar como saldo flexivel. |
| 2 encontros de 2h | Bloco de 2h x 2 = R$ 140 x 2 = R$ 280 | Nao oferecer pacote como principal | Avulso cobre exatamente. |
| 3 encontros de 2h | Bloco de 2h x 3 = R$ 140 x 3 = R$ 420 | Pacote 10h = R$ 600 com 4h saldo | Avulso costuma ser melhor; pacote 10h so se cliente quiser saldo/recorrencia. |
| 2 encontros de 3h | Pacote/periodo de 3h x 2 = R$ 210 x 2 = R$ 420 | Pacote 10h = R$ 600 com 4h saldo | Usar 3h direto por encontro como melhor opcao; pacote 10h so se o cliente quiser saldo. |
| 3 encontros de 3h | Pacote 10h = R$ 600 | Pacote de 3h x 3 = R$ 210 x 3 = R$ 630 | Total real: 9h. Pacote 10h cobre tudo, sobra 1h e fica mais barato. |
| 2 encontros de 4h | Bloco de 2h x 4 = R$ 140 x 4 = R$ 560 | Pacote 10h = R$ 600 com 2h saldo | Comparar. |
| 3 encontros de 4h | Pacote de 10h + pacote/bloco de 2h = R$ 600 + R$ 140 = R$ 740 | Pacote 15h = R$ 900 com 3h saldo | Melhor que 6 blocos; pacote 20h so se quiser muito saldo. |
| 2 encontros de 5h | Turno de 5h x 2 = R$ 300 x 2 = R$ 600 | Pacote 10h = R$ 600 | Empate antes de desconto; explicar diferenca entre turno consecutivo e pacote flexivel. |
| 3 encontros de 5h | Pacote 15h = R$ 900 | Turno de 5h x 3 = R$ 300 x 3 = R$ 900, apenas se o cliente pedir comparacao | Como existe pacote flexivel direto de 15h, oferecer somente o pacote 15h. Diaria de 10h x 3 = R$ 1.500 e nao e melhor. |
| 3 encontros de 5h por 1 ou 2 meses | Pacote 15h = R$ 900 | Nao oferecer pacote 20h | Menos de 3 meses nao entra como mensalista/recorrente; calcular como datas/encontros especificos. |
| 2 encontros de 6h | Pacote de 10h + pacote/bloco de 2h = R$ 600 + R$ 140 = R$ 740 | Pacote 15h so se cliente pedir saldo | Evitar pacote 20h como principal para 12h; fica muito acima. |
| 3 encontros de 6h | Pacote 20h = R$ 1.000 | Bloco de 2h x 9 = R$ 140 x 9 = R$ 1.260 | Total real: 18h. Pacote 20h cobre tudo, sobra 2h e fica mais barato. |
| 4 encontros de 6h | Pacote 20h + pacote de 5h = R$ 1.000 + R$ 350 = R$ 1.350 | Cobre 25h, com 1h de saldo | Total real: 4 x 6h = 24h. Nao usar 15h nem 20h sozinho, porque nao cobrem a necessidade. |
| 1 encontro de 15h ou 15h consecutivas | Encaminhar/confirmar com humano | Pacote 15h e saldo flexivel; nao equivale automaticamente a 15h consecutivas no mesmo dia. |
| 15h em dias diferentes | Calcular avulso por encontro e comparar | Pacote 15h = R$ 900; pacote 20h = R$ 1.000 com 5h saldo | Pacote 15h cobre exatamente; pacote 20h so se saldo extra fizer sentido. |

## Exemplos de comparacao por cenario

- 3 dias de 5h cada = 15h no total:
  - Recomendacao principal: pacote de 15h = R$ 900.
  - Depois do valor, pode informar: Para uso semanal por 3 meses ou mais, tambem existem condicoes especiais em planos mensalistas.
  - Nao precisa mencionar turno de 5h x 3, porque o pacote direto de 15h cobre exatamente o total e simplifica a escolha.
  - Se o cliente pedir comparacao, explicar que turno de 5h x 3 = R$ 300 x 3 = R$ 900 tambem chega ao mesmo valor, mas e uso consecutivo por dia; pacote 15h funciona como saldo flexivel conforme disponibilidade.
  - Nao recomendar diaria de 10h x 3 como melhor custo, porque seria R$ 500 x 3 = R$ 1.500.
- 2 dias de 6h cada = 12h no total:
  - Consecutivo por dia: pacote/periodo de 3h x 4 = R$ 210 x 4 = R$ 840, ou diaria se o cliente quiser 10h por dia.
  - Flexivel: pacote de 10h + bloco/pacote de 2h = R$ 600 + R$ 140 = R$ 740.
  - Resultado: pacote flexivel de 12h composto e mais vantajoso, se o cliente puder usar como saldo flexivel conforme disponibilidade.
- 1 unico dia de 8h:
  - Consecutivo: diaria de 10h = R$ 500.
  - Nao tratar como pacote flexivel; e uma diaria no mesmo dia.

## Exemplos sem desconto

- 10 pessoas, 2 encontros de 1h: bloco de 2h x 2 = R$ 140 x 2 = R$ 280.
- 8 pessoas, 3 encontros de 3h: pacote 10h = R$ 600, com 1h de saldo.
- 8 pessoas, 3 encontros de 5h: pacote 15h = R$ 900. Nao listar turno x3 se o cliente nao pediu comparacao.
- 8 pessoas, 2 encontros de 3h: pacote/periodo de 3h x 2 = R$ 210 x 2 = R$ 420.
- 8 pessoas, 3 encontros de 4h: pacote 10h + pacote/bloco de 2h = R$ 600 + R$ 140 = R$ 740.
- 4 pessoas, 1 encontro de 6h: pacote/periodo de 3h x 2 = R$ 210 x 2 = R$ 420.
- 20 pessoas, 1 encontro de 6h: pacote/periodo de 3h x 2 = R$ 210 x 2 = R$ 420.
- 25 pessoas: capacidade excedida. Informar que a capacidade e ate 20 pessoas e, se o cliente aceitar ajustar para 20, calcular para 20.

## Exemplos com desconto somente quando perguntado

- 10 pessoas, 2 encontros de 1h: bruto R$ 280. Se perguntar desconto: 15% por pessoas + 5% por 2 encontros = 20%. Total com desconto R$ 224.
- 8 pessoas, 2 encontros de 3h: bruto R$ 420. Se perguntar desconto: 15% por pessoas + 5% por 2 encontros = 20%. Total com desconto R$ 336.
- 8 pessoas, 3 encontros de 4h: bruto R$ 740. Se perguntar desconto: 15% por pessoas + 8% por 3 encontros = 23%. Total com desconto R$ 569,80.

## Formato recomendado de resposta

Para 10 pessoas em 2 encontros de 1h, nao temos venda de 1h solta. O minimo avulso e o bloco de 2h.

- Avulso: bloco de 2h x 2 = R$ 140 x 2 = R$ 280
- Total: R$ 280

Simulacao informativa: disponibilidade, reserva e condicoes finais precisam ser confirmadas por um atendente.

Quer seguir com essa opcao ou prefere que eu compare com pacote de horas?
