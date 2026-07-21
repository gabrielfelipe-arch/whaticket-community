# Rocket Service - Contexto Tecnico Para Agentes de IA

Ultima atualizacao: 2026-07-19

Este arquivo e a base viva de contexto tecnico do Rocket Service. Sempre que um agente alterar fluxo, regra de negocio, tabela, migracao, rota, tela, prompt/base de IA, integracao, Docker ou comportamento operacional, este documento deve ser atualizado no mesmo trabalho.

Objetivo: permitir que outro agente de IA entenda o sistema atual sem depender do historico da conversa.

## Regra de Manutencao

- Atualize este arquivo antes de finalizar qualquer mudanca relevante.
- Inclua novas tabelas, campos, rotas e regras de negocio.
- Se remover/desativar fluxo antigo, registre o que foi substituido.
- Se a regra ainda estiver incompleta, marque como `Pendente`.
- Nao documente senhas, tokens, chaves, dados reais de clientes ou conteudo integral de conversas.

## Visao Geral

Rocket Service e uma plataforma de atendimento baseada em Whaticket, com:

- atendimento por WhatsApp;
- filas, usuarios, contatos, tickets e mensagens;
- URA/menu;
- IA com prompt, base de conhecimento/RAG, logs e ferramentas;
- agendamento de mensagens;
- Agenda operacional/eventos removida e desconectada em 2026-07-18;
- campanhas;
- GLPI;
- configuracoes visuais e operacionais da empresa;
- Docker local com frontend, backend, Postgres e Evolution API.

Portas locais usadas no ambiente atual:

- Frontend: `http://localhost:3000`
- Backend exposto: `http://localhost:8080`
- Postgres host: `localhost:55432`
- Postgres container: `postgres:5432`

## Stack

- Backend: Node.js, TypeScript, Express, Sequelize, PostgreSQL.
- Frontend: React, Material UI, Vite.
- Banco: PostgreSQL.
- Mensageria WhatsApp: Whaticket/wwebjs e Evolution API no compose atual.
- Execucao local: `docker compose`.

Arquivos centrais:

- Backend app: `backend/src/app.ts`
- Backend bootstrap: `backend/src/bootstrap.ts`
- Banco/modelos: `backend/src/database/index.ts`, `backend/src/models`
- Migrations: `backend/src/database/migrations`
- Front routes: `frontend/src/routes/index.js`
- Menu lateral: `frontend/src/layout/MainListItems.js`
- API frontend: `frontend/src/services/api.js`
- Menu de conversa: `frontend/src/components/TicketOptionsMenu/index.js`
- Perfis de acesso: `backend/src/models/UserProfile.ts`, `backend/src/controllers/UserProfileController.ts`, `frontend/src/pages/UserProfiles/index.js`

## Dominios Principais

### Atendimento

Entidades centrais:

- `Contacts`: contatos e grupos.
- `Tickets`: atendimento aberto/pendente/fechado, fila, usuario, WhatsApp, URA e IA.
- `Messages`: mensagens do ticket.
- `Users`: atendentes/admins.
- `Queues`: filas.
- `Whatsapps`: conexoes/canais.
- `UserProfiles`: perfis configuraveis de acesso.

Fluxo basico:

1. Mensagem chega por WhatsApp.
2. Sistema identifica/cria `Contact`.
3. Sistema identifica/cria `Ticket`.
4. Mensagem entra em `Messages`.
5. Dependendo da fila/URA/IA, o ticket e respondido automaticamente, roteado ou fica para equipe.

### Usuarios, Perfis e Permissoes

Estado atual em 2026-07-19:

- O campo legado `Users.profile` continua existindo com os valores `admin`, `supervisor` e `user`. Ele ainda e usado por regras antigas, token e compatibilidade.
- A tabela `UserProfiles` foi adicionada para permitir perfis configuraveis pelo administrador.
- `Users.profileId` vincula um usuario ao perfil configuravel.
- Cada perfil possui `name`, `description`, `baseRole`, `permissions`, `isSystem` e `active`.
- `baseRole` sempre aponta para uma das bases legadas: `admin`, `supervisor` ou `user`.
- Os perfis padrao criados pela migration `20260719090000-create-user-profiles.ts` sao `Administrador`, `Supervisor` e `Atendente`.
- Ao criar ou editar usuario, o admin pode selecionar um `profileId`. O backend copia o `baseRole` do perfil para `Users.profile`, mantendo compatibilidade.
- Supervisor continua sem poder transformar usuario em admin e sem poder atribuir `profileId`.
- `SerializeUser` retorna `cpf`, `birthDate`, `jobTitle`, `mustChangePassword`, `workHours`, `profileId`, `profileName`, `permissions` e `specialPermissions`.
- `specialPermissions` antigas continuam funcionando e sao convertidas para permissoes efetivas quando aplicavel.
- Administrador real sempre ve/faz tudo. O perfil `Administrador` e fixo, de sistema, e nao aparece na matriz editavel.
- Perfis customizados podem usar apenas base `Atendente` ou `Supervisor`; somente administrador pode criar ou atribuir usuarios administradores.
- Login foi migrado para CPF. `POST /auth/login` aceita CPF e senha; e-mail nao deve ser usado como fallback de autenticacao.
- Campos obrigatorios do cadastro de usuario: nome completo (`name`), assinatura curta de mensagens (`messageSignature`), CPF (`cpf`), data de nascimento (`birthDate`), e-mail (`email`) e cargo (`jobTitle`).
- `Users.attendanceGreeting` e a mensagem de saudacao do atendimento, separada da assinatura. Ela pode ser usada quando o atendimento e assumido/aberto e nao deve ser confundida com o nome exibido nas mensagens assinadas.
- `Users.messageSignature` e o nome curto usado pelo frontend quando `signMessage` esta ativo no atendimento. O envio assinado usa `messageSignature` e cai para `name` apenas como fallback para usuarios antigos sem esse campo.
- Ao criar usuario, o backend nao recebe senha manual do front. A senha inicial e gerada pelos 6 primeiros digitos do CPF e `mustChangePassword` fica `true`.
- Reset de senha volta a senha para os 6 primeiros digitos do CPF, marca `mustChangePassword=true` e incrementa `tokenVersion` para invalidar sessoes antigas.
- Troca obrigatoria de senha usa `/users/change-password`, exige senha atual e senha nova forte: minimo 8 caracteres, letras, numeros e caractere especial. A nova senha nao pode ser igual aos 6 primeiros digitos do CPF.
- A troca obrigatoria deve aparecer como modal bloqueante na propria tela de login. O usuario nao deve ver `LoggedInLayout`, menu lateral ou qualquer tela interna antes de concluir a troca.
- `Users.workHours` guarda periodos JSON com `days`, `start` e `end`. Se vazio, acesso e liberado em qualquer horario. Se preenchido, login, refresh e rotas autenticadas bloqueiam acesso fora do horario.
- Permissao nova: `users.reset_password`, exibida na matriz como `Usuarios - resetar senha`.

