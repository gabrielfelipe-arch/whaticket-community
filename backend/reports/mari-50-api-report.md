# Relatorio Mari - 50 testes reais API

Gerado em: 2026-06-14T19:48:02.150Z

## Auditoria inicial

- Servico factual: FullBaseGroundingMariService
- Servico fluxo real: DecideAiTicketActionService
- Prompt ativo: full-base-grounding-mari-v2
- Base enviada ao modelo nos casos factuais: 43/43
- Fluxo antigo detectado nos casos de decisao: 7/7
- Ambiente: node v22.19.0, NODE_ENV=DEVELOPMENT

## Resultado

- Total: 50
- Passou: 50
- Falhou: 0
- Taxa: 100%
- Pronto para producao: sim

## Tabela

| # | Pergunta | Resposta ao cliente | Intencao | Base/Chunks | Passou | Analise |
|---|---|---|---|---|---|---|
| 1 | aceita pix? | Sim. A Salinha Meier aceita Pix, cartao de debito e cartao de credito. | request_payment_info | sim / Formas de pagamento | OK | Resposta aderente ao esperado. |
| 2 | passa no cartao? | Sim, a Salinha Méier aceita pagamento no cartão de crédito. | request_payment_info | sim / formas de pagamento | OK | Resposta aderente ao esperado. |
| 3 | divide no cartao? | A Salinha Meier aceita Pix, cartao de debito e cartao de credito. Para reservar, e necessario pagar 50% do valor do orcamento; os 50% restantes devem ser pagos ate 3 dias antes ... | request_payment_info | sim / Reserva e pagamento, Formas de pagamento | OK | Resposta aderente ao esperado. |
| 4 | como reserva? | Para reservar uma data na Salinha Méier, é necessário pagar 50% do valor do orçamento. Os 50% restantes devem ser pagos até 3 dias antes da data reservada. | request_reservation_rules | sim / 5. VALORES OFICIAIS | OK | Resposta aderente ao esperado. |
| 5 | tem que pagar sinal? | Para reservar uma data, é necessário pagar 50% do valor do orçamento. Os 50% restantes devem ser pagos até 3 dias antes da data reservada. | request_reservation_rules | sim / regra de reserva | OK | Resposta aderente ao esperado. |
| 6 | quando pago o restante? | Os 50% restantes devem ser pagos até 3 dias antes da data reservada. | request_reservation_rules | sim / regras de reserva | OK | Resposta aderente ao esperado. |
| 7 | a reserva confirma automatico? | Nao. A reserva nao fica confirmada automaticamente. Para reservar, e necessario pagar 50% do valor do orcamento; os 50% restantes devem ser pagos ate 3 dias antes da data. A dis... | request_reservation_rules | sim / Reserva e pagamento | OK | Resposta aderente ao esperado. |
| 8 | posso confirmar disponibilidade agora? | Para confirmar a disponibilidade, preciso encaminhar para a equipe. Posso solicitar o apoio da equipe para verificar isso com você? | request_availability | sim / RESERVA, DISPONIBILIDADE E PAGAMENTO | OK | Resposta aderente ao esperado. |
| 9 | onde fica? | A Salinha Méier fica na Rua Dias da Cruz, 185 — Sala 215, Méier, Rio de Janeiro — RJ. Referências: Próximo ao Imperator — Centro Cultural João Nogueira — e à Smart Fit. | request_location | sim / INFORMAÇÕES GERAIS | OK | Resposta aderente ao esperado. |
| 10 | tem referencia perto? | A Salinha Meier fica na Rua Dias da Cruz, 185, sala 215, Meier, Rio de Janeiro - RJ, proximo ao Imperator e a Smart Fit. | request_location | sim / Endereco | OK | Resposta aderente ao esperado. |
| 11 | qual contato de voces? | O contato comercial da Salinha Méier é pelo WhatsApp: +55 21 97213-2951. | knowledge_base_question | sim / 1. INFORMAÇÕES GERAIS | OK | Resposta aderente ao esperado. |
| 12 | tem instagram? | Sim, temos Instagram! Você pode nos encontrar em @salinhameier. | knowledge_base_question | sim / 1. INFORMAÇÕES GERAIS | OK | Resposta aderente ao esperado. |
| 13 | tem ar? | Sim, a Salinha Méier inclui ar-condicionado. | request_included_structure | sim / ESTRUTURA INCLUSA | OK | Resposta aderente ao esperado. |
| 14 | tem wifi? | Sim, a Salinha Méier inclui internet. | request_included_structure | sim / ESTRUTURA INCLUSA | OK | Resposta aderente ao esperado. |
| 15 | da pra passar slide na tv? | Sim, a sala inclui uma TV para reprodução de conteúdo. | request_included_structure | sim / ESTRUTURA INCLUSA | OK | Resposta aderente ao esperado. |
| 16 | tem quadro? | Sim, a Salinha Méier inclui quadro branco. | request_included_structure | sim / ESTRUTURA INCLUSA | OK | Resposta aderente ao esperado. |
| 17 | tem banheiro? | Sim, a estrutura da Salinha Méier inclui banheiro. | request_included_structure | sim / ESTRUTURA INCLUSA | OK | Resposta aderente ao esperado. |
| 18 | tem cafe? | Sim, a Salinha Méier inclui copa compartilhável com cafeteira. | request_included_structure | sim / ESTRUTURA INCLUSA | OK | Resposta aderente ao esperado. |
| 19 | tem agua gelada? | O valor inclui ar-condicionado, internet, TV, quadro branco, recepcao, banheiro e copa compartilhavel com cafeteira, micro-ondas e filtro com agua gelada. | request_included_structure | sim / Estrutura | OK | Resposta aderente ao esperado. |
| 20 | o que esta incluso? | O valor da contratação inclui: - Ar-condicionado - Capacidade para até 20 pessoas - Quadro branco - TV para reprodução de conteúdo - Internet - Recepção - Banheiro - Copa compar... | request_included_structure | sim / ESTRUTURA INCLUSA | OK | Resposta aderente ao esperado. |
| 21 | cabe 10 pessoas? | A capacidade da Salinha Méier é de até 20 pessoas. Portanto, cabe 10 pessoas sem problemas! | request_capacity | sim / 4. CAPACIDADE | OK | Resposta aderente ao esperado. |
| 22 | cabe 25? | A capacidade da Salinha Méier é de até 20 pessoas. Para grupos acima disso, preciso encaminhar para a equipe avaliar se existe alguma alternativa. | request_capacity | sim / 4. CAPACIDADE | OK | Resposta aderente ao esperado. |
| 23 | qual a lotacao maxima? | A capacidade da Salinha Méier é de até 20 pessoas. Para grupos acima disso, preciso encaminhar para a equipe avaliar se existe alguma alternativa. | request_capacity | sim / CAPACIDADE | OK | Resposta aderente ao esperado. |
| 24 | manda os valores | Claro! Segue a tabela de valores da Salinha Méier: Uso pontual: • 2h consecutivas: R$ 140 • 3h consecutivas: R$ 210 • 5h consecutivas / turno: R$ 300 • 10h consecutivas / diária... | request_price_table | sim / VALORES OFICIAIS, TABELA DE PREÇOS | OK | Resposta aderente ao esperado. |
| 25 | quanto e 2 horas? | O valor para 2 horas consecutivas é R$ 140. | knowledge_base_question | sim / 5.1. Uso pontual — horas consecutivas | OK | Resposta aderente ao esperado. |
| 26 | 3 horas sai quanto? | 3h consecutivas: R$ 210 | knowledge_base_question | sim / 5.1. Uso pontual — horas consecutivas | OK | Resposta aderente ao esperado. |
| 27 | qual valor da diaria? | Claro! A diária de 10h custa R$ 500. Para um orçamento mais certinho, me diga a quantidade de pessoas, quantos dias/encontros seriam e quantas horas por dia. | request_price_table | sim / 5.1, 7 | OK | Resposta aderente ao esperado. |
| 28 | tem pacote de horas? | Claro! Segue a tabela de pacotes de horas livres da Salinha Méier: Pacotes de horas livres: • 2h: R$ 140 • 3h: R$ 210 • 5h: R$ 350 • 10h: R$ 600 • 15h: R$ 900 • 20h: R$ 1.000 Os... | request_packages | sim / 5.2, 7 | OK | Resposta aderente ao esperado. |
| 29 | pacote 10h existe? | Sim, existe o pacote de 10h, que custa R$ 600. Esse pacote funciona como saldo flexível e pode ser utilizado em dias ou horários diferentes, conforme a disponibilidade da agenda. | request_packages | sim / 5.2. Pacotes de horas livres | OK | Resposta aderente ao esperado. |
| 30 | tem mensalista? | Sim, temos planos mensalistas! Os planos disponíveis são: - **Plano Prata**: 2h semanais — R$ 450 por mês (contratação mínima de 3 meses). - **Plano Ouro**: 4h semanais — R$ 800... | request_monthly_plans | sim / 5.3. Planos mensalistas | OK | Resposta aderente ao esperado. |
| 31 | plano prata como funciona? | O Plano Prata inclui 2h semanais por R$ 450 mensais, com contratação mínima de 3 meses. A organização dos dias e horários ocorre conforme disponibilidade da Salinha Méier. | request_monthly_plans | sim / planos mensalistas | OK | Resposta aderente ao esperado. |
| 32 | tem plano ouro? | Sim, temos o Plano Ouro, que inclui 4h semanais por R$ 800 mensais. A contratação mínima é de 3 meses. | request_monthly_plans | sim / 5.3. Planos mensalistas | OK | Resposta aderente ao esperado. |
| 33 | professor e 1 hora? | O Pacote Professor Particular tem contratação mínima de 1 mês e está disponível às terças e quintas, das 13h às 17h30. Ele é indicado para uso de 1 dia por semana por R$ 350 men... | request_teacher_package | sim / Pacote Professor Particular | OK | Resposta aderente ao esperado. |
| 34 | professor particular tem quais horarios? | O Pacote Professor Particular está disponível às terças e quintas, das 13h às 17h30. A contratação mínima é de 1 mês. | request_teacher_package | sim / Pacote Professor Particular | OK | Resposta aderente ao esperado. |
| 35 | pacote professor pode avulso? | O Pacote Professor Particular tem contratação mínima de 1 mês e está disponível às terças e quintas, das 13h às 17h30. Não é possível contratar avulso fora desses dias e horários. | request_teacher_package | sim / Pacote Professor Particular | OK | Resposta aderente ao esperado. |
| 36 | tem desconto? | Os valores que consigo te passar são os da tabela oficial. Para desconto ou condição especial, posso encaminhar para um atendente verificar. | request_discount_rules | sim / DESCONTOS E CONDIÇÕES ESPECIAIS | OK | Resposta aderente ao esperado. |
| 37 | consegue melhorar o valor? | Os valores que consigo te passar são os da tabela oficial. Para desconto ou condição especial, posso encaminhar para um atendente verificar. | request_discount_rules | sim / 5. VALORES OFICIAIS, 11. DESCONTOS E CONDIÇÕES ESPECIAIS | OK | Resposta aderente ao esperado. |
| 38 | e se eu fechar varios dias? | Os valores que consigo te passar são os da tabela oficial. Para desconto ou condição especial, posso encaminhar para um atendente verificar. | request_discount_rules | sim / 5.4, 6 | OK | Resposta aderente ao esperado. |
| 39 | qual a cor das cadeiras? | Não encontrei essa informação confirmada aqui. Posso encaminhar para a equipe verificar para você. | knowledge_base_question | sim /  | OK | Resposta aderente ao esperado. |
| 40 | quero orcamento pra 15 pessoas, 2 dias, 3 horas por dia | *Orcamento estimado* Montei com os valores cadastrados. *Cenario considerado* Pessoas: 15 Uso: 2 dias/encontros de 3h cada Total: 6h *Melhor opcao* Pacote flexivel de 3h x 2 Cal... | consulta_valor | fluxo decisao / 1 | OK | Resposta aderente ao esperado. |
| 41 | quanto fica? | Para quantas pessoas? | consulta_valor | fluxo decisao /  | OK | Resposta aderente ao esperado. |
| 42 | 12 pessoas | Perfeito, anotei a quantidade de pessoas. Quantos dias/encontros serao ao todo? | diagnostico_inicial | fluxo decisao /  | OK | Resposta aderente ao esperado. |
| 43 | 3 dias | Perfeito, anotei. Quantas horas terá cada dia/encontro? | diagnostico_inicial | fluxo decisao /  | OK | Resposta aderente ao esperado. |
| 44 | 2 horas | *Orcamento estimado* Montei com os valores cadastrados. *Cenario considerado* Pessoas: 12 Uso: 3 dias/encontros de 2h cada Total: 6h *Melhor opcao* Pacote flexivel de 3h x 2 Cal... | consulta_valor | fluxo decisao / 1 | OK | Resposta aderente ao esperado. |
| 45 | 1 | Perfeito. Vou encaminhar para a equipe validar disponibilidade, reserva e condicoes finais. | pedido_reserva | fluxo decisao /  | OK | Resposta aderente ao esperado. |
| 46 | 2 | Para quantas pessoas? | revisar_orcamento | fluxo decisao /  | OK | Resposta aderente ao esperado. |
| 47 | antes disso, tem ar? | Sim, a Salinha Méier inclui ar-condicionado. | request_included_structure | sim / ESTRUTURA INCLUSA | OK | Resposta aderente ao esperado. |
| 48 | nao, quero saber onde fica | A Salinha Méier fica na Rua Dias da Cruz, 185 — Sala 215, Méier, Rio de Janeiro — RJ. Referências: Próximo ao Imperator — Centro Cultural João Nogueira — e à Smart Fit. | request_location | sim / INFORMAÇÕES GERAIS | OK | Resposta aderente ao esperado. |
| 49 | qual a cotacao do dolar hoje? | Posso te ajudar com informacoes da Salinha Meier, como valores, estrutura, capacidade, endereco, reserva e orcamento. | out_of_scope | sim / Politica de atendimento | OK | Resposta aderente ao esperado. |
| 50 | voce usa calcinha? | Não consigo ajudar com esse tipo de assunto por aqui. Posso continuar com informações sobre valores, estrutura, disponibilidade ou encaminhar para a equipe. | inappropriate_message | sim / Mensagem inadequada, ofensiva ou sexual | OK | Resposta aderente ao esperado. |

## Falhas e padroes

- Nenhuma falha funcional na bateria.

## Criterio de aceite

A bateria atende ao criterio de >=90% e sem falha critica nos blocos principais.