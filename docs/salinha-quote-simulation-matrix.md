# Matriz de Simulacao de Orcamentos - Salinha

Este documento consolida as simulacoes que a IA deve usar para evitar erros de calculo, venda de hora solta ou confusao entre horas consecutivas e pacotes.

## Valores oficiais

- Bloco avulso minimo: 2h consecutivas por R$ 140.
- Turno: 5h consecutivas por R$ 300.
- Diaria: 10h consecutivas por R$ 500.
- Pacote nao consecutivo: 10h por R$ 600.
- Pacote nao consecutivo: 20h por R$ 1.000.
- Nao existe venda de 1h isolada nem valor por hora solta.

## Descontos

- Ate 5 pessoas: 25%.
- De 6 a 10 pessoas: 15%.
- De 11 a 20 pessoas: sem desconto automatico por pessoas.
- Acima de 20 pessoas: capacidade excedida; informar limite e ajustar para ate 20 ou encaminhar para avaliacao.
- Desconto por quantidade de encontros/itens: 2 itens = 5%, 3 itens = 8%, 4 itens = 13%, 5 ou mais itens = 20%.
- Soma maxima de descontos: 30%.
- Calcular sempre: valor bruto, desconto aplicavel e total final.

## Regras obrigatorias

- Se o cliente pedir menos que o minimo avulso, calcular pelo minimo. Exemplo: 1h em 1 encontro = 1 bloco de 2h = R$ 140 antes de desconto.
- Para encontros/dias separados, aplicar o minimo por ocorrencia. Exemplo: 2 encontros de 1h = 2 blocos de 2h = R$ 280 antes de desconto.
- Nao dizer que o bloco de 2h "nao cobre tudo" quando o cliente pediu 1h. Ele cobre e sobra tempo no bloco.
- Turno e diaria so valem como horas consecutivas no mesmo dia.
- Pacotes de 10h e 20h sao saldo nao consecutivo para usar em dias/horarios diferentes, conforme disponibilidade.
- Quando o pacote tiver mais horas do que o uso informado, dizer que sobra saldo.
- Nunca inventar hora adicional solta.
- Nunca apresentar uma composicao que cubra menos horas do que o cliente pediu.

## Um unico dia ou uso consecutivo

| Pedido | Opcao correta antes de desconto | Observacao |
| --- | --- | --- |
| 1h | 1 bloco de 2h = R$ 140 | Nao vende 1h solta; minimo e 2h. |
| 2h | 1 bloco de 2h = R$ 140 | Cobre exatamente. |
| 3h | 2 blocos de 2h = R$ 280 | Cobre ate 4h; nao existe 1h adicional solta. |
| 4h | 2 blocos de 2h = R$ 280 | Cobre exatamente. |
| 5h | Turno de 5h = R$ 300 | Melhor que 3 blocos de 2h. |
| 6h | 3 blocos de 2h = R$ 420; diaria = R$ 500 | Blocos costumam ser melhor custo. |
| 7h | Turno 5h + 1 bloco 2h = R$ 440; diaria = R$ 500 | Comparar as duas. |
| 8h | Diaria 10h = R$ 500; 4 blocos = R$ 560 | Diaria costuma ser melhor custo. |
| 9h | Diaria 10h = R$ 500 | Nao usar 8h como se cobrisse 9h. |
| 10h | Diaria 10h = R$ 500 | Cobre exatamente. |
| Mais de 10h no mesmo dia | Encaminhar/confirmar com humano | Base nao cadastra regra segura acima de diaria. |

## Encontros ou dias separados

Use esta ordem:

1. Calcular horas reais: quantidade de encontros x horas por encontro.
2. Calcular avulso respeitando minimo por encontro.
3. Comparar com pacote de 10h ou 20h quando o total de horas couber no pacote.
4. Informar saldo quando pacote sobrar.
5. Aplicar descontos cabiveis depois do valor bruto.

| Pedido | Avulso antes de desconto | Pacote possivel | Observacao |
| --- | --- | --- | --- |
| 2 encontros de 1h | 2 blocos x R$ 140 = R$ 280 | Pacote 10h = R$ 600 | Avulso cobre com 2h por encontro. |
| 3 encontros de 1h | 3 blocos x R$ 140 = R$ 420 | Pacote 10h = R$ 600 | Avulso costuma ser melhor. |
| 2 encontros de 2h | 2 blocos x R$ 140 = R$ 280 | Pacote 10h = R$ 600 | Avulso cobre exatamente. |
| 3 encontros de 2h | 3 blocos x R$ 140 = R$ 420 | Pacote 10h = R$ 600 com 4h saldo | Comparar. |
| 2 encontros de 3h | 2 encontros x 2 blocos = R$ 560 | Pacote 10h = R$ 600 com 4h saldo | Nao vender 1h solta. |
| 3 encontros de 3h | 3 encontros x 2 blocos = R$ 840 | Pacote 10h = R$ 600 com 1h saldo | Pacote 10h costuma ser melhor. |
| 2 encontros de 4h | 4 blocos x R$ 140 = R$ 560 | Pacote 10h = R$ 600 com 2h saldo | Comparar. |
| 3 encontros de 4h | 6 blocos x R$ 140 = R$ 840 | Pacote 20h = R$ 1.000 com 8h saldo | Comparar conforme interesse em saldo. |
| 2 encontros de 5h | 2 turnos x R$ 300 = R$ 600 | Pacote 10h = R$ 600 | Empate antes de desconto; explicar diferenca. |
| 3 encontros de 5h | 3 turnos x R$ 300 = R$ 900 | Pacote 20h = R$ 1.000 com 5h saldo | Comparar. |
| 2 encontros de 6h | 2 x 3 blocos = R$ 840 | Pacote 20h = R$ 1.000 com 8h saldo | Comparar. |
| 3 encontros de 6h | 3 x 3 blocos = R$ 1.260 | Pacote 20h = R$ 1.000 com 2h saldo | Pacote 20h costuma ser melhor. |

## Exemplos com desconto

- 10 pessoas, 2 encontros de 1h: bruto R$ 280. Desconto pessoas 15% + desconto 2 encontros 5% = 20%. Total R$ 224.
- 8 pessoas, 3 encontros de 3h: pacote 10h R$ 600. Desconto pessoas 15% + desconto 3 encontros 8% = 23%. Total R$ 462.
- 4 pessoas, 1 encontro de 6h: bruto R$ 420. Desconto pessoas 25%. Total R$ 315.
- 20 pessoas, 1 encontro de 6h: bruto R$ 420. Sem desconto automatico por pessoas. Total R$ 420.
- 25 pessoas: capacidade excedida. Informar que a capacidade e ate 20 pessoas e, se o cliente aceitar ajustar para 20, calcular para 20.

## Formato recomendado de resposta

Para 10 pessoas em 2 encontros de 1h, nao temos venda de 1h solta. O minimo avulso e o bloco de 2h.

- Avulso: 2 encontros x R$ 140 = R$ 280
- Descontos: 15% por pessoas + 5% por 2 encontros = 20%
- Total: R$ 224

Quer seguir com essa opcao ou prefere que eu compare com pacote de horas?