Permissoes configuraveis atuais: a matriz cobre as telas principais, recursos internos de Configuracoes e acoes granulares por funcionalidade. A tela salva automaticamente cada checkbox alterado; nao ha botao global de salvar para a matriz.

- Atendimento: todos os usuarios autenticados podem usar o atendimento basico; excluir conversa/atendimento continua restrito ao Administrador.
- Contatos e respostas rapidas: visualizar, adicionar/criar, editar, excluir e importar.
- Automacao e campanhas: visualizar minhas/todas, editar minhas/todas, cancelar minhas/todas e clonar. Campanhas ainda podem ter pausa operacional; mensagens programadas nao possuem mais acao/permissao de pausar.
- Administracao: painel por filas vinculadas/todas as filas, relatorios, exportacoes, usuarios com visualizar/criar/editar/resetar senha/remover, perfis, conexoes com visualizar/reconectar/adicionar/editar/excluir e filas.
- Configuracoes: geral, logo, etiquetas, categorias, motivos de encerramento, pesquisa de satisfacao, logs, URA/fluxos/opcoes, formularios/construtor/respostas/relatorios e IA/agentes/base/memoria/leads/ferramentas.
- Integracoes e sistema: a matriz nao deve mostrar um guarda-chuva generico de "configurar integracoes". Use permissoes separadas para GLPI e WhatsApp. Configurar/sincronizar/abrir chamado GLPI implica `glpi.view`; configurar/atualizar WhatsApp implica `whatsapp_provider.view`; qualquer uma dessas visualizacoes libera o acesso a pagina `/integrations`.

Rotas novas:

- `GET /user-profiles/permissions`: lista grupos e permissoes disponiveis.
- `GET /user-profiles`: lista perfis.
- `POST /user-profiles`: cria perfil.
- `PUT /user-profiles/:profileId`: edita perfil.
- `DELETE /user-profiles/:profileId`: remove ou desativa perfil.

Tela nova:

- Frontend: `/profiles`, exibida no menu como `Perfis`.
- A tela e protegida por `profiles.manage`.
- O modal de usuario passou a exibir `Perfil de acesso` para admin, CPF, data de nascimento, cargo, assinatura obrigatoria e periodos de horario de trabalho.
- A tela `/profiles` usa matriz: funcionalidades nas linhas e perfis operacionais nas colunas.
- O perfil `Administrador` nao aparece na matriz e nao pode ser criado/editado pela tela; ele e perfil de sistema com acesso total fixo.
- Perfis customizados podem usar apenas base `Atendente` ou `Supervisor`. Somente administrador pode criar/atribuir usuarios administradores.
- Checkboxes da matriz salvam imediatamente via `PUT /user-profiles/:profileId`, com rollback visual em caso de erro.

Conexoes:

- A rota frontend `/connections` agora aceita `connections.view`.
- No backend, listar/ver conexoes usa `connections.view`.
- Criar, editar, remover, reconectar, gerar QR ou derrubar sessao usam permissoes granulares: `connections.create`, `connections.edit`, `connections.delete` e `connections.reconnect`.
- Quem tem apenas visualizacao nao recebe botoes de gerenciamento na tela de Conexoes.

Validacao de permissoes ampliada em 2026-07-19:

- Frontend: rotas e menu lateral passaram a consultar `user.permissions` para Dashboard, Tickets, Contatos, Conexoes, Usuarios, Perfis, Respostas rapidas, Configuracoes, Integracoes, Filas e Mensagens programadas/Campanhas.
- Mobile: barra inferior tambem consulta permissoes para tickets, contatos, painel e ajustes.
- Backend: adicionada validacao por `requirePermission` em rotas principais de contatos, mensagens, respostas rapidas, campanhas, mensagens programadas, usuarios, filas, tags, tickets, relatorios, configuracoes, GLPI, conexoes e provedor/atualizacao WhatsApp.
- Respostas rapidas: `quickAnswers.publish_global` controla separadamente a publicacao para toda a equipe. Administradores recebem a permissao automaticamente; perfis operacionais precisam recebe-la na matriz. O backend rejeita com `403` tentativas de publicar ou retirar a publicacao sem essa permissao, e o frontend nao exibe o controle para usuarios nao autorizados.
- Observacao: algumas leituras auxiliares, como `GET /queue` e `GET /tags`, continuam liberadas para usuario autenticado para nao quebrar selects/filtros de outras telas. Edicao continua protegida.
- Dashboard/Painel: `dashboard.view_linked_queues` mostra apenas filas vinculadas ao usuario; `dashboard.view_all_queues` mostra todas as filas. Administrador sempre ve tudo; supervisor so ve tudo se tiver permissao explicita.
- Mensagens programadas e campanhas filtram a listagem por `userId` quando o usuario nao tem permissao de visualizar todas.
- A listagem de Mensagens programadas abre por padrao filtrada em `Agendado` e ordenada da data mais recente para a mais antiga.
- Configuracoes granulares: etiquetas, categorias, motivos de encerramento e pesquisa de satisfacao possuem permissao propria para visualizar, adicionar, editar e excluir.

### IA, Prompt, Base e RAG

Entidades:

- `AiSettings`: configuracao de IA, prompt, modelo, ferramentas, handoff e calendario.
- `KnowledgeBaseArticles`: artigos/base de conhecimento.
- `KnowledgeBaseChunks`: pedacos da base para RAG.
- `AiTicketContexts`: memoria estruturada por ticket.
- `AiInteractionLogs`: auditoria de decisoes/respostas da IA.
- `AiToolExecutions`: log de ferramentas reais executadas/bloqueadas.
- `AiLeads`: leads extraidos do contexto.
- `AiCalendarConnections`: conexoes de calendario usadas por ferramentas de IA.

Regras importantes:

- A IA nao deve inventar disponibilidade, reserva, pagamento ou preco manualmente.
- Calculo oficial de orcamento deve ficar no motor oficial de calculo/comercial, nao no prompt.
- Base/RAG deve responder perguntas institucionais; ferramentas reais fazem acoes.
- Logs de IA devem permitir auditar decisao, intencao, base usada e ferramenta.

### URA e Formularios

Entidades:

- `UraFlows`: fluxo/menu.
- `UraOptions`: opcoes e acoes do fluxo.
- `QualificationForms`: formularios.
- `QualificationFormQuestions`: perguntas.
- `QualificationFormResponses`: execucao por ticket.
- `QualificationFormAnswers`: respostas coletadas.

Ponto de atencao:

- URA deve apoiar o atendimento, nao prender o cliente.
- Cliente pode escrever texto livre.
- Dados de formulario podem alimentar contexto de IA.

### Mensagens Programadas e Retorno

Entidades:

- `ScheduledMessages`: mensagens agendadas.
- `ScheduledMessageExecutions`: tentativas/logs de execucao.

Campos/fluxos recentes:

- Retorno de mensagem agendada carrega contexto de retorno.
- Fila define janela de retorno em horas por `scheduledReturnWindowHours`.
- Se o cliente responder dentro da janela, o atendimento deve ir para fila/equipe com contexto, sem cair novamente em URA/fila comum sem sentido.
- Contexto de retorno deve indicar quem agendou e o motivo.

### Agenda Operacional

Status atual: removida/desconectada em 2026-07-18 a pedido do usuario.

O que foi removido do runtime:

- pagina frontend `frontend/src/pages/Calendar`;
- rota frontend `/calendar`;
- item `Agenda` no menu lateral;
- opcao `Agendar evento` no menu de tres pontos do atendimento;
- endpoints operacionais `/calendar/books`, `/calendar/events`, `/calendar/event-types`, `/calendar/blocks`, `/calendar/reminder-templates` e disponibilidade;
- models operacionais `CalendarBook`, `CalendarEvent`, `CalendarEventType`, `CalendarBlock`, `CalendarEventParticipant`, `CalendarEventReminder`, `CalendarReminderTemplate`;
- migrations operacionais de agenda ainda nao devem ser reutilizadas sem novo desenho;
- ferramentas de IA `consultarAgenda` e `criarAgendamento` estao bloqueadas no backend e removidas das instrucoes de ferramentas disponiveis.

O que continua:

- mensagens programadas/campanhas em `ScheduledMessages`;
- contexto de retorno de mensagens programadas;
- configuracao/OAuth de Google Agenda para conexoes de IA (`AiCalendarConnections`), pois isso e uma integracao administrativa separada e pode ser reaproveitada no futuro.

Observacao de banco:

- se as tabelas `CalendarBooks`, `CalendarEvents`, `CalendarEventTypes`, `CalendarBlocks`, `CalendarEventParticipants`, `CalendarEventReminders` ou `CalendarReminderTemplates` ja existirem no Postgres local, trate como legado/orfao. Nao apagar dados via migration/drop sem pedido explicito do usuario.
- `{{eventNotes}}`
- Para remarcacao: `{{previousEventDate}}`, `{{previousEventTime}}`
- Para resumo: `{{summaryDate}}`, `{{eventsList}}`, `{{eventsTotal}}`

### GLPI

Entidades:

- `GlpiConfiguration`: configuracoes de integracao GLPI.
- `GlpiConfigurationWhatsapp`: vinculo configuracao/canal.
- `GlpiEntity`: entidades GLPI.
- `GlpiCategory`: categorias GLPI.
- `GlpiLocation`: locais GLPI.
- `GlpiTicketLink`: vinculo entre ticket Rocket e chamado GLPI.
- `GlpiLog`: logs da integracao.

Contexto:

- O sistema possui integracao GLPI e formulario/regras relacionadas a GLPI.
- Ha migrations para entidades, categorias, locais, formularios e filtros GLPI.
- Antes de alterar GLPI, verificar controllers/services e settings atuais.

### Comercial e Orcamento

Entidades:

- `CommercialService`: servicos comerciais.
- `CommercialIncludedItem`: itens inclusos.
- `CommercialPriceRule`: regras oficiais de preco.
- `CommercialQuoteSimulation`: simulacoes/orcamentos.

Regra critica:

- IA nao deve calcular preco manualmente.
- Qualquer preco/simulacao deve usar o motor oficial e tabelas comerciais.
- `CommercialServices.maxDurationPerOccurrence` limita a duracao de cada dia/encontro sem limitar o total de horas do pacote. Valor `NULL` desativa essa validacao.
- Para `salinha-meier-aluguel-sala`, o limite operacional atual e `10` horas por dia/encontro.

### Campanhas

Entidades:

- `Campaigns`
- `CampaignContacts`
- `CampaignRecipientLogs`

Relacionamento:

- Campanhas usam contatos, filtros, filas/canais e logs de envio.
- Podem coexistir com `ScheduledMessages`, mas nao sao a mesma coisa.

### Permissoes e Perfis

Estado conceitual discutido:

- Futuro desejado: perfis editaveis com matriz de acesso por tela/funcionalidade.
- Front deve esconder telas sem permissao.
- Back deve validar acesso mesmo se usuario digitar a rota manualmente.
- Permissoes especiais podem ficar para acoes especificas, como excluir mensagens ou editar campanhas de outros usuarios.

Estado atual:

- Ainda ha uso de `profile`, `Can`, regras em `frontend/src/rules.js` e helpers de permissao no backend.
- Antes de implementar perfis dinamicos, mapear todas as rotas/telas e substituir validacoes antigas com cuidado.

## Tabelas do Sistema

Lista baseada nos models carregados em `backend/src/database/index.ts`.

Inventario detalhado de campos por model/tabela:

- `docs/model-field-inventory.generated.md`
- `docs/postgres-schema-inventory.generated.md`

O primeiro vem dos models Sequelize. O segundo vem do schema real do Postgres local (`whaticket_pg/public`) e captura tambem colunas/constraints/indices que possam existir no banco mesmo se nao estiverem declarados nos models.

Esses inventarios gerados devem ser atualizados junto com este arquivo sempre que houver alteracao em models, migrations ou schema real.

| Tabela/Model | Funcao |
|---|---|
| `Users` | Usuarios, admins e atendentes. |
| `Contacts` | Contatos e grupos WhatsApp. |
| `Tickets` | Atendimento central, status, fila, usuario, contato, WhatsApp, IA e URA. |
| `Messages` | Historico de mensagens por ticket. |
| `Whatsapps` | Canais/sessoes WhatsApp. |
| `ContactCustomFields` | Campos extras do contato. |
| `Settings` | Configuracoes gerais do sistema. |
| `Queues` | Filas, horarios, distribuicao, IA e retorno agendado. |
| `WhatsappQueues` | Relacao WhatsApp/fila. |
| `UserQueues` | Relacao usuario/fila. |
| `QuickAnswers` | Respostas rapidas. |
| `WppKeys` | Chaves/sessao WhatsApp. Sensivel. |
| `TicketCategories` | Categorias de ticket. |
| `ClosingReasons` | Motivos de fechamento. |
| `UraFlows` | Fluxos de URA. |
| `UraOptions` | Opcoes/acoes da URA. |
| `AiSettings` | Configuracao de IA. |
| `KnowledgeBaseArticles` | Artigos da base. |
| `KnowledgeBaseChunks` | Fragmentos RAG. |
| `Campaigns` | Campanhas. |
| `CampaignContacts` | Contatos de campanhas. |
| `ScheduledMessages` | Mensagens agendadas/recorrentes. |
| `Tags` | Etiquetas. |
| `ContactTags` | Relacao contato/etiqueta. |
| `AiTaggerHistories` | Historico de classificacao por IA. |
| `SatisfactionSurveys` | Pesquisas de satisfacao. |
| `SatisfactionSurveyResponses` | Respostas de satisfacao. |
| `AuditLogs` | Auditoria de acoes. |
| `AiInteractionLogs` | Logs de interacao/decisao de IA. |
| `CampaignRecipientLogs` | Logs por destinatario de campanha. |
| `ScheduledMessageExecutions` | Execucoes de mensagens agendadas. |
| `QueueDistributionLogs` | Logs de distribuicao de fila. |
| `QualificationForms` | Formularios. |
| `QualificationFormQuestions` | Perguntas dos formularios. |
| `QualificationFormResponses` | Execucoes de formulario por ticket. |
| `QualificationFormAnswers` | Respostas do formulario. |
| `AiTicketContexts` | Memoria estruturada por ticket. |
| `AiLeads` | Leads extraidos pela IA. |
| `AiCalendarConnections` | Conexoes de calendario/Google Calendar para IA. |
| `AiToolExecutions` | Execucoes de ferramentas da IA. |
| `CommercialService` | Servicos comerciais. |
| `CommercialIncludedItem` | Itens inclusos em servicos. |
| `CommercialPriceRule` | Regras oficiais de preco. |
| `CommercialQuoteSimulation` | Simulacoes de orcamento. |
| `GlpiEntity` | Entidades GLPI. |
| `GlpiCategory` | Categorias GLPI. |
| `GlpiLocation` | Locais GLPI. |
| `GlpiTicketLink` | Vinculo ticket/chamado GLPI. |
| `GlpiLog` | Logs GLPI. |
| `GlpiConfiguration` | Configuracoes GLPI. |
| `GlpiConfigurationWhatsapp` | Vinculo GLPI/WhatsApp. |

## Inventario Completo De Funcionalidades

Fonte usada para este inventario:

- Frontend routes: `frontend/src/routes/index.js`
- Menu lateral: `frontend/src/layout/MainListItems.js`
- Backend routes: `backend/src/routes`
- Recursos administrativos: `backend/src/routes/customAdminRoutes.ts` e `frontend/src/pages/Settings/index.js`
- Models carregados: `backend/src/database/index.ts`

### Telas Do Frontend

| Rota | Tela | Funcao | Acesso atual |
|---|---|---|---|
| `/login` | `Login` | Entrada/autenticacao. | Publico |
| `/signup` | `Signup` | Cadastro. | Publico |
| `/` | `Dashboard` | Visao geral, indicadores e relatorios resumidos. | Logado |
| `/tickets/:ticketId?` | `Tickets` | Atendimento, conversas, envio/recebimento de mensagens, menu de opcoes do ticket. | Logado |
| `/connections` | `Connections` | Conexoes WhatsApp. | Admin/supervisor |
| `/contacts` | `Contacts` | Lista, cadastro, importacao e edicao de contatos. | Logado |
| `/users` | `Users` | Usuarios, status, perfis basicos e dados operacionais. | Admin/supervisor |
| `/quickAnswers` | `QuickAnswers` | Respostas rapidas com texto e midia. | Logado |
| `/settings` | `Settings` | Configuracoes administrativas, URA, IA, formularios, auditoria, GLPI/Google Agenda e branding. | Admin/supervisor ou permissoes especiais |
| `/integrations` | `Integrations` | Integracoes e provedores. | Admin |
| `/queues` | `Queues` | Filas, horarios, distribuicao, IA/GLPI e regras operacionais. | Admin |
| `/campaigns-schedules` | `CampaignsSchedules` | Campanhas e mensagens programadas. | Logado |

### Grupos Funcionais Do Menu

- Atendimento: dashboard, tickets, contatos, respostas rapidas.
- Operacao: conexoes WhatsApp, campanhas/agendamentos, filas.
- Administracao/configuracoes: usuarios, configuracoes, integracoes.
- O menu lateral e recolhivel; no estado recolhido mostra icones.
- Ha badge de tickets nao lidos no menu de atendimento.
- Ha aviso visual quando conexoes WhatsApp estao em `qrcode`, `PAIRING`, `DISCONNECTED`, `TIMEOUT` ou `OPENING`.

### Recursos Da Tela Configuracoes

Recursos administrativos CRUD/dinamicos:

| Recurso | Endpoint | Funcao |
|---|---|---|
| Categorias | `/ticket-categories` | Categorias de ticket. |
| Motivos de encerramento | `/closing-reasons` | Motivos, mensagem de despedida e comportamento de fechamento. |
| Pesquisa de satisfacao | `/satisfaction-surveys` | Pergunta, agradecimento, escala e feedback textual. |
| Etiquetas | `/tags` | Tags de contatos/tickets. |
| URA - Fluxos | `/ura-flows` | Fluxos principais de URA, mensagem inicial, fallback e midia. |
| URA - Opcoes | `/ura-options` | Opcoes, submenus, fila destino, IA, humano, fechamento e formularios. |
| Formularios de qualificacao | `/qualification-forms` | Formularios reutilizaveis. |
| Perguntas dos formularios | `/qualification-form-questions` | Perguntas, tipos, opcoes, GLPI, relatorio e contexto de IA. |
| Respostas dos formularios | `/qualification-form-responses` | Execucoes por ticket. |
| Relatorio das respostas | `/qualification-form-answers` | Respostas coletadas. |
| IA - Configuracoes | `/ai-settings` | Prompt, provider, modelo, ferramentas, handoff, auto-close e calendario. |
| Base de conhecimento | `/knowledge-base` | Artigos e conteudo usado por RAG. |
| Conexoes de agenda IA | `/ai-calendar-connections` | OAuth/configuracao de calendarios externos. |
| Contextos IA | `/ai-ticket-contexts` | Memoria estruturada dos tickets. |
| Leads IA | `/ai-leads` | Leads gerados pela IA. |
| Ferramentas IA | `/ai-tool-executions` | Logs de execucao de ferramentas reais. |
| Auditoria | `/audit-logs` | Historico de acoes administrativas. |

Configuracoes tambem cobre:

- dados visuais/branding do sistema;
- logo e remocao de logo;
- modo de exibicao;
- configuracoes de inatividade/status de usuarios;
- configuracoes Google Agenda/OAuth;
- apoio a upload de midia em URA/formularios;
- preview/exportacao de prompt/base em partes da IA.

### Funcionalidades De Atendimento

- Listar tickets por status/fila/usuario.
- A API de listagem inclui o responsavel em `ticket.user` somente com `id` e `name`; o frontend usa esses dados para exibir `Voce` ou o primeiro nome e o tooltip com o nome completo.
- No desktop, a coluna de tickets usa largura responsiva entre 340 e 400 px; no mobile, lista e conversa continuam em telas separadas.
- O cabecalho da lista possui tres linhas funcionais de 40 px: navegacao (`Inbox`, `Resolvidos`, `Busca`, novo atendimento), escopo/fila (`Meus`, `Todos`, `Todas as filas`) e status (`Atendendo`, `Aguardando`, `Em triagem`).
- `Meus` limita a tickets do usuario e nao atribuidos; `Todos` depende da permissao `tickets-manager:showall` e inclui tickets de outros atendentes nas filas selecionadas. O backend continua validando esse escopo.
- Cada ticket ocupa 60 px, sem cartao, sombra, nome repetido da fila ou status repetido. A fila e indicada pela faixa colorida com tooltip; o responsavel aparece no selo do avatar e ao lado do contato, ambos com tooltip.
- A sidebar nao possui comando de aceite. Clicar em um ticket aguardando apenas abre a conversa; o botao `Aceitar` permanece no cabecalho da conversa, em `TicketActionButtons`, como no fluxo original.
- A rolagem automatica usa o proprio elemento `MessagesList`; os conteineres de atendimento limitam a altura com `min-height: 0` e `overflow: hidden` para nunca deslocar o cabecalho da conversa para fora da viewport.
- `Nova conversa` aceita busca por contato ou telefone com DDI/DDD. Tanto um contato existente quanto um numero ainda nao cadastrado abrem apenas um rascunho efemero na area normal da conversa; selecionar o contato nunca cria ticket. Para numero nao cadastrado, `POST /tickets/validate-number` consulta o provedor ao clicar em `Iniciar conversa`; numero inexistente mantem o modal aberto e nao cria rascunho, contato ou ticket. O rascunho usa nome/foto quando o contato existe e oferece o mesmo compositor de texto, respostas rapidas, formatacao, emoji, anexo, audio e assinatura. Voltar ou recarregar descarta o rascunho sem ticket. `POST /tickets/by-number`, protegido por `tickets.manage` e `messages.send`, exige texto ou midia, revalida o numero e somente no primeiro envio reutiliza/cria o contato, abre o ticket e envia. Ao receber uma resposta, nomes tecnicos vazios ou iguais ao numero (`+5521...`) sao substituidos pelo nome informado pelo WhatsApp; nomes cadastrados manualmente nao sao sobrescritos.
- A transferencia manual usa `POST /tickets/:ticketId/transfer` e aceita exatamente um destino: usuario ou fila. O modal mostra somente o seletor correspondente ao tipo escolhido e remove da lista o usuario que ja atende o ticket; o backend tambem rejeita esse destino com `ERR_TRANSFER_SAME_USER`. Depois da transferencia confirmada, o cliente recebe `O atendente *[assinatura atual]* transferiu seu atendimento para *[assinatura do destino ou nome da fila]*.`, com origem e destino em negrito, e a mensagem fica registrada no historico. Se o ticket nao tiver atendente, a origem e a assinatura do usuario que executou a transferencia. Transferencia para fila remove o atendente atual e coloca o ticket como pendente; transferencia para usuario exige que o destino esteja online.
- A busca de destinatarios do modal usa `GET /tickets/:ticketId/transfer-users`, protegida por `tickets.manage` e pela autorizacao de acesso ao proprio ticket. Ela nao exige `users.view` e expoe somente `id`, nome, ativo e status operacional, evitando conceder a atendentes acesso ao cadastro administrativo de usuarios.
- Na abertura direta, telefone brasileiro pode ser informado apenas com DDD e numero (10 ou 11 digitos); o backend acrescenta DDI `55`. O zero de operadora antes do DDD tambem e aceito (`021...` vira `5521...`). Numeros iniciados por `+` preservam o DDI internacional. Baileys e Evolution consultam a existencia no WhatsApp antes de persistir dados. Numero inexistente ou sem WhatsApp mantem o rascunho aberto e retorna `ERR_WAPP_NUMBER_NOT_REGISTERED`; falha tecnica de consulta retorna `ERR_WAPP_CHECK_CONTACT`.
- Tooltips Material-UI usam globalmente `placement: top`, seta e atraso curto. Eles devem abrir acima do controle apontado para nao cobrir rotulos, opcoes ou conteudo localizado abaixo do ponteiro.
- Abrir ticket especifico por rota.
- Enviar mensagem de texto e midia.
- Receber mensagens via socket/webhook.
- Carregar mensagens anteriores.
- Reagir a mensagem.
- Excluir mensagem quando permitido.
- Transferir ticket.
- Encerrar ticket.
- Aplicar categorias, motivos e pesquisa.
- Usar respostas rapidas.
- Agendar mensagem pelo menu de tres pontos.
- Criar chamado GLPI a partir do ticket.
- Consultar status GLPI vinculado ao ticket.
- Manter contexto de retorno de mensagens agendadas.

### Funcionalidades De Contatos

- Listar, buscar, criar, editar e excluir contatos.
- Importar contatos do telefone.
- Importar contatos por planilha.
- Manter campos customizados.
- Manter tags.
- Identificar contatos por `number`, `lid`, `email`, `isGroup`.

### Funcionalidades De Filas

- CRUD de filas.
- Mensagem de saudacao.
- Horario de atendimento por modo sempre/empresa/customizado.
- Mensagem/midia de indisponibilidade.
- Distribuicao de atendimento.
- Limite de tickets ativos por usuario.
- Controle de usuarios vinculados.
- Controle de WhatsApps vinculados.
- Habilitar IA.
- Habilitar GLPI.
- Janela de retorno de mensagens agendadas em horas.
- Mensagem de posicao na fila.
- A mensagem de posicao inicial da fila aceita variaveis: `{{ticketId}}`, `{{queueName}}`, `{{position}}`, `{{contactName}}`, `{{nome_contato}}`, `{{telefone_contato}}` e `{{data_hora}}`.
- No frontend, o campo dessa mensagem usa autocomplete ao digitar `{{`.

### Funcionalidades De WhatsApp/Conexoes

- Listar canais.
- Criar, editar e remover WhatsApp.
- Abrir/atualizar/remover sessao.
- QR code/pareamento.
- Vincular URA e filas.
- Provider WhatsApp/Evolution API.
- Testar Evolution.
- Trocar provider.
- Webhooks Evolution com e sem instancia.
- Atualizacao/rollback de WhatsApp Web quando disponivel.

### Funcionalidades De Campanhas E Agendamentos

- CRUD de campanhas.
- Upload de midia em campanha.
- Duplicar campanha.
- Resumo de campanha.
- Logs por campanha.
- Reenviar falhas.
- CRUD de mensagens programadas.
- Preview de destinatarios por tags/filtros.
- Duplicar mensagem programada.
- Historico de execucoes.
- Recorrencia, intervalos, tags inclusivas/exclusivas e politica de execucao.
- Mensagens programadas nao devem exibir botao/status/permissao de pausa manual.

### Funcionalidades De Agenda

Status: removida/desconectada. Nao existe mais tela operacional de Agenda nem criacao de eventos no atendimento.

- Nao adicionar permissoes de Agenda operacional na matriz atual.
- Nao reativar rotas/models/migrations de agenda sem novo desenho aprovado pelo usuario.
- O que permanece relacionado a tempo/agendamento e apenas `ScheduledMessages` e o contexto de retorno de mensagens programadas.
- Conexoes de calendario de IA (`AiCalendarConnections`) continuam como integracao administrativa separada, mas nao representam a Agenda operacional removida.

### Funcionalidades De IA

- Configurar provider/modelo/API/baseUrl.
- Configurar prompts e comportamento.
- Configurar ferramentas permitidas.
- Configurar filas permitidas de transferencia.
- Configurar handoff humano.
- Configurar alerta de handoff.
- Configurar auto-close.
- Conectar calendario externo.
- Testar configuracao de IA.
- Usar base de conhecimento/RAG.
- Registrar logs de interacao.
- Registrar execucao de ferramentas.
- Gerar/manter contexto estruturado.
- Gerar leads.
- Classificar/aplicar tags.
- Usar dados de formularios como contexto.

### Funcionalidades De URA/Formularios

- Criar fluxos.
- Criar opcoes em arvore.
- Enviar mensagem/midia por opcao.
- Abrir submenu.
- Transferir para fila.
- Acionar IA.
- Encaminhar humano.
- Encerrar atendimento.
- Voltar menu anterior/root.
- Rodar formulario antes da acao.
- Formularios com perguntas texto, escolha unica/multipla, numero/data/hora/boolean/email/telefone e opcoes GLPI.
- Opcoes de formulario podem aplicar tags, abrir perguntas, transferir fila, iniciar IA ou abrir opcao URA.

### Funcionalidades GLPI

- Configurar GLPI legado/atual.
- Criar multiplas configuracoes.
- Vincular configuracao a WhatsApp.
- Testar conexao.
- Sincronizar entidades.
- Sincronizar categorias.
- Sincronizar localizacoes.
- Listar entidades/categorias/localizacoes.
- Ver logs.
- Criar chamado a partir de ticket.
- Consultar status GLPI do ticket.
- Usar formularios para preencher campos/regras GLPI.

### Funcionalidades Comerciais/Orcamento

- Cadastrar servicos comerciais.
- Cadastrar itens inclusos.
- Cadastrar regras oficiais de preco.
- Registrar simulacoes de orcamento.
- IA deve usar ferramenta/motor oficial, nunca calcular preco manualmente.

### Funcionalidades De Relatorios

- Dashboard.
- Exportacao de tickets.
- Exportacao de satisfacao.
- Historico de conversas.
- Detalhe de conversa.
- Relatorio de satisfacao.

## Inventario Completo De Rotas Backend

As rotas abaixo sao montadas por `backend/src/routes/index.ts`.

### Autenticacao

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh_token`
- `DELETE /auth/logout`

### API Externa

- `POST /api/messages/send`

### Settings

- `GET /public-settings`
- `GET /settings`
- `PUT /settings/:settingKey`
- `POST /settings/logo`
- `DELETE /settings/logo`

### Usuarios

- `GET /users`
- `GET /users/inactivity-settings`
- `POST /users/activity`
- `POST /users`
- `PUT /users/:userId/status`
- `PUT /users/:userId`
- `GET /users/:userId`
- `DELETE /users/:userId`

### Contatos

- `POST /contacts/import`
- `POST /contacts/import-spreadsheet`
- `GET /contacts`
- `GET /contacts/:contactId`
- `POST /contacts`
- `POST /contact`
- `PUT /contacts/:contactId`
- `DELETE /contacts/:contactId`

### Tickets

- `GET /tickets`
- `GET /tickets/:ticketId/previous-messages`
- `GET /tickets/:ticketId`
- `POST /tickets`
- `PUT /tickets/:ticketId`
- `DELETE /tickets/:ticketId`

### Mensagens

- `GET /messages/:ticketId`
- `POST /messages/:ticketId`
- `DELETE /messages/:messageId`
- `POST /messages/:messageId/reaction`

### WhatsApp E Provider

- `GET /whatsapp/`
- `POST /whatsapp/`
- `GET /whatsapp/:whatsappId`
- `PUT /whatsapp/:whatsappId`
- `DELETE /whatsapp/:whatsappId`
- `POST /whatsappsession/:whatsappId`
- `PUT /whatsappsession/:whatsappId`
- `DELETE /whatsappsession/:whatsappId`
- `GET /whatsapp-updates/status`
- `GET /whatsapp-updates/progress`
- `POST /whatsapp-updates/install`
- `POST /whatsapp-updates/rollback`
- `GET /whatsapp-provider`
- `PUT /whatsapp-provider`
- `POST /whatsapp-provider/test-evolution`
- `POST /whatsapp-provider/switch`
- `POST /webhooks/evolution`
- `POST /webhooks/evolution/:instance`

### Filas

- `GET /queue`
- `POST /queue`
- `GET /queue/:queueId`
- `PUT /queue/:queueId`
- `DELETE /queue/:queueId`

### Respostas Rapidas

- `GET /quickAnswers`
- `GET /quickAnswers/:quickAnswerId`
- `POST /quickAnswers`
- `PUT /quickAnswers/:quickAnswerId`
- `DELETE /quickAnswers/:quickAnswerId`
- Escopo: respostas privadas pertencem ao usuario criador; respostas com `global=true` ficam disponiveis para toda a equipe.
- Permissoes: `quickAnswers.view`, `quickAnswers.create`, `quickAnswers.edit`, `quickAnswers.delete` e `quickAnswers.publish_global`. A ultima e obrigatoria para alterar o campo `global`, inclusive por chamada direta a API.

### Tags

- `GET /tags`
- `POST /tags`
- `PUT /tags/:tagId`
- `DELETE /tags/:tagId`

### Campanhas E Mensagens Programadas

- `GET /campaigns`
- `POST /campaigns`
- `PUT /campaigns/:campaignId`
- `DELETE /campaigns/:campaignId`
- `GET /campaigns/:campaignId/summary`
- `GET /campaigns/:campaignId/logs`
- `POST /campaigns/:campaignId/retry-failed`
- `POST /campaigns/:campaignId/duplicate`
- `GET /scheduled-messages`
- `POST /scheduled-messages/recipient-preview`
- `POST /scheduled-messages`
- `PUT /scheduled-messages/:scheduleId`
- `DELETE /scheduled-messages/:scheduleId`
- `GET /scheduled-messages/:scheduleId/executions`
- `POST /scheduled-messages/:scheduleId/duplicate`

### Recursos Administrativos Customizados

Todos estes recursos possuem:

- `GET <path>`
- `POST <path>`
- `PUT <path>/:id`
- `DELETE <path>/:id`

Recursos:

- `/ticket-categories`
- `/closing-reasons`
- `/ura-flows`
- `/ura-options`
- `/ai-settings`
- `/knowledge-base`
- `/satisfaction-surveys`
- `/qualification-forms`
- `/qualification-form-questions`
- `/qualification-form-responses`
- `/qualification-form-answers`
- `/ai-ticket-contexts`
- `/ai-leads`
- `/ai-calendar-connections`
- `/ai-tool-executions`

Rotas adicionais:

- `GET /audit-logs`
- `POST /ai-settings/:id/test`
- `POST /qualification-form-message-media`
- `GET /custom/:resource`
- `POST /custom/:resource`
- `PUT /custom/:resource/:id`
- `DELETE /custom/:resource/:id`

### Relatorios

- `GET /reports/dashboard`
- `GET /reports/tickets/export`
- `GET /reports/satisfaction/export`
- `GET /reports/conversations`
- `GET /reports/conversations/:ticketId`
- `GET /reports/satisfaction`

### GLPI

- `GET /glpi/config`
- `PUT /glpi/config`
- `GET /glpi/configurations`
- `POST /glpi/configurations`
- `DELETE /glpi/configurations/:configurationId`
- `POST /glpi/test-connection`
- `POST /glpi/sync/entities`
- `POST /glpi/sync/categories`
- `POST /glpi/sync/locations`
- `GET /glpi/entities`
- `GET /glpi/categories`
- `GET /glpi/locations`
- `GET /glpi/logs`
- `GET /tickets/:ticketId/glpi`
- `POST /tickets/:ticketId/glpi`

### Google Calendar/OAuth

- `GET /calendar/google/auth`
- `GET /calendar/google/callback`

## Fluxos Criticos

### IA Apos Formulario E Limites Operacionais

1. O formulario de qualificacao pode iniciar o agente configurado e o fluxo guiado de orcamento.
2. A primeira coleta do fluxo de aluguel de sala e a quantidade de pessoas.
3. Respostas em faixa usam o maior valor informado, inclusive quando houver texto livre ou erro de digitacao reconhecido pelo contexto, por exemplo `15 a 25 oessoas` resulta em 25.
4. Se a quantidade superar a capacidade cadastrada na base, o backend informa o limite, grava o limite como quantidade usada na simulacao e continua coletando dias/encontros e horas.
5. Exceder a capacidade nao encaminha para atendente e nao interrompe o orcamento. Encaminhamento continua reservado a pedido explicito do cliente ou operacao que realmente exija equipe.
6. Dias/encontros e horas devem ser coletados como valores exatos antes de chamar o motor oficial de calculo.
7. O motor valida `durationPerOccurrence` contra `CommercialServices.maxDurationPerOccurrence`. Na Salinha Meier, uma resposta como `30 horas por dia` e ajustada para `10 horas por dia`, o cliente e avisado e a simulacao continua sem encaminhamento.
8. O limite e por ocorrencia: `3 dias x 10h` continua valido como `30h` totais. Uma solicitacao de pacote com `30h` totais, sem declarar `30h` em um unico encontro, tambem continua valida.
9. O valor efetivamente usado depois do ajuste e salvo em `AiTicketContexts`, evitando que a etapa seguinte reutilize a duracao impossivel.

Rollback rapido do limite por ocorrencia, sem restaurar banco nem remover coluna:

```sql
UPDATE "CommercialServices"
SET "maxDurationPerOccurrence" = NULL
WHERE "slug" = 'salinha-meier-aluguel-sala';
```

Para reativar, trocar `NULL` por `10`. A migration `20260721011000-add-max-duration-per-occurrence-to-commercial-services.ts` tambem possui `down` para remover a coluna, mas isso exige reverter junto o codigo que a consulta. Backup anterior a esta mudanca: `backups/pre-max-hours-per-occurrence-20260721-0102.dump`.

### Autoria Das Mensagens Automaticas

- `Messages.senderType` diferencia `customer`, `ai`, `human`, `system` e `ura`.
- O eco `fromMe` recebido do WhatsApp nao pode trocar uma mensagem ja gravada como `ai`, `system` ou `ura` para `human`.
- O bloqueio que impede a IA de responder por cima de atendente considera apenas mensagens realmente humanas na sessao atual.
- Alteracoes nessa classificacao devem cobrir a ordem de corrida entre envio local e eco do provedor.
- Antes do envio, textos e legendas passam por `PrepareWhatsAppText`: negrito Markdown `**texto**` vira o formato nativo do WhatsApp `*texto*`.
- O mesmo normalizador corrige um marcador fechado por engano no meio da palavra, por exemplo `*Gabrie*l` para `*Gabriel*`. A formatacao exibida no frontend nao garante, sozinha, que a sintaxe aceita pelo WhatsApp esteja valida.

### Agenda Operacional Removida

1. Nao existe rota frontend `/calendar`.
2. Nao existe item `Agenda` no menu lateral.
3. Nao existe `Agendar evento` no atendimento.
4. Endpoints operacionais de eventos/agendas foram desconectados.
5. IA nao deve consultar disponibilidade nem criar agendamento por ferramenta.

### Mensagem Agendada Com Retorno

1. Usuario agenda mensagem pela conversa.
2. Sistema salva `ScheduledMessages` com contato, ticket origem, fila de retorno e contexto.
3. Quando a mensagem dispara, o cliente pode responder.
4. Se responder dentro da janela da fila, atendimento retorna com contexto para equipe.
5. Ao aplicar o retorno, o sistema marca `returnHandledAt` para consumir aquela janela.
6. Ao encerrar o ticket, o backend invalida janelas de retorno ainda abertas daquele contato/WhatsApp, marcando `returnHandledAt`.
7. Depois do encerramento, uma nova mensagem do cliente deve seguir o fluxo normal; o contexto de retorno antigo nao pode pular URA/fila novamente.

## Rotas Relevantes

Google Calendar/OAuth:

- `GET /calendar/google/auth`
- `GET /calendar/google/callback`

## Boas Praticas Para Proximos Agentes

- Antes de alterar regra de negocio, procurar por controller, model, migration, frontend e testes.
- Nao confiar so no front para validacao; regra critica deve estar no backend.
- Depois de mexer em backend, rodar `npm run build` em `backend`.
- Depois de mexer em frontend, rodar `npm run build` em `frontend`.
- Se a mudanca precisa aparecer no localhost Docker, rodar `docker compose build backend frontend` e recriar containers.
- Verificar `http://localhost:3000` e `http://localhost:8080/public-settings`.
- Ao mexer em agenda, testar:
  - agenda fixa;
  - agenda livre;
  - horario ocupado;
  - encaixe;
  - cancelamento;
  - criacao pela conversa.
- Ao mexer em IA, preservar:
  - base/RAG;
  - ferramentas reais;
  - motor oficial de calculo;
  - logs;
  - guardrails contra calculo manual e confirmacao indevida.

## Pendencias Conhecidas / Melhorias Futuras

- Editor visual de modelos de mensagem da agenda com botoes de variaveis, emoji, negrito e preview WhatsApp.
- Perfis dinamicos com matriz de permissao por tela/funcionalidade e validacao no backend.
- Manter `docs/model-field-inventory.generated.md` sincronizado com os models.
- Manter `docs/postgres-schema-inventory.generated.md` sincronizado com o schema real do Postgres.
- Criar testes automatizados focados na agenda: disponibilidade, conflito, encaixe diario e cancelamento.
- Atualizar `docs/database-map.md`, que esta com snapshot antigo de 2026-06-07.
