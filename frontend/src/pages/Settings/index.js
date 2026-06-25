import React, { useContext, useState, useEffect, useRef } from "react";
import openSocket from "../../services/socket-io";

import {
	Button,
	Container,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Chip,
	Checkbox,
	FormControlLabel,
	Grid,
	IconButton,
	InputAdornment,
	MenuItem,
	Paper,
	Select,
	Slider,
	Switch,
	Tab,
	Tabs,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TextField,
	Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import CloudDownloadIcon from "@material-ui/icons/CloudDownload";
import DragIndicatorIcon from "@material-ui/icons/DragIndicator";
import EditIcon from "@material-ui/icons/Edit";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import SearchIcon from "@material-ui/icons/Search";
import Autocomplete from "@material-ui/lab/Autocomplete";
import { toast } from "react-toastify";

import api from "../../services/api";
import { i18n } from "../../translate/i18n.js";
import toastError from "../../errors/toastError";
import MessageTemplateField from "../../components/MessageTemplateField";
import TagCheckboxPicker from "../../components/TagCheckboxPicker";
import { getBackendUrl } from "../../config";
import { AuthContext } from "../../context/Auth/AuthContext";

const businessWeekdayOptions = [
	{ value: 1, label: "Seg" },
	{ value: 2, label: "Ter" },
	{ value: 3, label: "Qua" },
	{ value: 4, label: "Qui" },
	{ value: 5, label: "Sex" },
	{ value: 6, label: "Sab" },
	{ value: 0, label: "Dom" },
];

const defaultBusinessHoursRule = () => ({
	days: [1, 2, 3, 4, 5],
	start: "08:00",
	end: "18:00",
});

const parseBusinessHours = value => {
	try {
		const parsed = typeof value === "string" ? JSON.parse(value || "[]") : value;
		if (!Array.isArray(parsed) || !parsed.length) return [defaultBusinessHoursRule()];
		return parsed.map(rule => ({
			days: Array.isArray(rule.days) ? rule.days.map(Number) : [],
			start: rule.start || "08:00",
			end: rule.end || "18:00",
		}));
	} catch (err) {
		return [defaultBusinessHoursRule()];
	}
};

const serializeBusinessHours = rules =>
	JSON.stringify(
		(rules || [])
			.map(rule => ({
				days: (rule.days || []).map(Number).sort(),
				start: rule.start || "08:00",
				end: rule.end || "18:00",
			}))
			.filter(rule => rule.days.length && rule.start && rule.end)
	);

const useStyles = makeStyles(theme => ({
	root: {
		flex: 1,
		padding: theme.spacing(2),
		overflowY: "auto",
		...theme.scrollbarStyles,
		backgroundColor: theme.palette.background.default
	},
	pageHeader: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "flex-start",
		gap: theme.spacing(2),
		marginBottom: theme.spacing(2)
	},
	header: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: theme.spacing(2),
		gap: theme.spacing(1)
	},
	tabs: {
		marginBottom: theme.spacing(2),
		minHeight: 44,
		borderBottom: `1px solid ${theme.palette.divider}`
	},
	navTabs: {
		marginBottom: theme.spacing(2),
		minHeight: 44,
		padding: theme.spacing(0.5),
		borderRadius: 8,
		border: `1px solid ${theme.palette.divider}`,
		background: theme.palette.type === "dark" ? theme.palette.background.paper : "#f8fafc",
		"& .MuiTabs-indicator": {
			display: "none"
		},
		"& .MuiTab-root": {
			minHeight: 36,
			borderRadius: 6,
			textTransform: "none",
			fontWeight: 600
		},
		"& .Mui-selected": {
			background: theme.palette.background.paper,
			boxShadow: theme.custom?.cardShadow || "0 1px 3px rgba(15, 23, 42, 0.12)"
		}
	},
	generalPaper: {
		padding: theme.spacing(2),
		display: "flex",
		alignItems: "center",
		marginBottom: theme.spacing(2),
		borderRadius: 8,
		border: `1px solid ${theme.palette.divider}`,
		boxShadow: theme.custom?.cardShadow,
		background: theme.palette.background.paper
	},
	businessHoursRuleCard: {
		padding: theme.spacing(1.5),
		border: "1px solid #E2E8F0",
		borderRadius: 8
	},
	businessHoursWeekdays: {
		display: "grid",
		gridTemplateColumns: "repeat(7, minmax(68px, 1fr))",
		gap: theme.spacing(0.5),
		alignItems: "center",
		[theme.breakpoints.down("sm")]: {
			gridTemplateColumns: "repeat(2, minmax(0, 1fr))"
		}
	},
	businessWeekdayOption: {
		marginLeft: 0,
		marginRight: 0,
		whiteSpace: "nowrap"
	},
	settingOption: {
		marginLeft: "auto"
	},
	tableWrapper: {
		overflowX: "auto"
	},
	richEditorToolbar: {
		display: "flex",
		gap: theme.spacing(1),
		flexWrap: "wrap",
		marginTop: theme.spacing(1),
		marginBottom: theme.spacing(1)
	},
	richEditorButton: {
		minWidth: 36,
		padding: theme.spacing(0.5, 1),
		textTransform: "none"
	},
	richEditor: {
		minHeight: 220,
		padding: theme.spacing(1.5),
		border: `1px solid ${theme.palette.divider}`,
		borderRadius: 8,
		background: theme.palette.background.paper,
		color: theme.palette.text.primary,
		outline: "none",
		lineHeight: 1.55,
		"&:focus": {
			borderColor: theme.palette.primary.main,
			boxShadow: `0 0 0 1px ${theme.palette.primary.main}`
		},
		"& p": {
			margin: "0 0 10px"
		},
		"& ul, & ol": {
			marginTop: 0,
			marginBottom: 10,
			paddingLeft: 24
		}
	},
	contentPaper: {
		padding: theme.spacing(2),
		borderRadius: 8,
		boxShadow: theme.custom?.cardShadow,
		borderColor: theme.palette.divider
	},
	calendarSettingsPanel: {
		padding: theme.spacing(2),
		marginBottom: theme.spacing(2),
		borderRadius: 8,
		border: `1px solid ${theme.palette.divider}`,
		background: theme.palette.background.paper
	},
	calendarSettingsHeader: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "flex-start",
		gap: theme.spacing(2),
		marginBottom: theme.spacing(2),
		flexWrap: "wrap"
	},
	calendarCallbackBox: {
		padding: theme.spacing(1),
		borderRadius: 6,
		background: theme.palette.type === "dark" ? theme.palette.background.default : "#f8fafc",
		border: `1px solid ${theme.palette.divider}`,
		wordBreak: "break-all"
	},
	formBuilderPanel: {
		padding: theme.spacing(2),
		height: "100%",
		borderRadius: 8,
		borderColor: theme.palette.divider
	},
	formBuilderStack: {
		display: "flex",
		flexDirection: "column",
		gap: theme.spacing(2)
	},
	formBuilderCompactPanel: {
		padding: theme.spacing(2),
		borderRadius: 8,
		borderColor: theme.palette.divider
	},
	formBuilderToolbar: {
		display: "flex",
		justifyContent: "flex-end",
		alignItems: "center",
		gap: theme.spacing(1),
		padding: 0,
		borderRadius: 8,
		marginTop: -58,
		marginBottom: theme.spacing(2),
		minHeight: 46,
		pointerEvents: "none",
		[theme.breakpoints.down("sm")]: {
			marginTop: 0,
			flexDirection: "column",
			alignItems: "stretch"
		}
	},
	formBuilderToolbarActions: {
		display: "flex",
		gap: theme.spacing(1),
		alignItems: "center",
		pointerEvents: "auto",
		[theme.breakpoints.down("sm")]: {
			flexDirection: "column",
			alignItems: "stretch"
		}
	},
	formBuilderList: {
		display: "grid",
		gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
		gap: theme.spacing(1),
		marginTop: theme.spacing(1.5),
		"& $formBuilderItem": {
			marginBottom: 0
		}
	},
	formBuilderHeader: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: theme.spacing(1),
		marginBottom: theme.spacing(1)
	},
	formBuilderMuted: {
		color: theme.palette.text.secondary
	},
	formBuilderItem: {
		padding: theme.spacing(1.5),
		marginBottom: theme.spacing(1),
		cursor: "pointer",
		borderRadius: 8,
		border: `1px solid ${theme.palette.divider}`,
		background: theme.palette.background.paper
	},
	formBuilderItemActive: {
		borderColor: theme.palette.primary.main,
		boxShadow: `0 0 0 1px ${theme.palette.primary.main}`
	},
	formBuilderItemDragging: {
		opacity: 0.55,
		borderColor: theme.palette.primary.main,
		background: theme.palette.action.hover
	},
	dragHandle: {
		cursor: "grab",
		color: theme.palette.text.secondary,
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		width: 32,
		height: 32,
		borderRadius: 8,
		"&:active": {
			cursor: "grabbing"
		}
	},
	questionTypeGrid: {
		display: "grid",
		gridTemplateColumns: "repeat(auto-fit, minmax(136px, 1fr))",
		gap: theme.spacing(1),
		marginTop: theme.spacing(1)
	},
	questionTypeButton: {
		justifyContent: "flex-start",
		textTransform: "none",
		minHeight: 44
	},
	optionEditorRow: {
		padding: theme.spacing(1.25),
		marginTop: theme.spacing(1),
		borderRadius: 8,
		border: `1px solid ${theme.palette.divider}`,
		background: theme.palette.background.paper
	},
	questionEmptyState: {
		padding: theme.spacing(3),
		marginTop: theme.spacing(1.5),
		borderRadius: 8,
		border: `1px dashed ${theme.palette.divider}`,
		background: theme.palette.type === "dark" ? theme.palette.background.default : "#f8fafc",
		textAlign: "center"
	},
	questionMetaRow: {
		display: "flex",
		flexWrap: "wrap",
		gap: theme.spacing(1),
		marginTop: theme.spacing(0.75)
	},
	previewBox: {
		padding: theme.spacing(1.5),
		marginTop: theme.spacing(1.5),
		borderRadius: 8,
		border: `1px solid ${theme.palette.divider}`,
		background: theme.palette.type === "dark" ? theme.palette.background.default : "#f7fafc"
	},
	inlineChips: {
		display: "flex",
		flexWrap: "wrap",
		gap: theme.spacing(0.75),
		marginTop: theme.spacing(1)
	},
	sectionSubtitle: {
		color: theme.palette.text.secondary,
		marginTop: theme.spacing(0.5)
	},
	auditItem: {
		padding: theme.spacing(1.5),
		marginBottom: theme.spacing(1),
		borderRadius: 8,
		border: `1px solid ${theme.palette.divider}`,
		background: theme.palette.background.paper
	},
	auditSummary: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: theme.spacing(1),
		flexWrap: "wrap"
	},
	auditChanges: {
		marginTop: theme.spacing(1),
		display: "grid",
		gap: theme.spacing(0.5)
	}
}));

const resources = [
	{
		label: "Categorias",
		endpoint: "/ticket-categories",
		title: "Categoria",
		fields: [
			{ name: "name", label: "Nome", required: true },
			{ name: "description", label: "Descricao", multiline: true },
			{ name: "active", label: "Ativo", type: "boolean" }
		],
		columns: ["id", "name", "description", "active"]
	},
	{
		label: "Motivos de encerramento",
		endpoint: "/closing-reasons",
		title: "Motivo de encerramento",
		fields: [
			{ name: "name", label: "Nome", required: true },
			{ name: "description", label: "Descricao", multiline: true },
			{ name: "farewellMessage", label: "Mensagem de encerramento", multiline: true, template: true },
			{ name: "sendFarewellMessage", label: "Enviar mensagem ao encerrar", type: "boolean" },
			{ name: "active", label: "Ativo", type: "boolean" }
		],
		columns: ["id", "name", "sendFarewellMessage", "active"]
	},
	{
		label: "Pesquisa de satisfação",
		endpoint: "/satisfaction-surveys",
		title: "Pesquisa de satisfação",
		fields: [
			{ name: "name", label: "Nome", required: true },
			{ name: "question", label: "Mensagem da pesquisa", multiline: true, template: true, required: true },
			{ name: "thankYouMessage", label: "Mensagem de agradecimento", multiline: true, template: true },
			{
				name: "collectFeedbackText",
				label: "Coletar elogios, sugestoes ou reclamacoes",
				type: "boolean",
				helperText: "Depois da nota, envia uma pergunta opcional para capturar um comentario em texto."
			},
			{
				name: "feedbackQuestion",
				label: "Pergunta descritiva",
				multiline: true,
				template: true,
				showWhen: form => !!form.collectFeedbackText,
				helperText: "Ex: Se quiser, deixe um elogio, sugestao ou reclamacao sobre o atendimento."
			},
			{
				name: "feedbackTimeoutMinutes",
				label: "Tempo para aguardar comentario (minutos)",
				type: "number",
				showWhen: form => !!form.collectFeedbackText,
				helperText: "Apos esse prazo, novas mensagens nao serao tratadas como resposta da pesquisa."
			},
			{
				name: "scaleType",
				label: "Tipo de escala",
				type: "select",
				options: [
					{ value: "1_5", label: "Nota de 1 a 5" },
					{ value: "1_10", label: "Nota de 1 a 10" }
				]
			},
			{
				name: "sendMode",
				label: "Envio da pesquisa",
				type: "select",
				options: [
					{ value: "optional", label: "Opcional no fechamento" },
					{ value: "always", label: "Obrigatório/automático no fechamento" },
					{ value: "disabled", label: "Desativado" }
				]
			},
			{ name: "active", label: "Ativo", type: "boolean" }
		],
		columns: ["id", "name", "scaleType", "sendMode", "active"]
	},
	{
		label: "Mensagens rapidas",
		endpoint: "/quickAnswers",
		listKey: "quickAnswers",
		title: "Mensagem rapida",
		fields: [
			{ name: "shortcut", label: "Atalho", required: true },
			{ name: "message", label: "Mensagem", multiline: true, required: true },
			{ name: "global", label: "Publica para todos", type: "boolean" }
		],
		columns: ["id", "shortcut", "message", "global"]
	},
	{
		label: "Etiquetas",
		endpoint: "/tags",
		title: "Etiqueta",
		fields: [
			{ name: "name", label: "Nome", required: true },
			{ name: "color", label: "Cor", type: "color" },
			{
				name: "fixed",
				label: "Etiqueta fixa",
				type: "boolean",
				helperText: "Marque esta opção quando esta etiqueta não puder ser removida automaticamente pela IA. Use para etiquetas importantes, como Cliente VIP, Não receber campanha, Bloqueado ou Convertido."
			}
		],
		columns: ["id", "name", "color", "fixed"]
	},
	{
		label: "URA - Fluxos",
		endpoint: "/ura-flows",
		title: "Fluxo de URA",
		fields: [
			{ name: "name", label: "Nome", required: true },
			{ name: "description", label: "Descricao", multiline: true },
			{ name: "welcomeMessage", label: "Mensagem inicial", multiline: true, required: true, template: true, media: true },
			{ name: "welcomeMediaName", label: "Anexo", readOnly: true },
			{ name: "invalidOptionMessage", label: "Mensagem opcao invalida", multiline: true },
			{ name: "maxInvalidAttempts", label: "Maximo de tentativas invalidas", type: "number" },
			{ name: "fallbackQueueId", label: "Fila fallback", type: "relation", relation: "queues", nullable: true },
			{ name: "active", label: "Ativo", type: "boolean" }
		],
		columns: ["id", "name", "welcomeMessage", "active"]
	},
	{
		label: "URA - Opcoes",
		endpoint: "/ura-options",
		title: "Opcao de URA",
		fields: [
			{ name: "flowId", label: "Fluxo URA", type: "relation", relation: "uraFlows", required: true },
			{
				name: "parentOptionId",
				label: "Opcao pai / camada anterior",
				type: "relation",
				relation: "uraOptions",
				nullable: true,
				helperText: "Deixe em branco para aparecer no menu principal. Se escolher uma opcao pai, esta opcao aparece dentro desse submenu."
			},
			{ name: "optionKey", label: "Opcao digitada. Ex: 1", required: true },
			{ name: "title", label: "Titulo", required: true },
			{ name: "responseMessage", label: "Mensagem de resposta", multiline: true, template: true, media: true },
			{ name: "responseMediaName", label: "Anexo", readOnly: true },
			{
				name: "action",
				label: "Acao",
				type: "select",
				options: [
					{ value: "SEND_MESSAGE", label: "Enviar mensagem" },
					{ value: "OPEN_SUBMENU", label: "Abrir submenu" },
					{ value: "TRANSFER_QUEUE", label: "Transferir para fila" },
					{ value: "START_AI", label: "Acionar IA" },
					{ value: "HUMAN", label: "Encaminhar para humano" },
					{ value: "CLOSE_TICKET", label: "Encerrar atendimento" },
					{ value: "BACK_PREVIOUS", label: "Voltar ao menu anterior" },
					{ value: "BACK_ROOT", label: "Voltar ao menu inicial" }
				]
			},
			{ name: "targetQueueId", label: "Fila destino", type: "relation", relation: "queues", nullable: true, showWhen: form => ["TRANSFER_QUEUE", "HUMAN", "START_AI"].includes(form.action) },
			{
				name: "closingReasonId",
				label: "Motivo de encerramento",
				type: "relation",
				relation: "closingReasons",
				nullable: true,
				showWhen: form => form.action === "CLOSE_TICKET",
				helperText: "Obrigatorio quando a opcao da URA encerrar o atendimento."
			},
			{
				name: "aiHumanHandoffEnabled",
				label: "Permitir que a IA chame atendente",
				type: "boolean",
				helperText: "Ao marcar, aparecem os campos de fila humana e mensagem de transferencia. Pode ser usado junto com aviso e encerramento automatico."
			},
			{
				name: "aiHumanHandoffQueueId",
				label: "Fila humana para encaminhar",
				type: "relation",
				relation: "queues",
				nullable: true,
				helperText: "Escolha a fila que recebera o atendimento quando a IA chamar uma pessoa."
			},
			{
				name: "aiHumanHandoffMessage",
				label: "Mensagem para o cliente antes de transferir",
				multiline: true,
				template: true,
				helperText: "Mensagem enviada ao cliente antes de mover o atendimento para a fila humana."
			},
			{
				name: "aiAutoCloseEnabled",
				label: "Ativar encerramento por inatividade do atendimento automatico",
				type: "boolean",
				helperText: "Ao marcar, esta opcao usa uma regra propria de inatividade para URA ou IA. Se deixar desmarcado, usa a regra geral da URA."
			},
			{
				name: "aiAutoCloseMinutes",
				label: "Tempo sem resposta/interacao para encerrar",
				type: "number",
				helperText: "Informe quantos minutos o atendimento automatico deve aguardar sem resposta do cliente antes de encerrar. Ex: 30."
			},
			{
				name: "aiAutoCloseMessage",
				label: "Mensagem antes de encerrar",
				multiline: true,
				template: true,
				helperText: "Mensagem enviada ao cliente antes do encerramento automatico pela IA."
			},
			{
				name: "aiAutoCloseReasonId",
				label: "Motivo de encerramento",
				type: "relation",
				relation: "closingReasons",
				nullable: true,
				helperText: "Escolha o motivo usado quando esta opcao encerrar automaticamente por inatividade."
			},
			{
				name: "aiAutoCloseOnlyIfNotHandedOff",
				label: "Nao encerrar se ja foi encaminhado",
				type: "boolean",
				helperText: "Evita encerrar automaticamente quando o atendimento ja saiu da automacao e foi para um atendente."
			},
			{
				name: "aiHandoffAlertEnabled",
				label: "Avisar outro WhatsApp quando a IA transferir",
				type: "boolean",
				helperText: "Ao marcar, aparecem os campos do numero/grupo e da mensagem de aviso. Pode ser usado junto com encaminhamento e encerramento automatico."
			},
			{
				name: "aiHandoffAlertTo",
				label: "Número, contato ou grupo para aviso",
				helperText: "Informe um numero, ID de grupo ou nome de contato/grupo. Esta configuracao vale apenas para esta opcao da URA."
			},
			{
				name: "aiHandoffAlertMessage",
				label: "Mensagem do aviso",
				multiline: true,
				template: true,
				helperText: "Se preencher aqui, esta opção da URA terá sua própria mensagem de aviso."
			},
			{ name: "order", label: "Ordem", type: "number" },
			{ name: "active", label: "Ativo", type: "boolean" }
		],
		columns: ["id", "flowId", "parentOptionId", "optionKey", "title", "action", "targetQueueId", "active"]
	},
	{
		label: "Formularios de qualificacao",
		endpoint: "/qualification-forms",
		title: "Formulario de qualificacao",
		fields: [
			{ name: "name", label: "Nome", required: true },
			{ name: "description", label: "Descricao", multiline: true },
			{ name: "greetingMessage", label: "Mensagem de saudacao", multiline: true },
			{ name: "active", label: "Ativo", type: "boolean" }
		],
		columns: ["id", "name", "description", "greetingMessage", "active"]
	},
	{
		label: "Perguntas dos formularios",
		endpoint: "/qualification-form-questions",
		title: "Pergunta de qualificacao",
		fields: [
			{ name: "formId", label: "Formulario", type: "relation", relation: "qualificationForms", required: true },
			{
				name: "key",
				label: "Chave para relatorio",
				required: true,
				helperText: "Use uma chave curta e sem acentos, como uso_sala, prazo, cidade ou orcamento."
			},
			{ name: "label", label: "Pergunta enviada ao cliente", multiline: true, required: true },
			{
				name: "type",
				label: "Tipo de resposta",
				type: "select",
				options: [
					{ value: "text", label: "Texto livre" },
					{ value: "single_choice", label: "Escolha unica" },
					{ value: "multiple_choice", label: "Multipla escolha" },
					{ value: "glpi_entity", label: "Entidade GLPI" },
					{ value: "glpi_location", label: "Localizacao GLPI" }
				]
			},
			{
				name: "glpiField",
				label: "Campo usado no chamado GLPI",
				type: "select",
				options: [
					{ value: "description", label: "Adicionar resposta na descricao" },
					{ value: "ignore", label: "Nao usar no chamado GLPI" }
				]
			},
			{
				name: "options",
				label: "Opcoes",
				multiline: true,
				showWhen: form => ["single_choice", "multiple_choice"].includes(form.type),
				helperText: "Uma opcao por linha. Use valor|rotulo|Etiqueta 1,Etiqueta 2 para aplicar etiquetas ao contato quando a opcao for escolhida."
			},
			{ name: "required", label: "Obrigatoria", type: "boolean" },
			{ name: "includeInAiContext", label: "Enviar resposta como contexto para IA", type: "boolean" },
			{ name: "includeInReports", label: "Disponivel para relatorios", type: "boolean" },
			{ name: "maxInvalidAttempts", label: "Tentativas invalidas antes de aceitar texto livre", type: "number" },
			{ name: "order", label: "Ordem", type: "number" },
			{ name: "active", label: "Ativo", type: "boolean" }
		],
		columns: ["id", "formId", "key", "type", "required", "order", "active"]
	},
	{
		label: "Respostas dos formularios",
		endpoint: "/qualification-form-responses",
		title: "Resposta de formulario",
		readOnly: true,
		fields: [
			{ name: "formId", label: "Formulario", type: "relation", relation: "qualificationForms" },
			{ name: "ticketId", label: "Ticket" },
			{ name: "contactId", label: "Contato" },
			{ name: "queueId", label: "Fila" },
			{ name: "uraOptionId", label: "Opcao da URA" },
			{ name: "status", label: "Status" },
			{ name: "afterAction", label: "Acao apos formulario" },
			{ name: "createdAt", label: "Criado em" },
			{ name: "completedAt", label: "Concluido em" }
		],
		columns: ["id", "formId", "ticketId", "contactId", "status", "afterAction", "createdAt", "completedAt"]
	},
	{
		label: "Relatorio das respostas",
		endpoint: "/qualification-form-answers",
		title: "Resposta por pergunta",
		readOnly: true,
		fields: [
			{ name: "responseId", label: "Resposta" },
			{ name: "questionId", label: "Pergunta" },
			{ name: "key", label: "Chave" },
			{ name: "label", label: "Pergunta" },
			{ name: "value", label: "Valor" },
			{ name: "optionLabel", label: "Resposta tratada" },
			{ name: "rawValue", label: "Resposta original" },
			{ name: "includeInReports", label: "Usar em relatorios", type: "boolean" },
			{ name: "createdAt", label: "Criado em" }
		],
		columns: ["id", "responseId", "key", "optionLabel", "value", "rawValue", "includeInReports", "createdAt"]
	},
	{
		label: "Memoria curta da IA",
		endpoint: "/ai-ticket-contexts",
		title: "Memoria curta da IA",
		readOnly: true,
		fields: [
			{ name: "ticketId", label: "Ticket" },
			{ name: "summary", label: "Resumo", multiline: true },
			{ name: "collectedData", label: "Dados coletados", multiline: true },
			{ name: "missingData", label: "Dados faltantes", multiline: true },
			{ name: "contradictions", label: "Contradicoes", multiline: true },
			{ name: "currentObjective", label: "Objetivo atual", multiline: true },
			{ name: "nextQuestion", label: "Proxima pergunta", multiline: true },
			{ name: "lastSource", label: "Ultima origem" },
			{ name: "lastAiIntent", label: "Ultima intencao" },
			{ name: "lastAiAction", label: "Ultima acao" },
			{ name: "lastUpdatedAt", label: "Atualizado em" }
		],
		columns: ["id", "ticketId", "summary", "lastSource", "lastAiIntent", "lastAiAction", "lastUpdatedAt"]
	},
	{
		label: "Conexoes de agenda",
		endpoint: "/ai-calendar-connections",
		title: "Conexao de agenda",
		fields: [
			{ name: "name", label: "Nome", required: true },
			{
				name: "provider",
				label: "Provedor",
				type: "select",
				options: [
					{ value: "google", label: "Google Agenda" },
					{ value: "microsoft", label: "Microsoft Agenda" }
				]
			},
			{ name: "calendarId", label: "Calendar ID" },
			{ name: "calendarName", label: "Nome da agenda" },
			{ name: "googleAccountEmail", label: "Conta conectada", readOnly: true },
			{ name: "connectionStatus", label: "Status da conexao", readOnly: true },
			{ name: "userPrincipalName", label: "Usuario Microsoft" },
			{ name: "accessToken", label: "Access token", multiline: true },
			{ name: "refreshToken", label: "Refresh token", multiline: true },
			{ name: "accessTokenExpiresAt", label: "Access token expira em", readOnly: true },
			{ name: "scopes", label: "Escopos", readOnly: true, multiline: true },
			{ name: "lastSyncAt", label: "Ultima sincronizacao", readOnly: true },
			{ name: "lastError", label: "Ultimo erro", readOnly: true, multiline: true },
			{ name: "timezone", label: "Fuso horario" },
			{ name: "active", label: "Ativo", type: "boolean" }
		],
		columns: ["id", "name", "provider", "googleAccountEmail", "calendarId", "timezone", "connectionStatus", "active"]
	},
	{
		label: "Leads da IA",
		endpoint: "/ai-leads",
		title: "Lead da IA",
		readOnly: true,
		fields: [
			{ name: "ticketId", label: "Ticket" },
			{ name: "contactId", label: "Contato" },
			{ name: "queueId", label: "Fila" },
			{ name: "status", label: "Status" },
			{ name: "summary", label: "Resumo", multiline: true },
			{ name: "collectedData", label: "Dados coletados", multiline: true },
			{ name: "tagIds", label: "Etiquetas" }
		],
		columns: ["id", "ticketId", "contactId", "queueId", "status", "summary", "createdAt"]
	},
	{
		label: "Execucoes de ferramentas",
		endpoint: "/ai-tool-executions",
		title: "Execucao de ferramenta",
		readOnly: true,
		fields: [
			{ name: "ticketId", label: "Ticket" },
			{ name: "aiSettingId", label: "IA" },
			{ name: "toolName", label: "Ferramenta" },
			{ name: "status", label: "Status" },
			{ name: "input", label: "Entrada", multiline: true },
			{ name: "output", label: "Saida", multiline: true },
			{ name: "errorMessage", label: "Erro", multiline: true },
			{ name: "executedAt", label: "Executada em" }
		],
		columns: ["id", "ticketId", "toolName", "status", "errorMessage", "executedAt"]
	},
	{
		label: "IA",
		endpoint: "/ai-settings",
		title: "Agente / Configuracao de IA",
		fields: [
			{
				name: "name",
				label: "Nome da IA",
				helperText: "Informe o nome que a IA usara no atendimento. Ex: Ana, Assistente Virtual, Atendente Digital."
			},
			{
				name: "companyName",
				label: "Nome da empresa ou servico",
				helperText: "Informe o nome da empresa, unidade ou servico que a IA representa."
			},
			{
				name: "serviceType",
				label: "Tipo de atendimento",
				helperText: "Explique o tipo de atendimento que a IA fara. Ex: vendas, orcamento, agendamento, duvidas, pos-venda."
			},
			{
				name: "behaviorPrompt",
				label: "Como a IA deve se comportar",
				multiline: true,
				helperText: "Explique como a IA deve falar com o cliente, quais assuntos pode responder e quando deve chamar um atendente."
			},
			{
				name: "provider",
				label: "Provedor",
				type: "select",
				options: [
					{ value: "openai", label: "OpenAI" },
					{ value: "gemini", label: "Gemini" },
					{ value: "groq", label: "Groq" },
					{ value: "deepseek", label: "DeepSeek" }
				]
			},
			{ name: "model", label: "Modelo" },
			{ name: "apiKey", label: "Chave da API" },
			{
				name: "baseUrl",
				label: "Base URL personalizada",
				helperText: "Opcional. Use somente se seu provedor exigir um endpoint diferente do padrao."
			},
			{
				name: "systemPrompt",
				label: "Instrucoes adicionais",
				multiline: true,
				helperText: "Use este campo para regras extras do atendimento. A IA continuara usando a base de conhecimento como fonte principal."
			},
			{ name: "temperature", label: "Temperatura", type: "number" },
			{ name: "maxTokens", label: "Maximo de tokens", type: "number" },
			{
				name: "aiQueueId",
				label: "Fila da IA",
				type: "relation",
				relation: "queues",
				nullable: true,
				helperText: "Escolha a fila onde ficarao os atendimentos respondidos pela IA. Quando a URA acionar IA, use essa fila como destino."
			},
			{
				name: "allowedTools",
				label: "Ferramentas permitidas",
				type: "multiSelect",
				options: [
					{ value: "registrarLead", label: "Registrar lead" },
					{ value: "gerarResumoParaAtendente", label: "Gerar resumo para atendente" },
					{ value: "calcularOrcamento", label: "Calcular orcamento" },
					{ value: "transferirParaFila", label: "Transferir para fila" },
					{ value: "encerrarAtendimento", label: "Encerrar atendimento" }
				],
				helperText: "O backend so executa ferramentas marcadas aqui. A IA pode pedir, mas nao executa livremente."
			},
			{
				name: "allowedTransferQueueIds",
				label: "Filas permitidas para ferramenta transferirParaFila",
				type: "multiRelation",
				relation: "queues",
				helperText: "Limita quais filas este agente pode usar quando pedir a ferramenta transferirParaFila."
			},
			{ name: "active", label: "Ativo", type: "boolean" }
		],
		columns: ["id", "name", "companyName", "serviceType", "provider", "model", "active"]
	},
	{
		label: "Base de conhecimento",
		endpoint: "/knowledge-base",
		title: "Artigo da base",
		fields: [
			{ name: "title", label: "Titulo", required: true },
			{
				name: "contentHtml",
				label: "Conteudo",
				type: "richtext",
				required: true,
				helperText: "Cole do Word ou Google Docs. Negrito, listas, paragrafos e emojis serao preservados e convertidos para o formato do WhatsApp nas respostas."
			},
			{ name: "tags", label: "Palavras-chave", type: "tags" },
			{ name: "active", label: "Ativo", type: "boolean" }
		],
		columns: ["id", "title", "tags", "active"]
	},
	{
		label: "Logs de auditoria",
		endpoint: "/audit-logs",
		title: "Log de auditoria",
		fields: [],
		columns: ["createdAt", "userName", "action", "resource"],
		readOnly: true
	}
];

const getResourceByEndpoint = endpoint =>
	resources.find(resource => resource.endpoint === endpoint);

const groupedSettingsTabs = [
	{ label: "Geral", type: "general" },
	{ label: "Categorias", type: "resource", resource: getResourceByEndpoint("/ticket-categories") },
	{ label: "Motivos de encerramento", type: "resource", resource: getResourceByEndpoint("/closing-reasons") },
	{ label: "Pesquisa de satisfacao", type: "resource", resource: getResourceByEndpoint("/satisfaction-surveys") },
	{ label: "Etiquetas", type: "resource", resource: getResourceByEndpoint("/tags") },
	{
		label: "URA",
		type: "uraTree"
	},
	{
		label: "IA",
		type: "group",
		groupKey: "ia",
		children: [
			{ label: "Agentes / IA", resource: getResourceByEndpoint("/ai-settings") },
			{ label: "Base de conhecimento", resource: getResourceByEndpoint("/knowledge-base") },
			{ label: "Memoria curta", resource: getResourceByEndpoint("/ai-ticket-contexts") },
			{ label: "Leads da IA", resource: getResourceByEndpoint("/ai-leads") },
			{ label: "Execucoes de ferramentas", resource: getResourceByEndpoint("/ai-tool-executions") }
		]
	},
	{
		label: "Formularios",
		type: "group",
		groupKey: "forms",
		children: [
			{ label: "Construtor", type: "qualificationForms" },
			{ label: "Respostas", resource: getResourceByEndpoint("/qualification-form-responses") },
			{ label: "Relatorio", resource: getResourceByEndpoint("/qualification-form-answers") }
		]
	},
	{ label: "Logs de auditoria", type: "resource", resource: getResourceByEndpoint("/audit-logs") }
].filter(tab => ["general", "uraTree"].includes(tab.type) || tab.resource || tab.children?.every(child => child.resource || child.type));

const supervisorSettingsEndpoints = [
	"/ticket-categories",
	"/closing-reasons",
	"/satisfaction-surveys",
	"/tags",
	"/audit-logs"
];

const buildSpecialSettingsTabs = specialPermissions => groupedSettingsTabs.filter(item => {
	if (specialPermissions?.accessUra && item.type === "uraTree") return true;
	if (specialPermissions?.accessAi && item.type === "group" && item.groupKey === "ia") return true;
	if (specialPermissions?.accessForms && item.type === "group" && item.groupKey === "forms") return true;
	return false;
});

const uniqueSettingsTabs = tabs => {
	const keys = new Set();
	return tabs.filter(item => {
		const key = item.groupKey || item.resource?.endpoint || item.type || item.label;
		if (keys.has(key)) return false;
		keys.add(key);
		return true;
	});
};

const defaultModelsByProvider = {
	openai: "gpt-4o-mini",
	gemini: "gemini-2.5-flash",
	groq: "llama-3.3-70b-versatile",
	deepseek: "deepseek-chat"
};

const escapeHtml = value =>
	String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

const plainTextToHtml = value =>
	String(value || "")
		.split(/\n{2,}/)
		.map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
		.join("");

const htmlToPlainText = value => {
	const container = document.createElement("div");
	container.innerHTML = String(value || "")
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/p>/gi, "\n\n")
		.replace(/<\/li>/gi, "\n");
	return (container.textContent || container.innerText || "")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
};

const auditActionLabels = {
	create: { label: "Criou", color: "primary" },
	update: { label: "Alterou", color: "default" },
	delete: { label: "Excluiu", color: "secondary" }
};

const auditResourceLabels = {
	ticketCategories: "categoria",
	closingReasons: "motivo de encerramento",
	satisfactionSurveys: "pesquisa de satisfacao",
	quickAnswers: "mensagem rapida",
	tags: "etiqueta",
	uraFlows: "fluxo da URA",
	uraOptions: "opcao da URA",
	aiSettings: "agente de IA",
	knowledgeBase: "artigo da base de conhecimento",
	aiCalendarConnections: "conexao de agenda",
	qualificationForms: "formulario",
	qualificationFormQuestions: "pergunta do formulario",
	qualificationFormResponses: "resposta de formulario",
	qualificationFormAnswers: "resposta coletada",
	settings: "configuracao"
};

const auditFieldLabels = {
	name: "Nome",
	title: "Titulo",
	description: "Descricao",
	active: "Ativo",
	label: "Pergunta",
	type: "Tipo",
	glpiField: "Uso no GLPI",
	options: "Opcoes",
	required: "Obrigatoria",
	greetingMessage: "Mensagem de saudacao",
	question: "Pergunta",
	thankYouMessage: "Mensagem de agradecimento",
	farewellMessage: "Mensagem de encerramento",
	sendFarewellMessage: "Enviar mensagem",
	route: "Rota",
	method: "Metodo"
};

const parseAuditData = value => {
	if (!value) return {};
	if (typeof value === "object") return value;
	try {
		return JSON.parse(value);
	} catch (err) {
		return {};
	}
};

const auditDisplayValue = value => {
	if (value === true) return "Sim";
	if (value === false) return "Nao";
	if (value === null || value === undefined || value === "") return "Vazio";
	if (Array.isArray(value)) return value.map(auditDisplayValue).join(", ");
	if (typeof value === "object") return JSON.stringify(value);
	const text = String(value);
	return text.length > 90 ? `${text.slice(0, 90)}...` : text;
};

const getAuditObjectName = (beforeData, afterData, row) =>
	auditDisplayValue(afterData.name || afterData.title || afterData.label || beforeData.name || beforeData.title || beforeData.label || `#${row.resourceId}`);

const getAuditChanges = row => {
	const beforeData = parseAuditData(row.beforeData);
	const afterData = parseAuditData(row.afterData);
	const keys = Array.from(new Set([...Object.keys(beforeData), ...Object.keys(afterData)]))
		.filter(key => !["id", "createdAt", "updatedAt"].includes(key));

	if (row.action === "create") {
		return keys
			.filter(key => afterData[key] !== null && afterData[key] !== undefined && afterData[key] !== "")
			.slice(0, 8)
			.map(key => ({ field: auditFieldLabels[key] || key, after: auditDisplayValue(afterData[key]) }));
	}

	if (row.action === "delete") {
		return keys
			.slice(0, 8)
			.map(key => ({ field: auditFieldLabels[key] || key, before: auditDisplayValue(beforeData[key]) }));
	}

	return keys
		.filter(key => auditDisplayValue(beforeData[key]) !== auditDisplayValue(afterData[key]))
		.slice(0, 10)
		.map(key => ({
			field: auditFieldLabels[key] || key,
			before: auditDisplayValue(beforeData[key]),
			after: auditDisplayValue(afterData[key])
		}));
};

const formatAuditDate = value => {
	if (!value) return "";
	try {
		return new Date(value).toLocaleString("pt-BR");
	} catch (err) {
		return value;
	}
};

const searchableResourceEndpoints = [
	"/ticket-categories",
	"/closing-reasons",
	"/quickAnswers",
	"/tags",
	"/audit-logs"
];

const getSearchableRowText = (row, resource) => {
	if (resource.endpoint === "/audit-logs") {
		const beforeData = parseAuditData(row.beforeData);
		const afterData = parseAuditData(row.afterData);
		const changes = getAuditChanges(row)
			.map(change => `${change.field} ${change.before || ""} ${change.after || ""}`)
			.join(" ");
		return [
			row.userName,
			row.userProfile,
			auditActionLabels[row.action]?.label,
			auditResourceLabels[row.resource],
			getAuditObjectName(beforeData, afterData, row),
			changes,
			formatAuditDate(row.createdAt)
		].join(" ");
	}

	return [
		...resource.columns.map(column => row[column]),
		...resource.fields.map(field => row[field.name])
	].join(" ");
};

const slugText = value =>
	String(value || "arquivo")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "") || "arquivo";

const downloadTextFile = (filename, content) => {
	const blob = new Blob([content || ""], { type: "text/plain;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
};

const defaultValue = field => {
	if (field.name === "fixed") return false;
	if (field.name === "aiHumanHandoffEnabled") return false;
	if (field.name === "aiHandoffAlertEnabled") return false;
	if (field.name === "aiAutoCloseEnabled") return false;
	if (field.name === "aiAutoCloseOnlyIfNotHandedOff") return true;
	if (field.name === "aiAutoCloseReasonId") return "";
	if (field.name === "aiQueueId") return "";
	if (field.name === "calendarConnectionId") return "";
	if (field.name === "timezone") return "America/Sao_Paulo";
	if (field.name === "qualificationFormId") return "";
	if (field.name === "runQualificationFormBeforeAction") return false;
	if (field.name === "allowQualificationFormSkip") return false;
	if (field.name === "required") return true;
	if (field.name === "includeInAiContext") return true;
	if (field.name === "includeInReports") return true;
	if (field.name === "maxInvalidAttempts") return 2;
	if (field.name === "confirmationMaxAttempts") return 2;
	if (field.type === "boolean") return true;
	if (field.type === "multiSelect" || field.type === "multiRelation") return [];
	if (field.type === "number") return "";
	if (field.type === "richtext") return "";
	if (field.name === "fallbackQueueId") return "";
	if (field.name === "targetQueueId") return "";
	if (field.name === "aiHumanHandoffQueueId") return "";
	if (field.name === "aiAutoCloseMinutes") return "";
	if (field.name === "provider") return "openai";
	if (field.name === "model") return defaultModelsByProvider.openai;
	if (field.name === "action") return "SEND_MESSAGE";
	if (field.name === "type") return "text";
	if (field.name === "scaleType") return "1_5";
	if (field.name === "sendMode") return "optional";
	if (field.name === "color") return "#607d8b";
	return "";
};

const getRowsFromResponse = (data, resource) => {
	if (resource.listKey) return data[resource.listKey] || [];
	return Array.isArray(data) ? data : [];
};

const relationConfigs = {
	queues: {
		endpoint: "/queue",
		getLabel: item => item.name
	},
	uraFlows: {
		endpoint: "/ura-flows",
		getLabel: item => item.name
	},
	uraOptions: {
		endpoint: "/ura-options",
		getLabel: item => `${item.optionKey} - ${item.title}`
	},
	tags: {
		endpoint: "/tags",
		getLabel: item => item.name
	},
	closingReasons: {
		endpoint: "/closing-reasons",
		getLabel: item => item.name
	},
	qualificationForms: {
		endpoint: "/qualification-forms",
		getLabel: item => item.name
	},
	aiCalendarConnections: {
		endpoint: "/ai-calendar-connections",
		getLabel: item => `${item.name} (${item.provider})`
	}
};

const CompanyBusinessHours = ({ modeValue, rulesValue, messageValue, onChangeSetting, classes }) => {
	const [mode, setMode] = useState(modeValue || "always");
	const [rules, setRules] = useState(parseBusinessHours(rulesValue));
	const [message, setMessage] = useState(messageValue || "");

	useEffect(() => {
		setMode(modeValue || "always");
		setRules(parseBusinessHours(rulesValue));
		setMessage(messageValue || "");
	}, [modeValue, rulesValue, messageValue]);

	const save = async () => {
		await onChangeSetting({ target: { name: "companyBusinessHoursMode", value: mode } });
		await onChangeSetting({ target: { name: "companyBusinessHours", value: mode === "custom" ? serializeBusinessHours(rules) : "" } });
		await onChangeSetting({ target: { name: "companyUnavailableMessage", value: message } });
		toast.success("Horario de funcionamento salvo.");
	};

	return (
		<Grid container spacing={2}>
			<Grid item xs={12} sm={6}>
				<TextField select fullWidth margin="dense" variant="outlined" label="Horario de funcionamento" value={mode} onChange={event => setMode(event.target.value)}>
					<MenuItem value="always">Sempre aberto</MenuItem>
					<MenuItem value="custom">Horario personalizado</MenuItem>
				</TextField>
			</Grid>
			{mode === "custom" && (
				<>
					<Grid item xs={12}>
						<Typography variant="subtitle2">Periodos de atendimento</Typography>
						<Typography variant="caption" color="textSecondary">
							Configure como no WhatsApp Business: dias da semana e periodos em que a empresa atende.
						</Typography>
					</Grid>
					{rules.map((rule, index) => (
						<Grid item xs={12} key={index}>
							<div className={classes.businessHoursRuleCard}>
								<Grid container spacing={1} alignItems="center">
									<Grid item xs={12}>
										<div className={classes.businessHoursWeekdays}>
											{businessWeekdayOptions.map(day => (
												<FormControlLabel
													key={day.value}
													className={classes.businessWeekdayOption}
													control={
														<Checkbox
															color="primary"
															checked={(rule.days || []).map(Number).includes(day.value)}
															onChange={() => {
																const nextRules = [...rules];
																const currentDays = (nextRules[index].days || []).map(Number);
																const exists = currentDays.includes(day.value);
																nextRules[index] = {
																	...nextRules[index],
																	days: exists ? currentDays.filter(item => item !== day.value) : [...currentDays, day.value].sort()
																};
																setRules(nextRules);
															}}
														/>
													}
													label={day.label}
												/>
											))}
										</div>
									</Grid>
									<Grid item xs={12} sm={4}>
										<TextField
											fullWidth
											type="time"
											variant="outlined"
											margin="dense"
											label="Inicio"
											value={rule.start}
											onChange={event => {
												const nextRules = [...rules];
												nextRules[index] = { ...nextRules[index], start: event.target.value };
												setRules(nextRules);
											}}
											InputLabelProps={{ shrink: true }}
										/>
									</Grid>
									<Grid item xs={12} sm={4}>
										<TextField
											fullWidth
											type="time"
											variant="outlined"
											margin="dense"
											label="Fim"
											value={rule.end}
											onChange={event => {
												const nextRules = [...rules];
												nextRules[index] = { ...nextRules[index], end: event.target.value };
												setRules(nextRules);
											}}
											InputLabelProps={{ shrink: true }}
										/>
									</Grid>
									<Grid item xs={12} sm={4}>
										<Button fullWidth variant="outlined" color="secondary" disabled={rules.length <= 1} onClick={() => setRules(rules.filter((_, ruleIndex) => ruleIndex !== index))}>
											Remover periodo
										</Button>
									</Grid>
								</Grid>
							</div>
						</Grid>
					))}
					<Grid item xs={12}>
						<Button variant="outlined" color="primary" onClick={() => setRules([...rules, defaultBusinessHoursRule()])}>
							Adicionar periodo
						</Button>
					</Grid>
					<Grid item xs={12}>
						<TextField
							fullWidth
							multiline
							rows={4}
							margin="dense"
							variant="outlined"
							label="Mensagem de ausencia"
							value={message}
							onChange={event => setMessage(event.target.value)}
							helperText="Esta mensagem pode ser usada pelas filas que escolherem seguir o horario da empresa."
						/>
					</Grid>
				</>
			)}
			<Grid item xs={12}>
				<Button color="primary" variant="contained" onClick={save}>
					Salvar horario da empresa
				</Button>
			</Grid>
		</Grid>
	);
};

const emptyUraFlow = {
	name: "",
	description: "",
	welcomeMessage: "",
	invalidOptionMessage: "",
	maxInvalidAttempts: 3,
	fallbackQueueId: "",
	aiAutoCloseEnabled: false,
	aiAutoCloseMinutes: "",
	aiAutoCloseMessage: "",
	aiAutoCloseReasonId: "",
	aiAutoCloseOnlyIfNotHandedOff: true,
	active: true
};

const emptyUraOption = flowId => ({
	flowId: flowId || "",
	parentOptionId: "",
	optionKey: "",
	title: "",
	responseMessage: "",
	action: "SEND_MESSAGE",
	targetQueueId: "",
	closingReasonId: "",
	qualificationFormId: "",
	runQualificationFormBeforeAction: false,
	allowQualificationFormSkip: false,
	showMainMenuAfterMessage: false,
	aiHumanHandoffEnabled: false,
	aiHumanHandoffQueueId: "",
	aiHumanHandoffMessage: "",
	aiAutoCloseEnabled: false,
	aiAutoCloseMinutes: "",
	aiAutoCloseMessage: "",
	aiAutoCloseReasonId: "",
	aiAutoCloseOnlyIfNotHandedOff: true,
	aiHandoffAlertEnabled: false,
	aiHandoffAlertTo: "",
	aiHandoffAlertMessage: "",
	order: 0,
	active: true
});

const textValue = value => value === null || value === undefined ? "" : String(value);

const isFormOnlyUraOption = option =>
	!!option?.runQualificationFormBeforeAction &&
	(option.action || "SEND_MESSAGE") === "SEND_MESSAGE" &&
	!textValue(option.responseMessage).trim() &&
	!option.responseMediaUrl;

const getVisibleUraOptionAction = option =>
	isFormOnlyUraOption(option) ? "RUN_FORM" : (option?.action || "SEND_MESSAGE");

const UraTreePanel = ({ classes }) => {
	const [flows, setFlows] = useState([]);
	const [options, setOptions] = useState([]);
	const [queues, setQueues] = useState([]);
	const [closingReasons, setClosingReasons] = useState([]);
	const [qualificationForms, setQualificationForms] = useState([]);
	const [selectedFlowId, setSelectedFlowId] = useState("");
	const [flowForm, setFlowForm] = useState(emptyUraFlow);
	const [optionForm, setOptionForm] = useState(null);
	const [selectedOptionId, setSelectedOptionId] = useState(null);
	const [loading, setLoading] = useState(false);
	const [flowMediaFile, setFlowMediaFile] = useState(null);
	const [optionMediaFile, setOptionMediaFile] = useState(null);

	const setFlowField = (name, value) => {
		setFlowForm(prev => ({
			...emptyUraFlow,
			...(prev || {}),
			[name]: value
		}));
	};

	const setOptionField = (name, value) => {
		setOptionForm(prev => ({
			...emptyUraOption(selectedFlowId),
			...(prev || {}),
			[name]: value
		}));
	};

	const load = async () => {
		setLoading(true);
		try {
			const [{ data: flowData }, { data: optionData }, { data: queueData }, { data: qualificationFormData }] = await Promise.all([
				api.get("/ura-flows"),
				api.get("/ura-options"),
				api.get("/queue"),
				api.get("/qualification-forms").catch(() => ({ data: [] }))
			]);
			const { data: closingReasonData } = await api.get("/closing-reasons").catch(() => ({ data: [] }));
			const nextFlows = Array.isArray(flowData) ? flowData : [];
			const nextOptions = Array.isArray(optionData) ? optionData : [];
			setFlows(nextFlows);
			setOptions(nextOptions);
			setQueues(Array.isArray(queueData) ? queueData : []);
			setClosingReasons(Array.isArray(closingReasonData) ? closingReasonData : []);
			setQualificationForms(Array.isArray(qualificationFormData) ? qualificationFormData : []);
			if (!selectedFlowId && nextFlows.length) {
				setSelectedFlowId(nextFlows[0].id);
				setFlowForm({
					...emptyUraFlow,
					...nextFlows[0],
					fallbackQueueId: nextFlows[0].fallbackQueueId || "",
					aiAutoCloseReasonId: nextFlows[0].aiAutoCloseReasonId || ""
				});
			}
		} catch (err) {
			toastError(err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		const flow = flows.find(item => Number(item.id) === Number(selectedFlowId));
		if (flow) {
			setFlowForm({
				...emptyUraFlow,
				...flow,
				fallbackQueueId: flow.fallbackQueueId || "",
				aiAutoCloseReasonId: flow.aiAutoCloseReasonId || ""
			});
			setFlowMediaFile(null);
		} else {
			setFlowForm(emptyUraFlow);
			setFlowMediaFile(null);
		}
		setSelectedOptionId(null);
		setOptionForm(null);
		setOptionMediaFile(null);
	}, [selectedFlowId, flows]);

	const currentOptions = options
		.filter(option => Number(option.flowId) === Number(selectedFlowId))
		.sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || String(a.optionKey).localeCompare(String(b.optionKey)));

	const childOptions = parentId => currentOptions.filter(option =>
		Number(option.parentOptionId || 0) === Number(parentId || 0)
	);

	const selectOption = option => {
		setSelectedOptionId(option.id);
		setOptionForm({
			...emptyUraOption(selectedFlowId),
			...option,
			parentOptionId: option.parentOptionId || "",
			targetQueueId: option.targetQueueId || "",
			closingReasonId: option.closingReasonId || "",
			qualificationFormId: option.qualificationFormId || "",
			aiHumanHandoffQueueId: option.aiHumanHandoffQueueId || "",
			aiAutoCloseReasonId: option.aiAutoCloseReasonId || ""
		});
		setOptionMediaFile(null);
	};

	const newFlow = () => {
		setSelectedFlowId("");
		setFlowForm(emptyUraFlow);
		setFlowMediaFile(null);
		setSelectedOptionId(null);
		setOptionForm(null);
		setOptionMediaFile(null);
	};

	const newOption = parentOptionId => {
		setSelectedOptionId(null);
		setOptionForm({
			...emptyUraOption(selectedFlowId),
			parentOptionId: parentOptionId || "",
			order: currentOptions.length + 1
		});
		setOptionMediaFile(null);
	};

	const saveFlow = async () => {
		try {
			const payload = {
				...flowForm,
				fallbackQueueId: flowForm.fallbackQueueId || null,
				aiAutoCloseEnabled: !!flowForm.aiAutoCloseEnabled,
				aiAutoCloseMinutes: flowForm.aiAutoCloseEnabled ? flowForm.aiAutoCloseMinutes : null,
				aiAutoCloseMessage: flowForm.aiAutoCloseEnabled ? flowForm.aiAutoCloseMessage : "",
				aiAutoCloseReasonId: flowForm.aiAutoCloseEnabled ? (flowForm.aiAutoCloseReasonId || null) : null,
				aiAutoCloseOnlyIfNotHandedOff: flowForm.aiAutoCloseOnlyIfNotHandedOff !== false,
				active: flowForm.active !== false
			};
			const requestBody = flowMediaFile ? buildMultipartPayload(payload, flowMediaFile) : payload;
			if (payload.id) {
				await api.put(`/ura-flows/${payload.id}`, requestBody);
				toast.success("URA salva.");
			} else {
				const { data } = await api.post("/ura-flows", requestBody);
				setSelectedFlowId(data.id);
				toast.success("URA criada.");
			}
			setFlowMediaFile(null);
			await load();
		} catch (err) {
			toastError(err);
		}
	};

	const saveOption = async () => {
		if (!optionForm) return;
		try {
			const formOnlyAction = getVisibleUraOptionAction(optionForm) === "RUN_FORM";
			const payload = {
				...optionForm,
				flowId: selectedFlowId,
				parentOptionId: optionForm.parentOptionId || null,
				targetQueueId: optionForm.targetQueueId || null,
				closingReasonId: optionForm.closingReasonId || null,
				action: formOnlyAction ? "SEND_MESSAGE" : optionForm.action,
				responseMessage: formOnlyAction ? "" : optionForm.responseMessage,
				runQualificationFormBeforeAction: formOnlyAction || !!optionForm.runQualificationFormBeforeAction,
				qualificationFormId: (formOnlyAction || optionForm.runQualificationFormBeforeAction) ? (optionForm.qualificationFormId || null) : null,
				allowQualificationFormSkip: !!optionForm.allowQualificationFormSkip,
				showMainMenuAfterMessage: !formOnlyAction && optionForm.action === "SEND_MESSAGE" && !!optionForm.showMainMenuAfterMessage,
				aiHumanHandoffEnabled: !!optionForm.aiHumanHandoffEnabled,
				aiHumanHandoffQueueId: optionForm.aiHumanHandoffEnabled ? (optionForm.aiHumanHandoffQueueId || null) : null,
				aiHumanHandoffMessage: optionForm.aiHumanHandoffEnabled ? optionForm.aiHumanHandoffMessage : "",
				aiAutoCloseEnabled: !!optionForm.aiAutoCloseEnabled,
				aiAutoCloseMinutes: optionForm.aiAutoCloseEnabled ? optionForm.aiAutoCloseMinutes : null,
				aiAutoCloseMessage: optionForm.aiAutoCloseEnabled ? optionForm.aiAutoCloseMessage : "",
				aiAutoCloseReasonId: optionForm.aiAutoCloseEnabled ? (optionForm.aiAutoCloseReasonId || null) : null,
				aiAutoCloseOnlyIfNotHandedOff: optionForm.aiAutoCloseOnlyIfNotHandedOff !== false,
				aiHandoffAlertEnabled: !!optionForm.aiHandoffAlertEnabled,
				aiHandoffAlertTo: optionForm.aiHandoffAlertEnabled ? optionForm.aiHandoffAlertTo : "",
				aiHandoffAlertMessage: optionForm.aiHandoffAlertEnabled ? optionForm.aiHandoffAlertMessage : "",
				active: optionForm.active !== false
			};
			const requestBody = optionMediaFile ? buildMultipartPayload(payload, optionMediaFile) : payload;
			if (payload.id) {
				await api.put(`/ura-options/${payload.id}`, requestBody);
				toast.success("Opcao salva.");
			} else {
				const { data } = await api.post("/ura-options", requestBody);
				setSelectedOptionId(data.id);
				toast.success("Opcao criada.");
			}
			setOptionMediaFile(null);
			await load();
		} catch (err) {
			toastError(err);
		}
	};

	const removeOption = async option => {
		if (!window.confirm("Excluir esta opcao da URA? As subopcoes tambem podem ficar sem caminho claro.")) return;
		try {
			await api.delete(`/ura-options/${option.id}`);
			setSelectedOptionId(null);
			setOptionForm(null);
			await load();
		} catch (err) {
			toastError(err);
		}
	};

	const actionLabel = action => ({
		RUN_FORM: "Executar formulario",
		SEND_MESSAGE: "Enviar mensagem",
		OPEN_SUBMENU: "Abrir submenu",
		TRANSFER_QUEUE: "Transferir para fila",
		START_AI: "Acionar IA",
		HUMAN: "Encaminhar humano",
		CLOSE_TICKET: "Encerrar atendimento",
		BACK_PREVIOUS: "Voltar anterior",
		BACK_ROOT: "Voltar inicio"
	}[action] || action);

	const renderTree = (parentId = null, level = 0) => {
		const children = childOptions(parentId);
		if (!children.length) {
			return level === 0 ? (
				<Typography variant="body2" color="textSecondary">Nenhuma opcao cadastrada neste nivel.</Typography>
			) : null;
		}

		return children.map(option => (
			<div key={option.id} style={{ marginLeft: level * 18, marginTop: 8 }}>
				<Paper
					variant="outlined"
					style={{
						padding: 10,
						borderColor: Number(selectedOptionId) === Number(option.id) ? "#2563EB" : undefined,
						background: Number(selectedOptionId) === Number(option.id) ? "#EFF6FF" : undefined
					}}
				>
					<Grid container spacing={1} alignItems="center">
						<Grid item xs>
							<Typography variant="body2">
								<strong>{textValue(option.optionKey)}</strong> - {textValue(option.title)}
							</Typography>
							<Typography variant="caption" color="textSecondary">
								{actionLabel(getVisibleUraOptionAction(option))}
								{option.action === "OPEN_SUBMENU" ? " · submenu" : ""}
								{option.runQualificationFormBeforeAction ? " · formulario" : ""}
							</Typography>
						</Grid>
						<Grid item>
							<Button size="small" onClick={() => selectOption(option)}>Editar</Button>
							<Button size="small" color="primary" onClick={() => newOption(option.id)}>Subopcao</Button>
						</Grid>
					</Grid>
				</Paper>
				{renderTree(option.id, level + 1)}
			</div>
		));
	};

	return (
		<Grid container spacing={2}>
			<Grid item xs={12}>
				<Paper variant="outlined" style={{ padding: 16 }}>
					<Grid container spacing={2} alignItems="center">
						<Grid item xs={12} md={5}>
							<TextField
								select
								fullWidth
								variant="outlined"
								margin="dense"
								label="URA"
								value={selectedFlowId || ""}
								onChange={event => setSelectedFlowId(event.target.value)}
							>
								{flows.map(flow => (
									<MenuItem key={flow.id} value={flow.id}>{textValue(flow.name)}</MenuItem>
								))}
							</TextField>
						</Grid>
						<Grid item>
							<Button variant="outlined" color="primary" onClick={newFlow}>Nova URA</Button>
						</Grid>
						<Grid item xs>
							<Typography variant="caption" color="textSecondary">
								Monte o menu principal, submenus e opcoes em uma unica tela. O atendimento fica em triagem ate uma opcao transferir, encerrar ou acionar IA.
							</Typography>
						</Grid>
					</Grid>
				</Paper>
			</Grid>

			<Grid item xs={12} md={4}>
				<Paper variant="outlined" style={{ padding: 16, height: "100%" }}>
					<Typography variant="h6">Configuracoes da URA</Typography>
					<TextField fullWidth margin="dense" variant="outlined" label="Nome da URA" value={textValue(flowForm.name)} onChange={event => setFlowField("name", event.target.value)} />
					<TextField fullWidth margin="dense" variant="outlined" multiline rows={2} label="Descricao" value={textValue(flowForm.description)} onChange={event => setFlowField("description", event.target.value)} />
					<MessageTemplateField label="Mensagem do menu principal" name="welcomeMessage" value={textValue(flowForm.welcomeMessage)} rows={5} onChange={event => setFlowField("welcomeMessage", event.target.value)} />
					<input
						accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
						id="ura-flow-media"
						type="file"
						style={{ display: "none" }}
						onChange={event => setFlowMediaFile(event.target.files?.[0] || null)}
					/>
					<label htmlFor="ura-flow-media">
						<Button component="span" size="small" variant="outlined" color="primary" style={{ marginTop: 8 }}>
							Anexar arquivo da mensagem inicial
						</Button>
					</label>
					<Typography variant="caption" display="block" color="textSecondary">
						{flowMediaFile?.name || flowForm.welcomeMediaName || "Nenhum anexo selecionado"}
					</Typography>
					<TextField fullWidth margin="dense" variant="outlined" multiline rows={2} label="Mensagem de opcao invalida" value={textValue(flowForm.invalidOptionMessage)} onChange={event => setFlowField("invalidOptionMessage", event.target.value)} />
					<TextField fullWidth margin="dense" variant="outlined" type="number" label="Maximo de tentativas invalidas" value={textValue(flowForm.maxInvalidAttempts)} onChange={event => setFlowField("maxInvalidAttempts", event.target.value)} />
					<TextField select fullWidth margin="dense" variant="outlined" label="Fila fallback opcional" value={flowForm.fallbackQueueId || ""} onChange={event => setFlowField("fallbackQueueId", event.target.value)}>
						<MenuItem value="">Sem fila fallback</MenuItem>
						{queues.map(queue => <MenuItem key={queue.id} value={queue.id}>{textValue(queue.name)}</MenuItem>)}
					</TextField>
					<Paper variant="outlined" style={{ padding: 12, marginTop: 12, marginBottom: 8 }}>
						<Typography variant="subtitle2">Encerramento por inatividade do atendimento automatico</Typography>
						<Typography variant="caption" color="textSecondary">
							Use uma unica regra para encerrar quando o cliente ficar sem responder no menu da URA ou no atendimento com IA iniciado por esta URA.
						</Typography>
						<FormControlLabel
							control={<Switch color="primary" checked={!!flowForm.aiAutoCloseEnabled} onChange={event => setFlowField("aiAutoCloseEnabled", event.target.checked)} />}
							label="Ativar encerramento por inatividade"
						/>
						{flowForm.aiAutoCloseEnabled && (
							<>
								<TextField fullWidth margin="dense" variant="outlined" type="number" label="Tempo sem resposta/interacao para encerrar (min.)" value={textValue(flowForm.aiAutoCloseMinutes)} onChange={event => setFlowField("aiAutoCloseMinutes", event.target.value)} />
								<MessageTemplateField label="Mensagem antes de encerrar" name="flowAiAutoCloseMessage" value={textValue(flowForm.aiAutoCloseMessage)} rows={3} onChange={event => setFlowField("aiAutoCloseMessage", event.target.value)} />
								<TextField select fullWidth margin="dense" variant="outlined" label="Motivo de encerramento" value={flowForm.aiAutoCloseReasonId || ""} onChange={event => setFlowField("aiAutoCloseReasonId", event.target.value)}>
									<MenuItem value="">Selecione</MenuItem>
									{closingReasons.map(reason => <MenuItem key={reason.id} value={reason.id}>{textValue(reason.name)}</MenuItem>)}
								</TextField>
								<FormControlLabel
									control={<Switch color="primary" checked={flowForm.aiAutoCloseOnlyIfNotHandedOff !== false} onChange={event => setFlowField("aiAutoCloseOnlyIfNotHandedOff", event.target.checked)} />}
									label="Nao encerrar se ja foi encaminhado para atendente"
								/>
							</>
						)}
					</Paper>
					<FormControlLabel
						control={<Switch color="primary" checked={flowForm.active !== false} onChange={event => setFlowField("active", event.target.checked)} />}
						label="URA ativa"
					/>
					<Button fullWidth variant="contained" color="primary" onClick={saveFlow} disabled={loading}>
						Salvar URA
					</Button>
				</Paper>
			</Grid>

			<Grid item xs={12} md={4}>
				<Paper variant="outlined" style={{ padding: 16, height: "100%" }}>
					<Grid container alignItems="center" spacing={1}>
						<Grid item xs>
							<Typography variant="h6">Arvore da URA</Typography>
						</Grid>
						<Grid item>
							<Button size="small" variant="outlined" color="primary" disabled={!selectedFlowId} onClick={() => newOption(null)}>
								Adicionar opcao
							</Button>
						</Grid>
					</Grid>
					<Typography variant="caption" color="textSecondary">
						Opcoes sem pai aparecem no menu principal. Subopcoes aparecem dentro do submenu escolhido.
					</Typography>
					<div style={{ marginTop: 12 }}>{renderTree()}</div>
				</Paper>
			</Grid>

			<Grid item xs={12} md={4}>
				<Paper variant="outlined" style={{ padding: 16, height: "100%" }}>
					<Typography variant="h6">Editor da opcao</Typography>
					{!optionForm ? (
						<Typography variant="body2" color="textSecondary">
							Selecione uma opcao na arvore ou clique em Adicionar opcao.
						</Typography>
					) : (
						<>
							<TextField select fullWidth margin="dense" variant="outlined" label="Aparece dentro de" value={optionForm.parentOptionId || ""} onChange={event => setOptionField("parentOptionId", event.target.value)}>
								<MenuItem value="">Menu principal</MenuItem>
								{currentOptions.filter(item => Number(item.id) !== Number(optionForm.id)).map(option => (
									<MenuItem key={option.id} value={option.id}>{textValue(option.optionKey)} - {textValue(option.title)}</MenuItem>
								))}
							</TextField>
							<Grid container spacing={1}>
								<Grid item xs={4}>
									<TextField fullWidth margin="dense" variant="outlined" label="Opcao" value={textValue(optionForm.optionKey)} onChange={event => setOptionField("optionKey", event.target.value)} />
								</Grid>
								<Grid item xs={8}>
									<TextField fullWidth margin="dense" variant="outlined" label="Titulo" value={textValue(optionForm.title)} onChange={event => setOptionField("title", event.target.value)} />
								</Grid>
							</Grid>
							<TextField
								select
								fullWidth
								margin="dense"
								variant="outlined"
								label="O que esta opcao faz"
								value={getVisibleUraOptionAction(optionForm)}
								onChange={event => {
									const value = event.target.value;
									if (value === "RUN_FORM") {
										setOptionForm(prev => ({
											...emptyUraOption(selectedFlowId),
											...(prev || {}),
											action: "SEND_MESSAGE",
											runQualificationFormBeforeAction: true,
											responseMessage: "",
											responseMediaUrl: "",
											responseMediaType: "",
											responseMediaName: "",
											showMainMenuAfterMessage: false
										}));
										setOptionMediaFile(null);
										return;
									}
									setOptionForm(prev => ({
										...emptyUraOption(selectedFlowId),
										...(prev || {}),
										action: value,
										runQualificationFormBeforeAction: false,
										qualificationFormId: "",
										allowQualificationFormSkip: false
									}));
								}}
							>
								<MenuItem value="RUN_FORM">Executar formulario</MenuItem>
								<MenuItem value="SEND_MESSAGE">Enviar mensagem</MenuItem>
								<MenuItem value="OPEN_SUBMENU">Abrir submenu</MenuItem>
								<MenuItem value="TRANSFER_QUEUE">Transferir para fila</MenuItem>
								<MenuItem value="START_AI">Acionar IA</MenuItem>
								<MenuItem value="HUMAN">Encaminhar para humano</MenuItem>
								<MenuItem value="CLOSE_TICKET">Encerrar atendimento</MenuItem>
								<MenuItem value="BACK_PREVIOUS">Voltar ao menu anterior</MenuItem>
								<MenuItem value="BACK_ROOT">Voltar ao menu inicial</MenuItem>
							</TextField>
							{["TRANSFER_QUEUE", "HUMAN", "START_AI"].includes(optionForm.action) && (
								<TextField select fullWidth margin="dense" variant="outlined" label="Fila destino" value={optionForm.targetQueueId || ""} onChange={event => setOptionField("targetQueueId", event.target.value)}>
									<MenuItem value="">Selecione</MenuItem>
									{queues.map(queue => <MenuItem key={queue.id} value={queue.id}>{textValue(queue.name)}</MenuItem>)}
								</TextField>
							)}
							{optionForm.action === "CLOSE_TICKET" && (
								<TextField select fullWidth margin="dense" variant="outlined" label="Motivo de encerramento" value={optionForm.closingReasonId || ""} onChange={event => setOptionField("closingReasonId", event.target.value)}>
									<MenuItem value="">Selecione</MenuItem>
									{closingReasons.map(reason => <MenuItem key={reason.id} value={reason.id}>{textValue(reason.name)}</MenuItem>)}
								</TextField>
							)}
							<Paper variant="outlined" style={{ padding: 12, marginTop: 12, marginBottom: 8 }}>
								<Typography variant="subtitle2">
									{getVisibleUraOptionAction(optionForm) === "RUN_FORM" ? "Formulario executado por esta opcao" : "Formulario antes da acao"}
								</Typography>
								<Typography variant="caption" color="textSecondary">
									{getVisibleUraOptionAction(optionForm) === "RUN_FORM"
										? "Ao escolher esta opcao na URA, o cliente entra direto neste formulario."
										: "Use somente quando precisar coletar dados antes de transferir, encerrar, acionar IA ou enviar mensagem."}
								</Typography>
								{getVisibleUraOptionAction(optionForm) !== "RUN_FORM" && (
									<FormControlLabel
										control={<Switch color="primary" checked={!!optionForm.runQualificationFormBeforeAction} onChange={event => setOptionField("runQualificationFormBeforeAction", event.target.checked)} />}
										label="Executar formulario antes"
									/>
								)}
								{(getVisibleUraOptionAction(optionForm) === "RUN_FORM" || optionForm.runQualificationFormBeforeAction) && (
									<>
										<TextField select fullWidth margin="dense" variant="outlined" label="Formulario" value={optionForm.qualificationFormId || ""} onChange={event => setOptionField("qualificationFormId", event.target.value)}>
											<MenuItem value="">Selecione</MenuItem>
											{qualificationForms.map(form => <MenuItem key={form.id} value={form.id}>{textValue(form.name)}</MenuItem>)}
										</TextField>
										<FormControlLabel
											control={<Switch color="primary" checked={!!optionForm.allowQualificationFormSkip} onChange={event => setOptionField("allowQualificationFormSkip", event.target.checked)} />}
											label="Permitir pular perguntas opcionais"
										/>
										<Typography variant="caption" display="block" color="textSecondary">
											{getVisibleUraOptionAction(optionForm) === "RUN_FORM"
												? "Ao concluir, o formulario finaliza a opcao. Se o GLPI automatico estiver ativo, o chamado sera criado ao final do formulario."
												: "Ao concluir, a acao configurada acima sera executada com as respostas como contexto."}
										</Typography>
									</>
								)}
							</Paper>
							{getVisibleUraOptionAction(optionForm) !== "RUN_FORM" && (
								<MessageTemplateField label={optionForm.action === "OPEN_SUBMENU" ? "Mensagem deste submenu" : "Mensagem enviada ao cliente"} name="responseMessage" value={textValue(optionForm.responseMessage)} rows={5} onChange={event => setOptionField("responseMessage", event.target.value)} />
							)}
							{getVisibleUraOptionAction(optionForm) !== "RUN_FORM" && optionForm.action === "SEND_MESSAGE" && (
								<Paper variant="outlined" style={{ padding: 12, marginTop: 12, marginBottom: 8 }}>
									<Typography variant="subtitle2">Depois de enviar a mensagem</Typography>
									<FormControlLabel
										control={<Switch color="primary" checked={!!optionForm.showMainMenuAfterMessage} onChange={event => setOptionField("showMainMenuAfterMessage", event.target.checked)} />}
										label="Mostrar comandos de navegacao"
									/>
									<Typography variant="caption" display="block" color="textSecondary">
										Adiciona M para menu principal, S para encerrar e V para voltar quando existir menu anterior.
									</Typography>
								</Paper>
							)}
							{getVisibleUraOptionAction(optionForm) !== "RUN_FORM" && (
								<>
									<input
										accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
										id="ura-option-media"
										type="file"
										style={{ display: "none" }}
										onChange={event => setOptionMediaFile(event.target.files?.[0] || null)}
									/>
									<label htmlFor="ura-option-media">
										<Button component="span" size="small" variant="outlined" color="primary" style={{ marginTop: 8 }}>
											Anexar arquivo da opcao
										</Button>
									</label>
									<Typography variant="caption" display="block" color="textSecondary">
										{optionMediaFile?.name || optionForm.responseMediaName || "Nenhum anexo selecionado"}
									</Typography>
								</>
							)}
							<Paper variant="outlined" style={{ padding: 12, marginTop: 12 }}>
								<Typography variant="subtitle2">Regras do atendimento automatico nesta opcao</Typography>
								<Typography variant="caption" color="textSecondary">
									Use estes campos apenas quando esta opcao precisar de uma regra diferente da configuracao geral da URA.
								</Typography>
								<FormControlLabel
									control={<Switch color="primary" checked={!!optionForm.aiHumanHandoffEnabled} onChange={event => setOptionField("aiHumanHandoffEnabled", event.target.checked)} />}
									label="Permitir que a IA encaminhe para atendente"
								/>
								{optionForm.aiHumanHandoffEnabled && (
									<>
										<TextField select fullWidth margin="dense" variant="outlined" label="Fila humana para encaminhar" value={optionForm.aiHumanHandoffQueueId || ""} onChange={event => setOptionField("aiHumanHandoffQueueId", event.target.value)}>
											<MenuItem value="">Selecione</MenuItem>
											{queues.map(queue => <MenuItem key={queue.id} value={queue.id}>{textValue(queue.name)}</MenuItem>)}
										</TextField>
										<MessageTemplateField label="Mensagem para o cliente antes de transferir" name="aiHumanHandoffMessage" value={textValue(optionForm.aiHumanHandoffMessage)} rows={3} onChange={event => setOptionField("aiHumanHandoffMessage", event.target.value)} />
									</>
								)}
								<FormControlLabel
									control={<Switch color="primary" checked={!!optionForm.aiAutoCloseEnabled} onChange={event => setOptionField("aiAutoCloseEnabled", event.target.checked)} />}
									label="Usar encerramento por inatividade proprio nesta opcao"
								/>
								{optionForm.aiAutoCloseEnabled && (
									<>
										<TextField fullWidth margin="dense" variant="outlined" type="number" label="Tempo sem resposta/interacao para encerrar (min.)" value={textValue(optionForm.aiAutoCloseMinutes)} onChange={event => setOptionField("aiAutoCloseMinutes", event.target.value)} />
										<MessageTemplateField label="Mensagem antes de encerrar" name="aiAutoCloseMessage" value={textValue(optionForm.aiAutoCloseMessage)} rows={3} onChange={event => setOptionField("aiAutoCloseMessage", event.target.value)} />
										<TextField select fullWidth margin="dense" variant="outlined" label="Motivo de encerramento" value={optionForm.aiAutoCloseReasonId || ""} onChange={event => setOptionField("aiAutoCloseReasonId", event.target.value)}>
											<MenuItem value="">Selecione</MenuItem>
											{closingReasons.map(reason => <MenuItem key={reason.id} value={reason.id}>{textValue(reason.name)}</MenuItem>)}
										</TextField>
										<FormControlLabel
											control={<Switch color="primary" checked={optionForm.aiAutoCloseOnlyIfNotHandedOff !== false} onChange={event => setOptionField("aiAutoCloseOnlyIfNotHandedOff", event.target.checked)} />}
											label="Nao encerrar se ja foi encaminhado para atendente"
										/>
									</>
								)}
								<FormControlLabel
									control={<Switch color="primary" checked={!!optionForm.aiHandoffAlertEnabled} onChange={event => setOptionField("aiHandoffAlertEnabled", event.target.checked)} />}
									label="Avisar outro WhatsApp quando a IA transferir"
								/>
								{optionForm.aiHandoffAlertEnabled && (
									<>
										<TextField fullWidth margin="dense" variant="outlined" label="Numero, contato ou grupo para aviso" value={textValue(optionForm.aiHandoffAlertTo)} onChange={event => setOptionField("aiHandoffAlertTo", event.target.value)} />
										<MessageTemplateField label="Mensagem do aviso" name="aiHandoffAlertMessage" value={textValue(optionForm.aiHandoffAlertMessage)} rows={4} onChange={event => setOptionField("aiHandoffAlertMessage", event.target.value)} />
									</>
								)}
							</Paper>
							<TextField fullWidth margin="dense" variant="outlined" type="number" label="Ordem" value={textValue(optionForm.order || 0)} onChange={event => setOptionField("order", event.target.value)} />
							<FormControlLabel
								control={<Switch color="primary" checked={optionForm.active !== false} onChange={event => setOptionField("active", event.target.checked)} />}
								label="Opcao ativa"
							/>
							<Grid container spacing={1}>
								<Grid item xs>
									<Button fullWidth variant="contained" color="primary" onClick={saveOption}>
										Salvar opcao
									</Button>
								</Grid>
								{optionForm.id && (
									<Grid item>
										<Button variant="outlined" color="secondary" onClick={() => removeOption(optionForm)}>
											Excluir
										</Button>
									</Grid>
								)}
							</Grid>
						</>
					)}
				</Paper>
			</Grid>
		</Grid>
	);
};

const getField = (resource, name) => {
	return resource.fields.find(field => field.name === name);
};

const getColumnLabel = (resource, col) => {
	const field = getField(resource, col);
	return field?.label || col;
};

const shouldShowField = (field, form) => {
	if (field.readOnly && !form[field.name]) return false;
	if (typeof field.showWhen === "function") return field.showWhen(form);

	if (["aiHumanHandoffQueueId", "aiHumanHandoffMessage"].includes(field.name)) {
		return !!form.aiHumanHandoffEnabled;
	}

	if (["aiAutoCloseMinutes", "aiAutoCloseMessage", "aiAutoCloseReasonId", "aiAutoCloseOnlyIfNotHandedOff"].includes(field.name)) {
		return !!form.aiAutoCloseEnabled;
	}

	if (["aiHandoffAlertTo", "aiHandoffAlertMessage"].includes(field.name)) {
		return !!form.aiHandoffAlertEnabled;
	}

	return true;
};

const buildMultipartPayload = (payload, mediaFile) => {
	const formData = new FormData();
	Object.entries(payload).forEach(([key, value]) => {
		if (value === undefined || value === null) return;
		formData.append(key, Array.isArray(value) ? JSON.stringify(value) : value);
	});
	if (mediaFile) formData.append("media", mediaFile);
	return formData;
};

const parseTagText = value => {
	if (Array.isArray(value)) {
		return value
			.map(item => String(item || "").trim())
			.filter(Boolean);
	}

	if (value === null || value === undefined) return [];

	return String(value)
		.split(",")
		.map(item => item.trim())
		.filter(Boolean);
};

const formatTagText = value => parseTagText(value).join(", ");

const formatListText = value => {
	if (Array.isArray(value)) return value.join("\n");
	const text = String(value || "").trim();
	if (!text) return "";

	try {
		const parsed = JSON.parse(text);
		if (Array.isArray(parsed)) return parsed.map(item => String(item)).join("\n");
	} catch (err) {
		return text;
	}

	return text;
};

const parseListValue = value => {
	if (Array.isArray(value)) return value.map(item => String(item));
	const text = String(value || "").trim();
	if (!text) return [];

	try {
		const parsed = JSON.parse(text);
		if (Array.isArray(parsed)) return parsed.map(item => String(item));
	} catch (err) {
		return text.split(/\r?\n|,/).map(item => item.trim()).filter(Boolean);
	}

	return [];
};

const parseNumericList = value => parseListValue(value)
	.map(item => Number(item))
	.filter(item => Number.isFinite(item) && item > 0);

const parseGlpiEntityLocationRules = value => {
	try {
		const parsed = JSON.parse(value || "[]");
		if (!Array.isArray(parsed)) return [];

		return parsed
			.map(rule => ({
				entityId: Number(rule?.entityId) || null,
				allowedLocationIds: Array.isArray(rule?.allowedLocationIds)
					? rule.allowedLocationIds.map(item => Number(item)).filter(item => Number.isInteger(item) && item > 0)
					: [],
				defaultLocationId: Number(rule?.defaultLocationId) || null
			}))
			.filter(rule => rule.entityId);
	} catch (err) {
		return [];
	}
};

const questionTypeOptions = [
	{ value: "text", label: "Texto livre" },
	{ value: "single_choice", label: "Escolha unica" },
	{ value: "multiple_choice", label: "Multipla escolha" },
	{ value: "glpi_entity", label: "Entidade GLPI" },
	{ value: "glpi_location", label: "Localizacao GLPI" }
];

const getVisibleQuestionType = type =>
	questionTypeOptions.some(item => item.value === type) ? type : "text";

const getQuestionTypeOption = type => {
	return questionTypeOptions.find(item => item.value === type) || questionTypeOptions[0];
};

const getQuestionTypeHelp = type => ({
	text: "O cliente digita uma resposta livre.",
	single_choice: "O cliente escolhe uma unica opcao pelo numero enviado.",
	multiple_choice: "O cliente pode informar mais de uma opcao, como 1,3.",
	glpi_entity: "O cliente escolhe uma entidade sincronizada do GLPI. A escolha tambem pode preencher a entidade do chamado automatico.",
	glpi_location: "O cliente escolhe uma localizacao sincronizada do GLPI. A escolha tambem pode preencher a localizacao do chamado automatico."
}[type || "text"] || "Escolha como o cliente deve responder no WhatsApp.");

const getDefaultGlpiFieldForQuestionType = type => {
	if (type === "glpi_entity") return "entity";
	if (type === "glpi_location") return "location";
	return "description";
};

const normalizeGlpiFieldForQuestionType = (type, field) => {
	const defaultField = getDefaultGlpiFieldForQuestionType(type);
	if (field === defaultField || field === "ignore") return field;
	return "ignore";
};

const getGlpiFieldLabel = (type, field) => {
	const normalized = normalizeGlpiFieldForQuestionType(type, field);
	if (normalized === "ignore") return "Nao usa GLPI";
	if (normalized === "entity") return "Preenche entidade do chamado";
	if (normalized === "location") return "Preenche localizacao do chamado";
	return "Entra na descricao do chamado";
};

const getGlpiQuestionUsageText = type => {
	if (type === "glpi_entity") {
		return "A entidade escolhida pelo cliente sera usada como entidade do chamado GLPI.";
	}
	if (type === "glpi_location") {
		return "A localizacao escolhida pelo cliente sera usada como localizacao do chamado GLPI.";
	}
	return "Quando ligado, a resposta sera adicionada na descricao do chamado GLPI.";
};

const getGlpiOptionLabel = option =>
	option?.name || option?.completeName || option?.glpiId || "";

const normalizeFormKey = value =>
	String(value || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim()
		.replace(/\s+/g, "_")
		.replace(/[^\w.-]/g, "");

const normalizeSearchText = value =>
	String(value || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();

const FormSearchPicker = ({
	classes,
	forms,
	questions,
	uraOptions,
	value,
	inputValue,
	onInputChange,
	onSelect,
	onNew
}) => {
	const safeForms = safeArray(forms);
	const getUsage = formId => safeArray(uraOptions).filter(option =>
		Number(option.qualificationFormId) === Number(formId) &&
		(option.runQualificationFormBeforeAction === true || option.runQualificationFormBeforeAction === "true")
	);
	const selected = safeForms.find(item => Number(item.id) === Number(value)) || null;

	return (
		<div className={classes.formBuilderToolbarActions}>
			<Autocomplete
				style={{ minWidth: 340 }}
				options={safeForms}
				value={selected}
				inputValue={inputValue}
				onInputChange={(event, nextValue) => onInputChange(nextValue)}
				onChange={(event, option) => {
					if (option) onSelect(option);
				}}
				getOptionLabel={option => textValue(option?.name)}
				getOptionSelected={(option, selectedOption) => Number(option.id) === Number(selectedOption.id)}
				filterOptions={(options, state) => {
					const search = normalizeSearchText(state.inputValue);
					if (!search) return options;
					return options.filter(item => [
						item.name,
						item.description,
						item.active === false ? "inativo" : "ativo",
						...getUsage(item.id).map(option => `${option.optionKey} ${option.title}`)
					].some(itemValue => normalizeSearchText(itemValue).includes(search)));
				}}
				noOptionsText={safeForms.length ? "Nenhum formulario encontrado" : "Nenhum formulario cadastrado"}
				renderOption={option => {
					const usage = getUsage(option.id);
					const questionCount = safeArray(questions).filter(question => Number(question.formId) === Number(option.id)).length;
					return (
						<Grid container spacing={1} alignItems="center" wrap="nowrap">
							<Grid item xs>
								<Typography variant="subtitle2">{textValue(option.name)}</Typography>
								<Typography variant="caption" color="textSecondary">
									{option.active === false ? "Inativo" : "Ativo"} - {questionCount} pergunta(s) - {usage.length ? `${usage.length} vinculo(s) na URA` : "sem vinculo na URA"}
								</Typography>
							</Grid>
						</Grid>
					);
				}}
				renderInput={params => (
					<TextField
						{...params}
						variant="outlined"
						size="small"
						placeholder="Pesquisar ou selecionar formulario"
						InputProps={{
							...params.InputProps,
							startAdornment: (
								<>
									<InputAdornment position="start">
										<SearchIcon fontSize="small" />
									</InputAdornment>
									{params.InputProps.startAdornment}
								</>
							)
						}}
					/>
				)}
			/>
			<Button size="small" variant="outlined" color="primary" onClick={onNew}>
				Novo
			</Button>
		</div>
	);
};

const emptyQualificationForm = {
	name: "",
	description: "",
	greetingMessage: "",
	active: true
};

const emptyQualificationQuestion = formId => ({
	formId: formId || "",
	key: "",
	label: "",
	type: "text",
	glpiField: "ignore",
	options: [],
	required: true,
	includeInAiContext: true,
	includeInReports: false,
	maxInvalidAttempts: 2,
	order: 0,
	active: true
});

const safeArray = value => Array.isArray(value) ? value.filter(Boolean) : [];

const qualificationRouteActions = [
	{ value: "NEXT", label: "Continuar para a proxima pergunta" },
	{ value: "GOTO_QUESTION", label: "Ir para uma pergunta especifica" },
	{ value: "END_FORM", label: "Encerrar formulario e seguir acao da URA" },
	{ value: "START_AI", label: "Encerrar e iniciar IA" },
	{ value: "TRANSFER_QUEUE", label: "Encerrar e transferir para fila" },
	{ value: "HUMAN", label: "Encerrar e encaminhar para humano" },
	{ value: "CLOSE_TICKET", label: "Encerrar atendimento" },
	{ value: "BACK_ROOT", label: "Voltar ao menu principal da URA" },
	{ value: "BACK_PREVIOUS", label: "Voltar ao menu anterior da URA" },
	{ value: "OPEN_URA_OPTION", label: "Abrir uma opcao/submenu da URA" }
];

const parseQuestionOptions = value => {
	if (Array.isArray(value)) {
		return safeArray(value).map((item, index) => ({
			value: String(item?.value || index + 1),
			label: String(item?.label || item?.value || ""),
			tagRefs: parseListValue(item?.tagRefs || item?.tagIds || []),
			nextAction: item?.nextAction || "NEXT",
			nextMessage: item?.nextMessage || "",
			nextMessages: Array.isArray(item?.nextMessages)
				? item.nextMessages.map(message => ({
					body: message?.body || "",
					mediaUrl: message?.mediaUrl || "",
					mediaType: message?.mediaType || "",
					mediaName: message?.mediaName || ""
				})).filter(message => message.body || message.mediaUrl)
				: (item?.nextMessage ? [{ body: item.nextMessage, mediaUrl: "", mediaType: "", mediaName: "" }] : []),
			nextQuestionId: item?.nextQuestionId || "",
			targetQueueId: item?.targetQueueId || "",
			uraOptionId: item?.uraOptionId || ""
		})).filter(item => item.value);
	}

	const text = String(value || "").trim();
	if (!text) return [];

	try {
		const parsed = JSON.parse(text);
		return parseQuestionOptions(parsed);
	} catch (err) {
		return text
			.split(/\r?\n|;/)
			.map((line, index) => {
				const parts = line.split("|").map(part => part.trim());
				return {
					value: parts[1] ? parts[0] : String(index + 1),
					label: parts[1] || parts[0],
					tagRefs: parseListValue(parts.slice(2).join(",")),
					nextAction: "NEXT",
					nextMessage: "",
					nextMessages: [],
					nextQuestionId: "",
					targetQueueId: "",
					uraOptionId: ""
				};
			})
			.filter(item => item.label);
	}
};

class QualificationFormsBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = { error: null };
	}

	static getDerivedStateFromError(error) {
		return { error };
	}

	componentDidCatch(error) {
		// eslint-disable-next-line no-console
		console.error("[QualificationFormsPanel]", error);
	}

	render() {
		if (this.state.error) {
			return (
				<Paper variant="outlined" style={{ padding: 16 }}>
					<Typography variant="h6">Construtor de formularios</Typography>
					<Typography variant="body2" color="textSecondary">
						O construtor encontrou um erro ao renderizar. Atualize a pagina e tente novamente.
					</Typography>
					<Typography variant="caption" color="error">
						{this.state.error.message || String(this.state.error)}
					</Typography>
				</Paper>
			);
		}

		return this.props.children;
	}
}

const QualificationFormsPanel = ({ classes }) => {
	const [forms, setForms] = useState([]);
	const [questions, setQuestions] = useState([]);
	const [tags, setTags] = useState([]);
	const [uraOptions, setUraOptions] = useState([]);
	const [queues, setQueues] = useState([]);
	const [glpiCatalogs, setGlpiCatalogs] = useState({ entities: [], locations: [], settings: {} });
	const [selectedFormId, setSelectedFormId] = useState("");
	const [form, setForm] = useState(emptyQualificationForm);
	const [questionForm, setQuestionForm] = useState(null);
	const [showAdvancedQuestion, setShowAdvancedQuestion] = useState(false);
	const [loading, setLoading] = useState(false);
	const [tagDialogOpen, setTagDialogOpen] = useState(false);
	const [quickTagForm, setQuickTagForm] = useState({ name: "", color: "#607d8b", fixed: false });
	const [formSearch, setFormSearch] = useState("");
	const [formEditorOpen, setFormEditorOpen] = useState(false);
	const [deleteFormTarget, setDeleteFormTarget] = useState(null);
	const [draggedQuestionId, setDraggedQuestionId] = useState(null);
	const [savingQuestionOrder, setSavingQuestionOrder] = useState(false);

	const selectedFormQuestions = safeArray(questions)
		.filter(question => Number(question.formId) === Number(selectedFormId))
		.sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || Number(a.id || 0) - Number(b.id || 0));

	const manualChoiceQuestion = ["single_choice", "multiple_choice"].includes(questionForm?.type);
	const glpiChoiceQuestion = ["glpi_entity", "glpi_location"].includes(questionForm?.type);

	const load = async () => {
		setLoading(true);
		try {
			const [
				{ data: formData },
				{ data: questionData },
				{ data: tagData },
				{ data: uraOptionData },
				{ data: queueData },
				glpiConfig,
				glpiEntities,
				glpiLocations
			] = await Promise.all([
				api.get("/qualification-forms"),
				api.get("/qualification-form-questions"),
				api.get("/tags"),
				api.get("/ura-options").catch(() => ({ data: [] })),
				api.get("/queues").catch(() => ({ data: [] })),
				api.get("/glpi/config").catch(() => ({ data: {} })),
				api.get("/glpi/entities").catch(() => ({ data: [] })),
				api.get("/glpi/locations").catch(() => ({ data: [] }))
			]);

			const nextForms = safeArray(formData);
			setForms(nextForms);
			setQuestions(safeArray(questionData));
			setTags(safeArray(tagData));
			setUraOptions(safeArray(uraOptionData));
			setQueues(safeArray(queueData));
			setGlpiCatalogs({
				settings: glpiConfig.data || {},
				entities: safeArray(glpiEntities.data),
				locations: safeArray(glpiLocations.data)
			});

			if (selectedFormId) {
				const selected = nextForms.find(item => Number(item.id) === Number(selectedFormId));
				if (selected) {
					setForm({
						...emptyQualificationForm,
						...selected
					});
				}
			}

			if (!selectedFormId && !formEditorOpen) {
				setForm({
					...emptyQualificationForm
				});
			}
		} catch (err) {
			toastError(err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const selectForm = nextForm => {
		setSelectedFormId(nextForm.id);
		setFormSearch(textValue(nextForm.name));
		setFormEditorOpen(true);
		setForm({
			...emptyQualificationForm,
			...nextForm
		});
		setQuestionForm(null);
		setShowAdvancedQuestion(false);
	};

	const newForm = () => {
		setSelectedFormId("");
		setFormSearch("");
		setFormEditorOpen(true);
		setForm({ ...emptyQualificationForm });
		setQuestionForm(null);
		setShowAdvancedQuestion(false);
	};

	const saveForm = async () => {
		try {
			const payload = {
				name: form.name,
				description: form.description,
				greetingMessage: form.greetingMessage,
				active: form.active !== false
			};
			const { data } = form.id
				? await api.put(`/qualification-forms/${form.id}`, payload)
				: await api.post("/qualification-forms", payload);

			toast.success("Formulario salvo.");
			await load();
			selectForm(data);
		} catch (err) {
			toastError(err);
		}
	};

	const newQuestion = () => {
		if (!selectedFormId) {
			toast.info("Salve ou selecione um formulario antes de criar perguntas.");
			return;
		}

		setQuestionForm({
			...emptyQualificationQuestion(selectedFormId),
			order: selectedFormQuestions.length + 1
		});
		setShowAdvancedQuestion(false);
	};

	const getUniqueQuestionKey = (value, currentQuestionId) => {
		const baseKey = normalizeFormKey(value) || "pergunta";
		const usedKeys = new Set(
			selectedFormQuestions
				.filter(question => !currentQuestionId || Number(question.id) !== Number(currentQuestionId))
				.map(question => normalizeFormKey(question.key))
				.filter(Boolean)
		);

		if (!usedKeys.has(baseKey)) return baseKey;

		let suffix = 2;
		let nextKey = `${baseKey}_${suffix}`;
		while (usedKeys.has(nextKey)) {
			suffix += 1;
			nextKey = `${baseKey}_${suffix}`;
		}
		return nextKey;
	};

	const buildQuestionPayload = question => ({
		formId: question.formId,
		key: question.key,
		label: question.label,
		type: question.type,
		glpiField: normalizeGlpiFieldForQuestionType(question.type, question.glpiField),
		options: question.options,
		required: question.required !== false,
		includeInAiContext: question.includeInAiContext !== false,
		includeInReports: question.includeInReports !== false,
		maxInvalidAttempts: question.maxInvalidAttempts || 2,
		order: Number(question.order || 0),
		active: question.active !== false
	});

	const reorderQuestions = async (sourceId, targetId) => {
		if (!sourceId || !targetId || Number(sourceId) === Number(targetId) || savingQuestionOrder) return;

		const sourceIndex = selectedFormQuestions.findIndex(question => Number(question.id) === Number(sourceId));
		const targetIndex = selectedFormQuestions.findIndex(question => Number(question.id) === Number(targetId));
		if (sourceIndex < 0 || targetIndex < 0) return;

		const previousQuestions = questions;
		const reordered = [...selectedFormQuestions];
		const [moved] = reordered.splice(sourceIndex, 1);
		reordered.splice(targetIndex, 0, moved);
		const normalized = reordered.map((question, index) => ({
			...question,
			order: index + 1
		}));
		const normalizedById = new Map(normalized.map(question => [Number(question.id), question]));

		setSavingQuestionOrder(true);
		setQuestions(prev => safeArray(prev).map(question => normalizedById.get(Number(question.id)) || question));
		if (questionForm?.id && normalizedById.has(Number(questionForm.id))) {
			setQuestionForm(prev => ({
				...(prev || {}),
				order: normalizedById.get(Number(questionForm.id)).order
			}));
		}

		try {
			await Promise.all(normalized.map(question =>
				api.put(`/qualification-form-questions/${question.id}`, buildQuestionPayload(question))
			));
			toast.success("Ordem das perguntas atualizada.");
			await load();
		} catch (err) {
			setQuestions(previousQuestions);
			toastError(err);
		} finally {
			setSavingQuestionOrder(false);
			setDraggedQuestionId(null);
		}
	};

	const editQuestion = question => {
		setQuestionForm({
			...emptyQualificationQuestion(selectedFormId),
			...question,
			options: parseQuestionOptions(question.options)
		});
		setShowAdvancedQuestion(false);
	};

	const setQuestionField = (name, value) => {
		setQuestionForm(prev => {
			const next = {
				...emptyQualificationQuestion(selectedFormId),
				...(prev || {}),
				[name]: value
			};

			if (name === "label" && !prev?.key) {
				next.key = getUniqueQuestionKey(value, prev?.id);
			}

			if (name === "type" && !["single_choice", "multiple_choice"].includes(value)) {
				next.options = [];
			}

			if (name === "type") {
				next.glpiField = normalizeGlpiFieldForQuestionType(value, next.glpiField) === "ignore"
					? "ignore"
					: getDefaultGlpiFieldForQuestionType(value);
			}

			next.glpiField = normalizeGlpiFieldForQuestionType(next.type, next.glpiField);

			if (name === "type" && ["single_choice", "multiple_choice"].includes(value) && !parseQuestionOptions(next.options).length) {
				next.options = [
					{ value: "1", label: "", tagRefs: [], nextAction: "NEXT", nextMessage: "", nextMessages: [], nextQuestionId: "", targetQueueId: "", uraOptionId: "" },
					{ value: "2", label: "", tagRefs: [], nextAction: "NEXT", nextMessage: "", nextMessages: [], nextQuestionId: "", targetQueueId: "", uraOptionId: "" }
				];
			}

			return next;
		});
	};

	const addOption = () => {
		setQuestionForm(prev => {
			const options = parseQuestionOptions(prev?.options || []);
			return {
				...emptyQualificationQuestion(selectedFormId),
				...(prev || {}),
				options: [
					...options,
					{ value: String(options.length + 1), label: "", tagRefs: [], nextAction: "NEXT", nextMessage: "", nextMessages: [], nextQuestionId: "", targetQueueId: "", uraOptionId: "" }
				]
			};
		});
	};

	const updateOption = (index, changes) => {
		setQuestionForm(prev => {
			const options = parseQuestionOptions(prev?.options || []);
			return {
				...emptyQualificationQuestion(selectedFormId),
				...(prev || {}),
				options: options.map((option, optionIndex) =>
					optionIndex === index ? { ...option, ...changes, value: String(optionIndex + 1) } : { ...option, value: String(optionIndex + 1) }
				)
			};
		});
	};

	const updateOptionMessages = (optionIndex, messages) => {
		updateOption(optionIndex, {
			nextMessages: safeArray(messages),
			nextMessage: safeArray(messages).map(message => textValue(message.body).trim()).filter(Boolean)[0] || ""
		});
	};

	const addOptionMessage = optionIndex => {
		const option = parseQuestionOptions(questionForm?.options || [])[optionIndex] || {};
		updateOptionMessages(optionIndex, [
			...safeArray(option.nextMessages),
			{ body: "", mediaUrl: "", mediaType: "", mediaName: "" }
		]);
	};

	const updateOptionMessage = (optionIndex, messageIndex, changes) => {
		const option = parseQuestionOptions(questionForm?.options || [])[optionIndex] || {};
		const messages = safeArray(option.nextMessages);
		updateOptionMessages(optionIndex, messages.map((message, index) =>
			index === messageIndex ? { ...message, ...changes } : message
		));
	};

	const removeOptionMessage = (optionIndex, messageIndex) => {
		const option = parseQuestionOptions(questionForm?.options || [])[optionIndex] || {};
		updateOptionMessages(optionIndex, safeArray(option.nextMessages).filter((_, index) => index !== messageIndex));
	};

	const uploadOptionMessageMedia = async (optionIndex, messageIndex, file) => {
		if (!file) return;
		const formData = new FormData();
		formData.append("media", file);

		try {
			const { data } = await api.post("/qualification-form-message-media", formData);
			updateOptionMessage(optionIndex, messageIndex, {
				mediaUrl: data.mediaUrl,
				mediaType: data.mediaType,
				mediaName: data.mediaName
			});
			toast.success("Anexo carregado.");
		} catch (err) {
			toastError(err);
		}
	};

	const removeOption = index => {
		setQuestionForm(prev => ({
			...emptyQualificationQuestion(selectedFormId),
			...(prev || {}),
			options: parseQuestionOptions(prev?.options || [])
				.filter((_, optionIndex) => optionIndex !== index)
				.map((option, optionIndex) => ({ ...option, value: String(optionIndex + 1) }))
		}));
	};

	const saveQuestion = async () => {
		if (!questionForm) return;

		try {
			const options = parseQuestionOptions(questionForm.options)
				.map((option, index) => ({
					value: textValue(index + 1),
					label: textValue(option.label).trim(),
					tagRefs: parseListValue(option.tagRefs),
					nextAction: option.nextAction || "NEXT",
					nextMessage: textValue(option.nextMessage).trim() || null,
					nextMessages: safeArray(option.nextMessages)
						.map(message => ({
							body: textValue(message.body).trim() || null,
							mediaUrl: message.mediaUrl || null,
							mediaType: message.mediaType || null,
							mediaName: message.mediaName || null
						}))
						.filter(message => message.body || message.mediaUrl),
					nextQuestionId: option.nextAction === "GOTO_QUESTION" ? option.nextQuestionId || null : null,
					targetQueueId: ["TRANSFER_QUEUE", "START_AI"].includes(option.nextAction) ? option.targetQueueId || null : null,
					uraOptionId: option.nextAction === "OPEN_URA_OPTION" ? option.uraOptionId || null : null
				}))
				.filter(option => option.label);

			const payload = {
				...questionForm,
				formId: selectedFormId,
				key: getUniqueQuestionKey(questionForm.key || questionForm.label, questionForm.id),
				options: manualChoiceQuestion ? options : null,
				glpiField: normalizeGlpiFieldForQuestionType(questionForm.type, questionForm.glpiField),
				required: questionForm.required !== false,
				includeInAiContext: questionForm.includeInAiContext !== false,
				includeInReports: questionForm.includeInReports === true,
				maxInvalidAttempts: Number(questionForm.maxInvalidAttempts || 2),
				order: Number(questionForm.order || 0),
				active: questionForm.active !== false
			};

			if (questionForm.id) {
				await api.put(`/qualification-form-questions/${questionForm.id}`, payload);
			} else {
				await api.post("/qualification-form-questions", payload);
			}

			toast.success("Pergunta salva.");
			setQuestionForm(null);
			await load();
		} catch (err) {
			toastError(err);
		}
	};

	const deleteQuestion = async question => {
		if (!window.confirm("Deseja excluir esta pergunta?")) return;

		try {
			await api.delete(`/qualification-form-questions/${question.id}`);
			toast.success("Pergunta excluida.");
			if (questionForm?.id === question.id) setQuestionForm(null);
			await load();
		} catch (err) {
			toastError(err);
		}
	};

	const deleteForm = (event, item) => {
		event.stopPropagation();
		setDeleteFormTarget(item);
	};

	const confirmDeleteForm = async () => {
		const item = deleteFormTarget;
		if (!item) return;

		try {
			await api.delete(`/qualification-forms/${item.id}`);
			toast.success("Formulario excluido.");
			if (Number(selectedFormId) === Number(item.id)) {
				setSelectedFormId("");
				setFormSearch("");
				setFormEditorOpen(false);
				setForm({ ...emptyQualificationForm });
				setQuestionForm(null);
				setShowAdvancedQuestion(false);
			}
			setDeleteFormTarget(null);
			await load();
		} catch (err) {
			toastError(err);
		}
	};

	const saveQuickTag = async () => {
		const name = textValue(quickTagForm.name).trim();
		if (!name) {
			toast.info("Informe o nome da etiqueta.");
			return;
		}

		try {
			await api.post("/tags", {
				name,
				color: quickTagForm.color || "#607d8b",
				fixed: !!quickTagForm.fixed
			});
			const { data } = await api.get("/tags");
			setTags(safeArray(data));
			setQuickTagForm({ name: "", color: "#607d8b", fixed: false });
			setTagDialogOpen(false);
			toast.success("Etiqueta criada.");
		} catch (err) {
			toastError(err);
		}
	};

	const renderOptionTags = option => {
		const selected = parseListValue(option.tagRefs);
		if (!selected.length) return "Sem etiquetas";

		return selected
			.map(tagId => safeArray(tags).find(tag => String(tag.id) === String(tagId))?.name || `#${tagId}`)
			.join(", ");
	};

	const renderOptionRoute = option => {
		const action = option.nextAction || "NEXT";
		const actionLabel = qualificationRouteActions.find(item => item.value === action)?.label || "Continuar";
		if (action === "GOTO_QUESTION" && option.nextQuestionId) {
			const target = selectedFormQuestions.find(question => String(question.id) === String(option.nextQuestionId));
			return `${actionLabel}: ${target?.label || `pergunta #${option.nextQuestionId}`}`;
		}
		if (["TRANSFER_QUEUE", "START_AI"].includes(action) && option.targetQueueId) {
			const queue = safeArray(queues).find(item => String(item.id) === String(option.targetQueueId));
			return `${actionLabel}: ${queue?.name || `fila #${option.targetQueueId}`}`;
		}
		if (action === "OPEN_URA_OPTION" && option.uraOptionId) {
			const uraOption = safeArray(uraOptions).find(item => String(item.id) === String(option.uraOptionId));
			return `${actionLabel}: ${uraOption ? `${uraOption.optionKey} - ${uraOption.title}` : `opcao #${option.uraOptionId}`}`;
		}
		return actionLabel;
	};

	const getFormUsage = formId =>
		safeArray(uraOptions).filter(option =>
			Number(option.qualificationFormId) === Number(formId) &&
			(option.runQualificationFormBeforeAction === true || option.runQualificationFormBeforeAction === "true")
		);

	const selectedFormUsage = selectedFormId ? getFormUsage(selectedFormId) : [];
	const glpiEnabledForQuestion = questionForm && normalizeGlpiFieldForQuestionType(questionForm.type, questionForm.glpiField) !== "ignore";
	const selectedFormOption = safeArray(forms).find(item => Number(item.id) === Number(selectedFormId)) || null;
	const allowedGlpiEntityIds = parseNumericList(glpiCatalogs.settings?.glpiAllowedFormEntityIds);
	const glpiEntityLocationRules = parseGlpiEntityLocationRules(glpiCatalogs.settings?.glpiEntityLocationRules);
	const glpiEntityRuleIds = glpiEntityLocationRules.map(rule => Number(rule.entityId)).filter(item => Number.isInteger(item) && item > 0);
	const previewGlpiEntities = safeArray(glpiCatalogs.entities)
		.filter(item => glpiEntityRuleIds.length
			? glpiEntityRuleIds.includes(Number(item.glpiId))
			: (!allowedGlpiEntityIds.length || allowedGlpiEntityIds.includes(Number(item.glpiId))));
	const previewGlpiLocationContext = questionForm?.type === "glpi_location"
		? "A lista de localizacoes nao aparece nesta previa porque depende da entidade escolhida pelo cliente. No WhatsApp, o sistema usa as regras de localizacao por entidade configuradas no GLPI."
		: "";
	const previewGlpiOptions = questionForm?.type === "glpi_entity"
		? previewGlpiEntities
		: [];

	return (
		<>
		<Grid container spacing={2}>
			<Grid item xs={12}>
				<div className={classes.formBuilderToolbar}>
					<div />
					<div className={classes.formBuilderToolbarActions}>
							<Autocomplete
								style={{ minWidth: 340 }}
								options={safeArray(forms)}
								value={selectedFormOption}
								inputValue={formSearch}
								onInputChange={(event, value) => setFormSearch(value)}
								onChange={(event, value) => {
									if (value) {
										selectForm(value);
										setFormSearch(textValue(value.name));
									}
								}}
								getOptionLabel={option => textValue(option?.name)}
								getOptionSelected={(option, value) => Number(option.id) === Number(value.id)}
								filterOptions={(options, state) => {
									const search = normalizeSearchText(state.inputValue);
									if (!search) return options;
									return options.filter(item => [
										item.name,
										item.description,
										item.active === false ? "inativo" : "ativo",
										...getFormUsage(item.id).map(option => `${option.optionKey} ${option.title}`)
									].some(value => normalizeSearchText(value).includes(search)));
								}}
								noOptionsText={safeArray(forms).length ? "Nenhum formulario encontrado" : "Nenhum formulario cadastrado"}
								renderOption={option => {
									const usage = getFormUsage(option.id);
									const questionCount = safeArray(questions).filter(question => Number(question.formId) === Number(option.id)).length;
									return (
										<Grid container spacing={1} alignItems="center" wrap="nowrap">
											<Grid item xs>
												<Typography variant="subtitle2">{textValue(option.name)}</Typography>
												<Typography variant="caption" color="textSecondary">
													{option.active === false ? "Inativo" : "Ativo"} - {questionCount} pergunta(s) - {usage.length ? `${usage.length} vinculo(s) na URA` : "sem vinculo na URA"}
												</Typography>
											</Grid>
										</Grid>
									);
								}}
								renderInput={params => (
									<TextField
										{...params}
										variant="outlined"
										size="small"
										placeholder="Pesquisar ou selecionar formulario"
										InputProps={{
											...params.InputProps,
											startAdornment: (
												<>
													<InputAdornment position="start">
														<SearchIcon fontSize="small" />
													</InputAdornment>
													{params.InputProps.startAdornment}
												</>
											)
										}}
									/>
								)}
							/>
							<Button size="small" variant="outlined" color="primary" onClick={newForm}>
								Novo
							</Button>
					</div>
				</div>
			</Grid>

			<Grid item xs={12}>
				<div className={classes.formBuilderStack}>
				<Paper variant="outlined" className={classes.formBuilderCompactPanel}>
					{!formEditorOpen ? (
						<div className={classes.questionEmptyState}>
							<Typography variant="subtitle2">Nenhum formulario selecionado.</Typography>
							<Typography variant="body2" color="textSecondary" style={{ marginTop: 4 }}>
								Pesquise um formulario no cabecalho ou clique em Novo para comecar.
							</Typography>
						</div>
					) : (
					<>
					<div className={classes.formBuilderHeader}>
						<div>
							<Typography variant="h5">{textValue(form.name) || "Novo formulario"}</Typography>
							<Typography variant="caption" className={classes.formBuilderMuted}>
								{form.id ? "Configuracao do formulario selecionado." : "Preencha os dados para criar um formulario."}
							</Typography>
						</div>
						<div className={classes.formBuilderToolbarActions}>
							<FormControlLabel
								control={
									<Switch
										color="primary"
										checked={form.active !== false}
										onChange={event => {
											const checked = event.target.checked;
											setForm(prev => ({ ...emptyQualificationForm, ...(prev || {}), active: checked }));
										}}
									/>
								}
								label={form.active === false ? "Desativado" : "Ativado"}
							/>
							{selectedFormOption && (
								<IconButton aria-label="Excluir formulario" onClick={event => deleteForm(event, selectedFormOption)}>
									<DeleteOutlineIcon />
								</IconButton>
							)}
						</div>
					</div>
					<Grid container spacing={2} alignItems="flex-start">
						<Grid item xs={12} md={5}>
							<TextField
								fullWidth
								margin="dense"
								variant="outlined"
								label="Nome do formulario"
								value={textValue(form.name)}
								onChange={event => {
									const value = event.target.value;
									setForm(prev => ({ ...emptyQualificationForm, ...(prev || {}), name: value }));
								}}
							/>
						</Grid>
						<Grid item xs={12} md={7}>
							<TextField
								fullWidth
								margin="dense"
								variant="outlined"
								multiline
								rows={2}
								label="Descricao interna"
								value={textValue(form.description)}
								onChange={event => {
									const value = event.target.value;
									setForm(prev => ({ ...emptyQualificationForm, ...(prev || {}), description: value }));
								}}
							/>
						</Grid>
						<Grid item xs={12}>
							<TextField
								fullWidth
								margin="dense"
								variant="outlined"
								multiline
								rows={3}
								label="Mensagem de saudacao antes das perguntas"
								placeholder="Antes de iniciarmos seu atendimento, precisamos fazer algumas perguntas para entender seu perfil."
								helperText="Opcional. Quando preenchida, esta mensagem sera enviada antes da primeira pergunta do formulario."
								value={textValue(form.greetingMessage)}
								onChange={event => {
									const value = event.target.value;
									setForm(prev => ({ ...emptyQualificationForm, ...(prev || {}), greetingMessage: value }));
								}}
							/>
						</Grid>
						<Grid item xs={12} md={8}>
							<Typography variant="caption" display="block" color="textSecondary">
								{selectedFormQuestions.length} pergunta(s). {selectedFormUsage.length ? `${selectedFormUsage.length} vinculo(s) na URA.` : "Sem vinculo na URA."}
							</Typography>
							{selectedFormUsage.length > 0 && (
								<Typography variant="caption" display="block" color="textSecondary" style={{ marginTop: 8 }}>
									Usado em: {selectedFormUsage.map(option => `${option.optionKey} - ${option.title}`).join(", ")}
								</Typography>
							)}
						</Grid>
						<Grid item xs={12} md={4}>
							<Grid container spacing={1}>
								<Grid item xs>
									<Button fullWidth variant="contained" color="primary" onClick={saveForm} disabled={loading}>
										Salvar formulario
									</Button>
								</Grid>
							</Grid>
						</Grid>
					</Grid>
					</>
					)}
				</Paper>

				{formEditorOpen && (
				<Grid container spacing={2} alignItems="stretch">
					<Grid item xs={12}>
				<Paper variant="outlined" className={classes.formBuilderPanel}>
					<div className={classes.formBuilderHeader}>
						<div>
							<Typography variant="h6">Perguntas deste formulario</Typography>
							<Typography variant="caption" className={classes.formBuilderMuted}>
								{savingQuestionOrder ? "Salvando nova ordem..." : "Arraste as perguntas para mudar a sequencia enviada no WhatsApp."}
							</Typography>
						</div>
						<Button variant="contained" color="primary" onClick={newQuestion} disabled={!selectedFormId}>
							Adicionar pergunta
						</Button>
					</div>
					<div style={{ marginTop: 12 }}>
						{selectedFormQuestions.map(question => {
							const options = parseQuestionOptions(question.options);
							const typeOption = getQuestionTypeOption(question.type);
							const isDragging = Number(draggedQuestionId) === Number(question.id);
							return (
								<div
									key={question.id}
									className={`${classes.formBuilderItem} ${isDragging ? classes.formBuilderItemDragging : ""}`}
									onDragOver={event => {
										if (draggedQuestionId && !savingQuestionOrder) event.preventDefault();
									}}
									onDrop={event => {
										event.preventDefault();
										reorderQuestions(draggedQuestionId, question.id);
									}}
								>
									<Grid container spacing={1} alignItems="flex-start">
										<Grid item>
											<span
												className={classes.dragHandle}
												title="Arrastar pergunta"
												draggable={!savingQuestionOrder}
												onDragStart={event => {
													setDraggedQuestionId(question.id);
													event.dataTransfer.effectAllowed = "move";
													event.dataTransfer.setData("text/plain", String(question.id));
												}}
												onDragEnd={() => setDraggedQuestionId(null)}
											>
												<DragIndicatorIcon fontSize="small" />
											</span>
										</Grid>
										<Grid item xs>
											<Typography variant="subtitle2">
												{Number(question.order || 0)}. {textValue(question.label)}
											</Typography>
											<Typography variant="caption" color="textSecondary">
												{typeOption.label} - chave: {question.key}
											</Typography>
											<div className={classes.questionMetaRow}>
												<Chip size="small" variant="outlined" label={["single_choice", "multiple_choice"].includes(question.type) ? "Respostas configuradas" : "Resposta livre do cliente"} />
												<Chip size="small" variant="outlined" label={question.required === false ? "Opcional" : "Obrigatoria"} />
												<Chip size="small" variant="outlined" label={question.includeInReports === false ? "Fora dos relatorios" : "Vai para relatorio"} />
												{question.includeInAiContext !== false && (
													<Chip size="small" variant="outlined" label="Contexto da IA" />
												)}
												<Chip
													size="small"
													variant="outlined"
													color={normalizeGlpiFieldForQuestionType(question.type, question.glpiField) === "ignore" ? "default" : "primary"}
													label={getGlpiFieldLabel(question.type, question.glpiField)}
												/>
												{options.some(option => option.nextAction && option.nextAction !== "NEXT") && (
													<Chip size="small" variant="outlined" color="primary" label="Fluxo condicional" />
												)}
												{options.some(option => textValue(option.nextMessage).trim() || safeArray(option.nextMessages).length) && (
													<Chip size="small" variant="outlined" color="primary" label="Mensagem intermediaria" />
												)}
											</div>
											{options.length > 0 && (
												<div className={classes.inlineChips}>
													{options.map(option => (
														<Chip
															key={`${question.id}-${option.value}`}
															size="small"
															label={`Opcao ${option.value}: ${option.label}${option.nextAction && option.nextAction !== "NEXT" ? ` -> ${renderOptionRoute(option)}` : ""}`}
														/>
													))}
												</div>
											)}
										</Grid>
										<Grid item>
											<IconButton size="small" onClick={() => editQuestion(question)}>
												<EditIcon fontSize="small" />
											</IconButton>
											<IconButton size="small" onClick={() => deleteQuestion(question)}>
												<DeleteOutlineIcon fontSize="small" />
											</IconButton>
										</Grid>
									</Grid>
								</div>
							);
						})}
						{selectedFormId && !selectedFormQuestions.length && (
							<div className={classes.questionEmptyState}>
								<Typography variant="subtitle2">Este formulario ainda nao tem perguntas.</Typography>
								<Typography variant="body2" color="textSecondary" style={{ marginTop: 4 }}>
									Crie a primeira pergunta para montar a sequencia enviada na URA.
								</Typography>
								<Button variant="contained" color="primary" onClick={newQuestion} style={{ marginTop: 16 }}>
									Adicionar primeira pergunta
								</Button>
							</div>
						)}
						{!selectedFormId && (
							<div className={classes.questionEmptyState}>
								<Typography variant="subtitle2">Salve ou selecione um formulario.</Typography>
								<Typography variant="body2" color="textSecondary" style={{ marginTop: 4 }}>
									Depois disso voce podera adicionar perguntas e respostas.
								</Typography>
							</div>
						)}
					</div>
				</Paper>
			</Grid>

			<Dialog open={!!questionForm} onClose={() => setQuestionForm(null)} maxWidth="lg" fullWidth>
				<DialogTitle>{questionForm?.id ? "Editar pergunta" : "Nova pergunta"}</DialogTitle>
				<DialogContent dividers>
					{questionForm && (
						<>
							<TextField
								fullWidth
								margin="dense"
								variant="outlined"
								multiline
								rows={2}
								label="Pergunta enviada ao cliente"
								value={textValue(questionForm.label)}
								onChange={event => {
									const value = event.target.value;
									setQuestionField("label", value);
								}}
							/>
							<TextField
								select
								fullWidth
								margin="dense"
								variant="outlined"
								label="Tipo de resposta"
								value={getVisibleQuestionType(questionForm.type)}
								onChange={event => setQuestionField("type", event.target.value)}
								style={{ marginTop: 12 }}
							>
								{questionTypeOptions.map(option => (
									<MenuItem key={option.value} value={option.value}>
										{option.label}
									</MenuItem>
								))}
							</TextField>
							<Typography variant="caption" color="textSecondary" display="block" style={{ marginTop: 8 }}>
								{getQuestionTypeHelp(questionForm.type)}
							</Typography>

							<div className={classes.previewBox}>
								<div className={classes.formBuilderHeader}>
									<div>
										<Typography variant="subtitle2">GLPI automatico</Typography>
										<Typography variant="caption" color="textSecondary">
											Deixe desligado quando a resposta deve ficar apenas no historico, nos relatorios ou no contexto da IA.
										</Typography>
									</div>
									<FormControlLabel
										control={
											<Switch
												color="primary"
												checked={!!glpiEnabledForQuestion}
												onChange={event => {
													const checked = event.target.checked;
													setQuestionField("glpiField", checked ? getDefaultGlpiFieldForQuestionType(questionForm.type) : "ignore");
												}}
											/>
										}
										label={glpiEnabledForQuestion ? "Usar no GLPI" : "Nao usar"}
									/>
								</div>
								<Typography variant="body2" color="textSecondary">
									{glpiEnabledForQuestion
										? getGlpiQuestionUsageText(questionForm.type)
										: "Esta pergunta nao sera usada para abrir chamado GLPI automatico."}
								</Typography>
								{glpiChoiceQuestion && (
									<Typography variant="caption" color="textSecondary" display="block" style={{ marginTop: 8 }}>
										Esta pergunta apenas coleta o campo do chamado. O chamado GLPI e criado quando o formulario termina, se a integracao estiver em modo automatico.
									</Typography>
								)}
								{!["automatic", "hybrid"].includes(glpiCatalogs.settings?.glpiAutomationMode) && (
									<Typography variant="caption" color="error" display="block" style={{ marginTop: 8 }}>
										O modo automatico do GLPI esta desligado nas integracoes; neste caso o formulario nao abre chamado sozinho.
									</Typography>
								)}
							</div>

							<div className={classes.previewBox}>
								<Typography variant="subtitle2">Uso da resposta</Typography>
								<Grid container spacing={1}>
									<Grid item xs={12} sm={6}>
										<FormControlLabel
											control={<Switch color="primary" checked={questionForm.includeInReports !== false} onChange={event => {
												const checked = event.target.checked;
												setQuestionField("includeInReports", checked);
											}} />}
											label="Disponivel para relatorios"
										/>
									</Grid>
									<Grid item xs={12} sm={6}>
										<FormControlLabel
											control={<Switch color="primary" checked={questionForm.includeInAiContext !== false} onChange={event => {
												const checked = event.target.checked;
												setQuestionField("includeInAiContext", checked);
											}} />}
											label="Enviar como contexto para IA"
										/>
									</Grid>
								</Grid>
							</div>

							{manualChoiceQuestion && (
								<div className={classes.previewBox}>
									<Typography variant="subtitle2">Respostas como opcoes da URA</Typography>
									<Typography variant="caption" color="textSecondary">
										Cada linha vira Opcao 1, Opcao 2... e pode aplicar uma etiqueta quando escolhida.
									</Typography>
									{parseQuestionOptions(questionForm.options).map((option, index) => (
										<div key={index} className={classes.optionEditorRow}>
											<Grid container spacing={1} alignItems="center">
												<Grid item xs={12} sm={3}>
													<Chip color="primary" size="small" label={`Opcao ${index + 1}`} />
												</Grid>
												<Grid item xs={12} sm={9}>
													<TextField
														fullWidth
														margin="dense"
														variant="outlined"
														label="Resposta"
														value={textValue(option.label)}
														onChange={event => {
															const value = event.target.value;
															updateOption(index, { value: String(index + 1), label: value });
														}}
													/>
												</Grid>
												<Grid item xs={12}>
													<TagCheckboxPicker
														tags={safeArray(tags)}
														selectedIds={parseListValue(option.tagRefs)}
														label="Etiquetas aplicadas se escolher esta opcao"
														helperText={renderOptionTags(option)}
														onChange={value => updateOption(index, { tagRefs: value.map(String) })}
														onCreateTag={() => setTagDialogOpen(true)}
													/>
												</Grid>
												<Grid item xs={12}>
													<TextField
														select
														fullWidth
														margin="dense"
														variant="outlined"
														label="Depois desta resposta"
														value={option.nextAction || "NEXT"}
														onChange={event => {
															const value = event.target.value;
															updateOption(index, {
																nextAction: value,
																nextQuestionId: value === "GOTO_QUESTION" ? option.nextQuestionId : "",
																targetQueueId: ["TRANSFER_QUEUE", "START_AI"].includes(value) ? option.targetQueueId : "",
																uraOptionId: value === "OPEN_URA_OPTION" ? option.uraOptionId : ""
															});
														}}
														helperText={renderOptionRoute(option)}
													>
														{qualificationRouteActions.map(action => (
															<MenuItem key={action.value} value={action.value}>
																{action.label}
															</MenuItem>
														))}
													</TextField>
												</Grid>
												<Grid item xs={12}>
													<div className={classes.previewBox}>
														<div className={classes.formBuilderHeader}>
															<div>
																<Typography variant="subtitle2">Mensagens antes do destino</Typography>
																<Typography variant="caption" color="textSecondary">
																	Envie uma ou mais mensagens antes de ir para IA, fila, URA ou outra pergunta.
																</Typography>
															</div>
															<Button size="small" variant="outlined" color="primary" onClick={() => addOptionMessage(index)}>
																Adicionar
															</Button>
														</div>
														{safeArray(option.nextMessages).map((message, messageIndex) => (
															<div key={`${index}-${messageIndex}`} className={classes.optionEditorRow}>
																<TextField
																	fullWidth
																	margin="dense"
																	variant="outlined"
																	multiline
																	rows={2}
																	label={`Mensagem ${messageIndex + 1}`}
																	value={textValue(message.body)}
																	onChange={event => {
																		const value = event.target.value;
																		updateOptionMessage(index, messageIndex, { body: value });
																	}}
																/>
																<Grid container spacing={1} alignItems="center">
																	<Grid item xs>
																		<Typography variant="caption" color="textSecondary">
																			{message.mediaName || "Sem anexo"}
																		</Typography>
																	</Grid>
																	<Grid item>
																		<input
																			id={`qualification-option-media-${index}-${messageIndex}`}
																			type="file"
																			style={{ display: "none" }}
																			onChange={event => {
																				const file = event.target.files?.[0];
																				uploadOptionMessageMedia(index, messageIndex, file);
																				event.target.value = "";
																			}}
																		/>
																		<label htmlFor={`qualification-option-media-${index}-${messageIndex}`}>
																			<Button size="small" variant="outlined" color="primary" component="span">
																				Anexar
																			</Button>
																		</label>
																	</Grid>
																	{message.mediaUrl && (
																		<Grid item>
																			<Button
																				size="small"
																				variant="outlined"
																				onClick={() => updateOptionMessage(index, messageIndex, {
																					mediaUrl: "",
																					mediaType: "",
																					mediaName: ""
																				})}
																			>
																				Remover anexo
																			</Button>
																		</Grid>
																	)}
																	<Grid item>
																		<Button size="small" color="secondary" variant="outlined" onClick={() => removeOptionMessage(index, messageIndex)}>
																			Remover mensagem
																		</Button>
																	</Grid>
																</Grid>
															</div>
														))}
														{!safeArray(option.nextMessages).length && (
															<Typography variant="caption" color="textSecondary" display="block" style={{ marginTop: 8 }}>
																Nenhuma mensagem intermediaria. O destino sera executado diretamente.
															</Typography>
														)}
													</div>
												</Grid>
												{option.nextAction === "GOTO_QUESTION" && (
													<Grid item xs={12}>
														<TextField
															select
															fullWidth
															margin="dense"
															variant="outlined"
															label="Pergunta de destino"
															value={option.nextQuestionId || ""}
															onChange={event => {
																const value = event.target.value;
																updateOption(index, { nextQuestionId: value });
															}}
														>
															{selectedFormQuestions
																.filter(item => Number(item.id) !== Number(questionForm.id))
																.map(item => (
																	<MenuItem key={item.id} value={item.id}>
																		{Number(item.order || 0)}. {textValue(item.label)}
																	</MenuItem>
																))}
														</TextField>
													</Grid>
												)}
												{["TRANSFER_QUEUE", "START_AI"].includes(option.nextAction) && (
													<Grid item xs={12}>
														<TextField
															select
															fullWidth
															margin="dense"
															variant="outlined"
															label={option.nextAction === "START_AI" ? "Fila/IA de destino" : "Fila de destino"}
															value={option.targetQueueId || ""}
															onChange={event => {
																const value = event.target.value;
																updateOption(index, { targetQueueId: value });
															}}
															helperText={option.nextAction === "START_AI" ? "Se a fila tiver IA configurada, ela sera usada; se vazio, usa a acao original quando possivel." : "Obrigatorio para transferir direto para uma fila."}
														>
															<MenuItem value="">Usar destino padrao</MenuItem>
															{safeArray(queues).map(queue => (
																<MenuItem key={queue.id} value={queue.id}>
																	{textValue(queue.name)}
																</MenuItem>
															))}
														</TextField>
													</Grid>
												)}
												{option.nextAction === "OPEN_URA_OPTION" && (
													<Grid item xs={12}>
														<TextField
															select
															fullWidth
															margin="dense"
															variant="outlined"
															label="Opcao/submenu da URA"
															value={option.uraOptionId || ""}
															onChange={event => {
																const value = event.target.value;
																updateOption(index, { uraOptionId: value });
															}}
															helperText="Use para abrir diretamente uma opcao/submenu ja cadastrado na URA."
														>
															{safeArray(uraOptions).map(uraOption => (
																<MenuItem key={uraOption.id} value={uraOption.id}>
																	{uraOption.optionKey} - {textValue(uraOption.title)}
																</MenuItem>
															))}
														</TextField>
													</Grid>
												)}
												<Grid item xs={12}>
													<Button size="small" color="secondary" variant="outlined" onClick={() => removeOption(index)}>
														Remover opcao
													</Button>
												</Grid>
											</Grid>
										</div>
									))}
									<Button variant="outlined" color="primary" onClick={addOption} style={{ marginTop: 10 }}>
										Adicionar opcao
									</Button>
								</div>
							)}
							{glpiChoiceQuestion && (
								<div className={classes.previewBox}>
									<Typography variant="subtitle2">
										{questionForm.type === "glpi_entity" ? "Entidades GLPI como opcoes" : "Localizacoes por entidade"}
									</Typography>
									<Typography variant="body2" color="textSecondary">
										{questionForm.type === "glpi_entity"
											? "No WhatsApp, o cliente recebe uma lista numerada com as entidades configuradas nas regras."
											: previewGlpiLocationContext}
									</Typography>
									<Typography variant="caption" color="textSecondary" display="block" style={{ marginTop: 8 }}>
										Apos a resposta, o formulario segue para a proxima pergunta. A acao final acontece ao terminar o formulario.
									</Typography>
									{questionForm.type === "glpi_entity" && previewGlpiOptions.length > 0 ? (
										<div className={classes.inlineChips}>
											{previewGlpiOptions.slice(0, 8).map((option, index) => (
												<Chip
													key={`${questionForm.type}-${option.glpiId || option.id || index}`}
													size="small"
													label={`${index + 1}. ${getGlpiOptionLabel(option)}`}
												/>
											))}
											{previewGlpiOptions.length > 8 && (
												<Chip size="small" variant="outlined" label={`+${previewGlpiOptions.length - 8} opcoes`} />
											)}
										</div>
									) : questionForm.type === "glpi_entity" ? (
										<Typography variant="caption" color="textSecondary" display="block" style={{ marginTop: 8 }}>
											Nenhuma entidade sincronizada encontrada para as regras configuradas.
										</Typography>
									) : null}
								</div>
							)}
							{!manualChoiceQuestion && !glpiChoiceQuestion && (
								<div className={classes.previewBox}>
									<Typography variant="subtitle2">Resposta livre</Typography>
									<Typography variant="body2" color="textSecondary">
										Este tipo nao usa opcoes. A pergunta fica fixa e o cliente digita a resposta no WhatsApp.
									</Typography>
								</div>
							)}

							<div style={{ marginTop: 12 }}>
								<Button size="small" variant="outlined" onClick={() => setShowAdvancedQuestion(prev => !prev)}>
									{showAdvancedQuestion ? "Ocultar avancado" : "Mostrar avancado"}
								</Button>
							</div>
							{showAdvancedQuestion && (
								<Grid container spacing={1} style={{ marginTop: 8 }}>
									<Grid item xs={7}>
										<TextField
											fullWidth
											margin="dense"
											variant="outlined"
											label="Chave para relatorio"
											value={textValue(questionForm.key)}
											onChange={event => {
												const value = event.target.value;
												setQuestionField("key", normalizeFormKey(value));
											}}
										/>
									</Grid>
									<Grid item xs={5}>
										<TextField
											fullWidth
											margin="dense"
											variant="outlined"
											type="number"
											label="Ordem"
											value={textValue(questionForm.order)}
											onChange={event => {
												const value = event.target.value;
												setQuestionField("order", value);
											}}
										/>
									</Grid>
									<Grid item xs={12}>
										<FormControlLabel
											control={<Switch color="primary" checked={questionForm.required !== false} onChange={event => {
												const checked = event.target.checked;
												setQuestionField("required", checked);
											}} />}
											label="Obrigatoria"
										/>
									</Grid>
									<Grid item xs={12}>
										<TextField
											fullWidth
											margin="dense"
											variant="outlined"
											type="number"
											label="Tentativas invalidas antes de aceitar texto livre"
											value={textValue(questionForm.maxInvalidAttempts)}
											onChange={event => {
												const value = event.target.value;
												setQuestionField("maxInvalidAttempts", value);
											}}
										/>
									</Grid>
									<Grid item xs={12}>
										<FormControlLabel
											control={<Switch color="primary" checked={questionForm.active !== false} onChange={event => {
												const checked = event.target.checked;
												setQuestionField("active", checked);
											}} />}
											label="Pergunta ativa"
										/>
									</Grid>
								</Grid>
							)}

							<div className={classes.previewBox}>
								<Typography variant="subtitle2">Previa no WhatsApp</Typography>
								<Typography variant="body2">
									{textValue(questionForm.label) || "Pergunta ainda nao preenchida"}
								</Typography>
								{manualChoiceQuestion && parseQuestionOptions(questionForm.options).map((option, index) => (
									<div key={option.value}>
										<Typography variant="body2">
											<strong>{index + 1}</strong> - {option.label || "Opcao sem texto"}
										</Typography>
										{option.nextAction && option.nextAction !== "NEXT" && (
											<Typography variant="caption" color="textSecondary" display="block">
												Destino: {renderOptionRoute(option)}
											</Typography>
										)}
										{safeArray(option.nextMessages).map((message, messageIndex) => (
											<Typography key={`${option.value}-message-${messageIndex}`} variant="caption" color="textSecondary" display="block">
												Mensagem {messageIndex + 1}: {textValue(message.body).trim() || "Sem texto"}{message.mediaName ? ` + anexo: ${message.mediaName}` : ""}
											</Typography>
										))}
										{!safeArray(option.nextMessages).length && textValue(option.nextMessage).trim() && (
											<Typography variant="caption" color="textSecondary" display="block">
												Mensagem antes do destino: {textValue(option.nextMessage).trim()}
											</Typography>
										)}
									</div>
								))}
								{questionForm.type === "glpi_entity" && previewGlpiOptions.slice(0, 8).map((option, index) => (
									<Typography key={`${questionForm.type}-preview-${option.glpiId || option.id || index}`} variant="body2">
										<strong>{index + 1}</strong> - {getGlpiOptionLabel(option)}
									</Typography>
								))}
								{questionForm.type === "glpi_entity" && previewGlpiOptions.length > 8 && (
									<Typography variant="caption" color="textSecondary" display="block">
										...mais {previewGlpiOptions.length - 8} opcao(oes) sincronizada(s)
									</Typography>
								)}
								{questionForm.type === "glpi_entity" && !previewGlpiOptions.length && (
									<Typography variant="caption" color="textSecondary" display="block" style={{ marginTop: 8 }}>
										As entidades serao exibidas aqui depois de sincronizar o catalogo GLPI e configurar as regras.
									</Typography>
								)}
								{questionForm.type === "glpi_location" && (
									<Typography variant="caption" color="textSecondary" display="block" style={{ marginTop: 8 }}>
										As localizacoes serao exibidas no WhatsApp conforme a entidade escolhida pelo cliente e as regras configuradas.
									</Typography>
								)}
								{!manualChoiceQuestion && !glpiChoiceQuestion && (
									<Typography variant="caption" color="textSecondary" display="block" style={{ marginTop: 8 }}>
										Resposta do cliente: digitada livremente no WhatsApp.
									</Typography>
								)}
							</div>

							<Grid container spacing={1} style={{ marginTop: 12 }}>
								<Grid item xs>
									<Button fullWidth variant="contained" color="primary" onClick={saveQuestion}>
										Salvar pergunta
									</Button>
								</Grid>
								<Grid item>
									<Button variant="outlined" onClick={() => setQuestionForm(null)}>
										Cancelar
									</Button>
								</Grid>
							</Grid>
						</>
					)}
				</DialogContent>
			</Dialog>
				</Grid>
				)}
				</div>
		</Grid>
		</Grid>
		<Dialog open={!!deleteFormTarget} onClose={() => setDeleteFormTarget(null)} maxWidth="xs" fullWidth>
			<DialogTitle>Excluir formulario?</DialogTitle>
			<DialogContent>
				<Typography variant="body2">
					Deseja realmente excluir o formulario "{textValue(deleteFormTarget?.name)}"? As perguntas e respostas vinculadas tambem serao removidas.
				</Typography>
			</DialogContent>
			<DialogActions>
				<Button onClick={() => setDeleteFormTarget(null)} color="secondary">
					Cancelar
				</Button>
				<Button onClick={confirmDeleteForm} color="primary" variant="contained">
					Excluir
				</Button>
			</DialogActions>
		</Dialog>
		<Dialog open={tagDialogOpen} onClose={() => setTagDialogOpen(false)} maxWidth="xs" fullWidth>
			<DialogTitle>Nova etiqueta</DialogTitle>
			<DialogContent>
				<TextField
					fullWidth
					margin="dense"
					variant="outlined"
					label="Nome da etiqueta"
					value={quickTagForm.name}
					onChange={event => {
						const value = event.target.value;
						setQuickTagForm(prev => ({ ...prev, name: value }));
					}}
				/>
				<TextField
					fullWidth
					margin="dense"
					variant="outlined"
					type="color"
					label="Cor"
					InputLabelProps={{ shrink: true }}
					value={quickTagForm.color}
					onChange={event => {
						const value = event.target.value;
						setQuickTagForm(prev => ({ ...prev, color: value }));
					}}
				/>
				<FormControlLabel
					control={
						<Switch
							color="primary"
							checked={!!quickTagForm.fixed}
							onChange={event => {
								const checked = event.target.checked;
								setQuickTagForm(prev => ({ ...prev, fixed: checked }));
							}}
						/>
					}
					label="Etiqueta fixa"
				/>
			</DialogContent>
			<DialogActions>
				<Button onClick={() => setTagDialogOpen(false)} color="secondary">
					Cancelar
				</Button>
				<Button onClick={saveQuickTag} color="primary" variant="contained">
					Salvar etiqueta
				</Button>
			</DialogActions>
		</Dialog>
		</>
	);
};

const SettingTextField = ({ name, getSettingValue, onChangeSetting, ...props }) => {
	const [value, setValue] = useState("");

	useEffect(() => {
		setValue(getSettingValue(name) || "");
	}, [getSettingValue, name]);

	return (
		<TextField
			{...props}
			name={name}
			value={value}
			onChange={event => setValue(event.target.value)}
			onBlur={event => {
				if (event.target.value !== getSettingValue(name)) {
					onChangeSetting(event);
				}
			}}
		/>
	);
};

const GoogleCalendarOAuthSettings = ({ getSettingValue, onChangeSetting, classes }) => {
	const backendUrl = getBackendUrl() || `${window.location.protocol}//${window.location.hostname}:8085`;
	const suggestedRedirectUri = `${backendUrl.replace(/\/$/, "")}/calendar/google/callback`;
	const savedRedirectUri = getSettingValue("googleCalendarRedirectUri");

	return (
		<Paper className={classes.calendarSettingsPanel} variant="outlined">
			<div className={classes.calendarSettingsHeader}>
				<div>
					<Typography variant="h6">Configuração do Google Agenda</Typography>
					<Typography variant="body2" color="textSecondary">
						Informe os dados do aplicativo OAuth criado no Google Cloud. Depois use "Conectar com Google Agenda" para vincular a conta do cliente.
					</Typography>
				</div>
			</div>
			<Grid container spacing={2}>
				<Grid item xs={12} md={6}>
					<SettingTextField
						name="googleCalendarClientId"
						label="Google Client ID"
						variant="outlined"
						size="small"
						fullWidth
						getSettingValue={getSettingValue}
						onChangeSetting={onChangeSetting}
					/>
				</Grid>
				<Grid item xs={12} md={6}>
					<SettingTextField
						name="googleCalendarClientSecret"
						label="Google Client Secret"
						variant="outlined"
						size="small"
						fullWidth
						type="password"
						getSettingValue={getSettingValue}
						onChangeSetting={onChangeSetting}
						helperText="Depois de salvo, o segredo fica mascarado e criptografado no servidor."
					/>
				</Grid>
				<Grid item xs={12} md={8}>
					<SettingTextField
						name="googleCalendarRedirectUri"
						label="URL de callback"
						variant="outlined"
						size="small"
						fullWidth
						placeholder={suggestedRedirectUri}
						getSettingValue={getSettingValue}
						onChangeSetting={onChangeSetting}
						helperText="Cadastre exatamente esta URL no OAuth do Google Cloud."
					/>
				</Grid>
				<Grid item xs={12} md={4}>
					<SettingTextField
						name="googleCalendarScopes"
						label="Escopos"
						variant="outlined"
						size="small"
						fullWidth
						placeholder="https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email"
						getSettingValue={getSettingValue}
						onChangeSetting={onChangeSetting}
					/>
				</Grid>
				<Grid item xs={12}>
					<div className={classes.calendarCallbackBox}>
						<Typography variant="caption" color="textSecondary">
							Callback sugerido
						</Typography>
						<Typography variant="body2">
							{savedRedirectUri || suggestedRedirectUri}
						</Typography>
					</div>
				</Grid>
			</Grid>
		</Paper>
	);
};

const RichTextField = ({ label, value, onChange, required, helperText, classes }) => {
	const editorRef = useRef(null);

	useEffect(() => {
		if (editorRef.current && editorRef.current.innerHTML !== (value || "")) {
			editorRef.current.innerHTML = value || "";
		}
	}, [value]);

	const runCommand = (command, commandValue = null) => {
		editorRef.current?.focus();
		document.execCommand(command, false, commandValue);
		onChange(editorRef.current?.innerHTML || "");
	};

	const handlePaste = event => {
		event.preventDefault();
		const html = event.clipboardData.getData("text/html");
		const text = event.clipboardData.getData("text/plain");
		document.execCommand("insertHTML", false, html || plainTextToHtml(text));
		onChange(editorRef.current?.innerHTML || "");
	};

	return (
		<div>
			<Typography variant="caption" color="textSecondary">
				{label}{required ? " *" : ""}
			</Typography>
			<div className={classes.richEditorToolbar}>
				<Button className={classes.richEditorButton} size="small" variant="outlined" onClick={() => runCommand("bold")}>
					B
				</Button>
				<Button className={classes.richEditorButton} size="small" variant="outlined" onClick={() => runCommand("italic")}>
					I
				</Button>
				<Button className={classes.richEditorButton} size="small" variant="outlined" onClick={() => runCommand("insertUnorderedList")}>
					Lista
				</Button>
				<Button className={classes.richEditorButton} size="small" variant="outlined" onClick={() => runCommand("insertOrderedList")}>
					1. Lista
				</Button>
				<Button className={classes.richEditorButton} size="small" variant="outlined" onClick={() => runCommand("formatBlock", "p")}>
					Paragrafo
				</Button>
			</div>
			<div
				ref={editorRef}
				className={classes.richEditor}
				contentEditable
				suppressContentEditableWarning
				onInput={event => onChange(event.currentTarget.innerHTML)}
				onPaste={handlePaste}
			/>
			{helperText && (
				<Typography variant="caption" color="textSecondary">
					{helperText}
				</Typography>
			)}
		</div>
	);
};

const BrandLogoAdjustments = ({ getSettingValue, onChangeSetting }) => {
	const backendUrl = getBackendUrl() || "http://localhost:8085";
	const logo = getSettingValue("brandLogo");
	const persistedFit = getSettingValue("brandLogoFit") || "contain";
	const persistedPositionX = getSettingValue("brandLogoPositionX") || "50";
	const persistedPositionY = getSettingValue("brandLogoPositionY") || "50";
	const persistedScale = getSettingValue("brandLogoScale") || "1";
	const [fit, setFit] = useState("contain");
	const [positionX, setPositionX] = useState(50);
	const [positionY, setPositionY] = useState(50);
	const [scale, setScale] = useState(1);

	useEffect(() => {
		setFit(persistedFit);
		setPositionX(Number(persistedPositionX || 50));
		setPositionY(Number(persistedPositionY || 50));
		setScale(Number(persistedScale || 1));
	}, [persistedFit, persistedPositionX, persistedPositionY, persistedScale]);

	const saveSetting = (name, value) => {
		onChangeSetting({ target: { name, value: String(value) } });
	};

	if (!logo) return null;

	const imageStyle = {
		width: "100%",
		height: "100%",
		padding: 6,
		objectFit: fit,
		objectPosition: `${positionX}% ${positionY}%`,
		transform: `scale(${scale})`,
		transformOrigin: "center"
	};

	return (
		<Grid item xs={12}>
			<Typography variant="subtitle2" gutterBottom>
				Ajuste do logo na barra superior
			</Typography>
			<div style={{
				background: "#0B1220",
				borderRadius: 8,
				padding: 12,
				display: "flex",
				alignItems: "center",
				gap: 12,
				marginBottom: 12
			}}>
				<div style={{
					width: 136,
					height: 48,
					borderRadius: 8,
					background: "rgba(255,255,255,0.10)",
					overflow: "hidden"
				}}>
					<img src={`${backendUrl}${logo}`} alt="Previa do logo" style={imageStyle} />
				</div>
				<Typography variant="body2" style={{ color: "#FFFFFF", fontWeight: 700 }}>
					{getSettingValue("brandName") || "Rocket Service"}
				</Typography>
			</div>
			<Grid container spacing={2}>
				<Grid item xs={12} sm={6}>
					<TextField
						select
						fullWidth
						margin="dense"
						variant="outlined"
						label="Modo de exibicao"
						value={fit}
						onChange={event => {
							setFit(event.target.value);
							saveSetting("brandLogoFit", event.target.value);
						}}
					>
						<MenuItem value="contain">Conter imagem inteira</MenuItem>
						<MenuItem value="cover">Preencher espaco</MenuItem>
					</TextField>
				</Grid>
				<Grid item xs={12} sm={6}>
					<Typography variant="caption" color="textSecondary">Zoom</Typography>
					<Slider
						value={scale}
						min={0.5}
						max={3}
						step={0.05}
						onChange={(event, value) => setScale(value)}
						onChangeCommitted={(event, value) => saveSetting("brandLogoScale", value)}
					/>
				</Grid>
				<Grid item xs={12} sm={6}>
					<Typography variant="caption" color="textSecondary">Posicao horizontal</Typography>
					<Slider
						value={positionX}
						min={0}
						max={100}
						step={1}
						onChange={(event, value) => setPositionX(value)}
						onChangeCommitted={(event, value) => saveSetting("brandLogoPositionX", value)}
					/>
				</Grid>
				<Grid item xs={12} sm={6}>
					<Typography variant="caption" color="textSecondary">Posicao vertical</Typography>
					<Slider
						value={positionY}
						min={0}
						max={100}
						step={1}
						onChange={(event, value) => setPositionY(value)}
						onChangeCommitted={(event, value) => saveSetting("brandLogoPositionY", value)}
					/>
				</Grid>
			</Grid>
		</Grid>
	);
};

const GeneralSettings = ({
	onChangeSetting,
	getSettingValue,
	onUploadLogo,
	classes
}) => (
	<Container maxWidth="md">
		<Typography variant="body2" gutterBottom>
			{i18n.t("settings.title")}
		</Typography>

		<Typography variant="subtitle1" gutterBottom>
			Identidade do sistema
		</Typography>
		<Paper className={classes.generalPaper}>
			<Grid container spacing={2}>
				<Grid item xs={12} sm={6}>
					<SettingTextField
						fullWidth
						label="Nome do sistema"
						name="brandName"
						getSettingValue={getSettingValue}
						onChangeSetting={onChangeSetting}
						margin="dense"
						variant="outlined"
					/>
				</Grid>
				<Grid item xs={12}>
					<input
						accept="image/*"
						id="brand-logo-upload"
						type="file"
						style={{ display: "none" }}
						onChange={onUploadLogo}
					/>
					<label htmlFor="brand-logo-upload">
						<Button variant="outlined" component="span">
							Enviar logo
						</Button>
					</label>
					{getSettingValue("brandLogo") && (
						<img
							src={`${getBackendUrl() || "http://localhost:8085"}${getSettingValue("brandLogo")}`}
							alt="Logo"
							style={{ height: 36, marginLeft: 12, verticalAlign: "middle" }}
						/>
					)}
				</Grid>
				<BrandLogoAdjustments
					getSettingValue={getSettingValue}
					onChangeSetting={onChangeSetting}
				/>
			</Grid>
		</Paper>

		<Typography variant="subtitle1" gutterBottom>
			Dados da empresa
		</Typography>
		<Paper className={classes.generalPaper}>
			<Grid container spacing={2}>
				{[
					["companyFantasyName", "Nome fantasia"],
					["companyLegalName", "Razao social"],
					["companyCnpj", "CNPJ"],
					["companyAddress", "Endereco"],
					["companyPhone", "Telefone"],
					["companyEmail", "E-mail"],
					["companyWebsite", "Site"],
					["companyPix", "PIX"],
					["companyPaymentInfo", "Dados de pagamento"]
				].map(([name, label]) => (
					<Grid item xs={12} sm={name === "companyAddress" || name === "companyPaymentInfo" ? 12 : 6} key={name}>
						<SettingTextField
							fullWidth
							label={label}
							name={name}
							getSettingValue={getSettingValue}
							onChangeSetting={onChangeSetting}
							margin="dense"
							variant="outlined"
							multiline={name === "companyAddress" || name === "companyPaymentInfo"}
							rows={name === "companyAddress" || name === "companyPaymentInfo" ? 3 : 1}
						/>
					</Grid>
				))}
				<Grid item xs={12}>
					<Typography variant="caption" color="textSecondary">
						Esses dados ficam disponiveis como variaveis: {"{{empresa_nome}}"}, {"{{empresa_cnpj}}"}, {"{{empresa_endereco}}"}, {"{{empresa_pix}}"} e {"{{dados_pagamento}}"}.
					</Typography>
				</Grid>
			</Grid>
		</Paper>

		<Typography variant="subtitle1" gutterBottom>
			Horario de funcionamento da empresa
		</Typography>
		<Paper className={classes.generalPaper}>
			<CompanyBusinessHours
				modeValue={getSettingValue("companyBusinessHoursMode")}
				rulesValue={getSettingValue("companyBusinessHours")}
				messageValue={getSettingValue("companyUnavailableMessage")}
				onChangeSetting={onChangeSetting}
				classes={classes}
			/>
		</Paper>

		<Typography variant="subtitle1" gutterBottom>
			Status e inatividade dos atendentes
		</Typography>
		<Paper className={classes.generalPaper}>
			<Grid container spacing={2}>
				<Grid item xs={12} sm={6}>
					<Typography variant="body2">Ausencia automatica</Typography>
					<Select
						margin="dense"
						variant="outlined"
						native
						name="autoAwayEnabled"
						value={getSettingValue("autoAwayEnabled") || "false"}
						className={classes.settingOption}
						onChange={onChangeSetting}
					>
						<option value="false">Desativada</option>
						<option value="true">Ativada</option>
					</Select>
				</Grid>
				{getSettingValue("autoAwayEnabled") === "true" && (
					<Grid item xs={12} sm={6}>
						<SettingTextField
							fullWidth
							type="number"
							label="Marcar Ausente apos X minutos"
							name="autoAwayMinutes"
							getSettingValue={getSettingValue}
							onChangeSetting={onChangeSetting}
							margin="dense"
							variant="outlined"
						/>
					</Grid>
				)}
				<Grid item xs={12} sm={6}>
					<Typography variant="body2">Logoff automatico</Typography>
					<Select
						margin="dense"
						variant="outlined"
						native
						name="autoLogoutEnabled"
						value={getSettingValue("autoLogoutEnabled") || "false"}
						className={classes.settingOption}
						onChange={onChangeSetting}
					>
						<option value="false">Desativado</option>
						<option value="true">Ativado</option>
					</Select>
				</Grid>
				{getSettingValue("autoLogoutEnabled") === "true" && (
					<Grid item xs={12} sm={6}>
						<SettingTextField
							fullWidth
							type="number"
							label="Fazer logoff apos X minutos"
							name="autoLogoutMinutes"
							getSettingValue={getSettingValue}
							onChangeSetting={onChangeSetting}
							margin="dense"
							variant="outlined"
						/>
					</Grid>
				)}
				<Grid item xs={12} sm={6}>
					<Typography variant="body2">Aplicar para administradores</Typography>
					<Select
						margin="dense"
						variant="outlined"
						native
						name="inactivityAppliesToAdmins"
						value={getSettingValue("inactivityAppliesToAdmins") || "false"}
						className={classes.settingOption}
						onChange={onChangeSetting}
					>
						<option value="false">Nao</option>
						<option value="true">Sim</option>
					</Select>
				</Grid>
				<Grid item xs={12}>
					<Typography variant="caption" color="textSecondary">
						Online recebe novos atendimentos. Ausente e Offline ficam fora do balanceamento e do rodizio.
					</Typography>
				</Grid>
			</Grid>
		</Paper>
	</Container>
);

const ResourcePanel = ({ resource, classes }) => {
	const [rows, setRows] = useState([]);
	const [relations, setRelations] = useState({});
	const [modalOpen, setModalOpen] = useState(false);
	const [form, setForm] = useState({});
	const [mediaFile, setMediaFile] = useState(null);
	const [testingApi, setTestingApi] = useState(false);
	const [testingRowId, setTestingRowId] = useState(null);
	const [search, setSearch] = useState("");

	const loadRows = async () => {
		try {
			const params = resource.listKey ? { pageNumber: 1 } : undefined;
			const { data } = await api.get(resource.endpoint, { params });
			setRows(getRowsFromResponse(data, resource));
		} catch (err) {
			toastError(err);
		}
	};

	useEffect(() => {
		loadRows();
		setSearch("");
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [resource.endpoint]);

	useEffect(() => {
		const loadRelations = async () => {
			const relationNames = [
				...new Set(resource.fields.filter(field => field.relation).map(field => field.relation))
			];

			if (relationNames.length === 0) {
				setRelations({});
				return;
			}

			try {
				const nextRelations = {};
				await Promise.all(
					relationNames.map(async relationName => {
						const config = relationConfigs[relationName];
						if (!config) return;

						const { data } = await api.get(config.endpoint);
						nextRelations[relationName] = Array.isArray(data) ? data : [];
					})
				);
				setRelations(nextRelations);
			} catch (err) {
				toastError(err);
			}
		};

		loadRelations();
	}, [resource]);

	const openCreate = () => {
		const nextForm = {};
		resource.fields.forEach(field => {
			nextForm[field.name] = field.type === "tags" || field.type === "list"
				? ""
				: field.type === "multiSelect" || field.type === "multiRelation"
					? []
					: defaultValue(field);
		});
		if (resource.endpoint === "/ai-calendar-connections") {
			nextForm.provider = "google";
			nextForm.timezone = "America/Sao_Paulo";
			nextForm.active = true;
		}
		setForm(nextForm);
		setMediaFile(null);
		setModalOpen(true);
	};

	const openEdit = row => {
		const nextForm = {};
		resource.fields.forEach(field => {
			const rawValue = field.type === "richtext" && !row[field.name] && row.content
				? plainTextToHtml(row.content)
				: row[field.name];
			const value = rawValue === null || rawValue === undefined
				? defaultValue(field)
				: rawValue;
			nextForm[field.name] = field.type === "tags"
				? formatTagText(value)
				: field.type === "list"
					? formatListText(value)
					: field.type === "multiSelect" || field.type === "multiRelation"
						? parseListValue(value)
						: value;
		});
		nextForm.id = row.id;
		setForm(nextForm);
		setMediaFile(null);
		setModalOpen(true);
	};

	const handleChange = (name, value) => {
		setForm(prev => {
			const nextForm = {
				...prev,
				[name]: value
			};

			if (
				resource.endpoint === "/ai-settings" &&
				name === "provider"
			) {
				nextForm.model = defaultModelsByProvider[value] || "";
			}

			return nextForm;
		});
	};

	const removeTagValue = (fieldName, tag) => {
		setForm(prev => ({
			...prev,
			[fieldName]: parseTagText(prev[fieldName])
				.filter(item => item !== tag)
				.join(", ")
		}));
	};

	const commitTagValue = fieldName => {
		setForm(prev => ({
			...prev,
			[fieldName]: formatTagText(prev[fieldName])
		}));
	};

	const save = async () => {
		try {
			const payload = { ...form };
			resource.fields
				.filter(field => field.type === "tags")
				.forEach(field => {
					payload[field.name] = formatTagText(payload[field.name]);
				});

			const hasMedia = !!mediaFile;
			const requestBody = hasMedia ? buildMultipartPayload(payload, mediaFile) : payload;
			const requestConfig = hasMedia ? { headers: { "Content-Type": "multipart/form-data" } } : undefined;

			if (form.id) {
				await api.put(`${resource.endpoint}/${form.id}`, requestBody, requestConfig);
			} else {
				await api.post(resource.endpoint, requestBody, requestConfig);
			}

			toast.success("Registro salvo.");
			setModalOpen(false);
			loadRows();
		} catch (err) {
			if (resource.endpoint === "/knowledge-base") {
				toast.error("Nao foi possivel salvar as palavras-chave.");
			}
			toastError(err);
		}
	};

	const remove = async row => {
		if (!window.confirm("Deseja excluir este registro?")) return;

		try {
			await api.delete(`${resource.endpoint}/${row.id}`);
			toast.success("Registro excluido.");
			loadRows();
		} catch (err) {
			toastError(err);
		}
	};

	const testAiApi = async (row = form) => {
		if (!row?.id) {
			toast.info("Salve a configuracao antes de testar a API.");
			return;
		}

		setTestingApi(true);
		setTestingRowId(row.id);
		try {
			const { data } = await api.post(`${resource.endpoint}/${row.id}/test`);
			if (data.ok || data.success) {
				toast.success(
					data.responseText
						? `API da IA funcionando: ${data.responseText}`
						: data.message || "API da IA funcionando."
				);
			} else {
				const details = [data.errorMessage || data.message, data.statusCode ? `Status ${data.statusCode}` : "", data.code]
					.filter(Boolean)
					.join(" - ");
				toast.error(details || "A API da IA nao respondeu corretamente.");
			}
		} catch (err) {
			toastError(err);
		} finally {
			setTestingApi(false);
			setTestingRowId(null);
		}
	};

	const buildDownloadText = row => {
		if (resource.endpoint === "/ai-settings") {
			return [
				`Nome da IA: ${textValue(row.name)}`,
				`Empresa/servico: ${textValue(row.companyName)}`,
				`Tipo de atendimento: ${textValue(row.serviceType)}`,
				`Provedor: ${textValue(row.provider)}`,
				`Modelo: ${textValue(row.model)}`,
				"",
				"Como a IA deve se comportar:",
				textValue(row.behaviorPrompt),
				"",
				"Instrucoes adicionais:",
				textValue(row.systemPrompt)
			].join("\n");
		}

		if (resource.endpoint === "/knowledge-base") {
			return [
				`Titulo: ${textValue(row.title)}`,
				`Palavras-chave: ${formatTagText(row.tags)}`,
				"",
				htmlToPlainText(row.contentHtml || row.content)
			].join("\n");
		}

		return "";
	};

	const downloadRowText = row => {
		const prefix = resource.endpoint === "/ai-settings" ? "prompt-ia" : "base-conhecimento";
		const name = slugText(row.name || row.title || row.id);
		downloadTextFile(`${prefix}-${name}.txt`, buildDownloadText(row));
	};

	const fieldHelper = field => field.helperText ? (
		<Typography variant="caption" color="textSecondary">
			{field.helperText}
		</Typography>
	) : null;

	const renderCell = (row, col) => {
		const value = row[col];
		const field = getField(resource, col);

		if (typeof value === "boolean") return value ? "Sim" : "Nao";
		if (value === null || value === undefined) return "";
		if (field?.relation) {
			const items = relations[field.relation] || [];
			const config = relationConfigs[field.relation];
			const item = items.find(option => Number(option.id) === Number(value));
			return item && config ? config.getLabel(item) : `#${value}`;
		}
		if (field?.type === "multiSelect") {
			const selected = parseListValue(value);
			return selected
				.map(item => (field.options || []).find(option => option.value === item)?.label || item)
				.join(", ");
		}
		if (field?.type === "multiRelation") {
			const selected = parseListValue(value).map(Number);
			const items = relations[field.relation] || [];
			const config = relationConfigs[field.relation];
			return selected
				.map(id => {
					const item = items.find(option => Number(option.id) === Number(id));
					return item && config ? config.getLabel(item) : `#${id}`;
				})
				.join(", ");
		}
		if (field?.type === "tags") return parseTagText(value).join(", ");
		if (String(value).length > 80) return String(value).slice(0, 80) + "...";

		return String(value);
	};

	const isCalendarConnectionResource = resource.endpoint === "/ai-calendar-connections";
	const isGoogleCalendarForm = isCalendarConnectionResource && (form.provider || "google") === "google";

	const shouldRenderResourceField = field => {
		if (!shouldShowField(field, form)) return false;
		if (!isGoogleCalendarForm) return true;
		return !["accessToken", "refreshToken", "userPrincipalName"].includes(field.name);
	};

	const connectGoogleCalendar = async () => {
		try {
			const { data } = await api.get("/calendar/google/auth", {
				params: {
					connectionId: form.id || undefined,
					name: form.name || undefined
				}
			});
			if (!data?.authUrl) {
				toast.error("Nao foi possivel iniciar o OAuth do Google Agenda.");
				return;
			}
			window.location.href = data.authUrl;
		} catch (err) {
			toastError(err);
		}
	};

	const canSearch = searchableResourceEndpoints.includes(resource.endpoint);
	const visibleRows = canSearch && search.trim()
		? rows.filter(row => normalizeSearchText(getSearchableRowText(row, resource)).includes(normalizeSearchText(search)))
		: rows;

	const searchField = canSearch ? (
		<TextField
			variant="outlined"
			size="small"
			placeholder={`Pesquisar ${resource.label.toLowerCase()}`}
			value={search}
			onChange={event => setSearch(event.target.value)}
			InputProps={{
				startAdornment: (
					<InputAdornment position="start">
						<SearchIcon fontSize="small" />
					</InputAdornment>
				)
			}}
		/>
	) : null;

	const renderAuditLog = () => (
		<>
			<div className={classes.header}>
				<div>
					<Typography variant="h6">{resource.label}</Typography>
					<Typography variant="body2" color="textSecondary">
						Resumo das alteracoes administrativas feitas no sistema.
					</Typography>
				</div>
				{searchField}
			</div>
			{visibleRows.map(row => {
				const beforeData = parseAuditData(row.beforeData);
				const afterData = parseAuditData(row.afterData);
				const action = auditActionLabels[row.action] || { label: row.action || "Alteracao", color: "default" };
				const resourceName = auditResourceLabels[row.resource] || row.resource || "registro";
				const objectName = getAuditObjectName(beforeData, afterData, row);
				const changes = getAuditChanges(row);

				return (
					<div key={row.id} className={classes.auditItem}>
						<div className={classes.auditSummary}>
							<div>
								<Typography variant="subtitle2">
									{row.displayMessage || `${row.userName || "Sistema"} ${String(action.label).toLowerCase()} ${resourceName} "${objectName}"`}
								</Typography>
								<Typography variant="caption" color="textSecondary">
									{formatAuditDate(row.createdAt)} - {row.userProfile || "perfil nao informado"}
								</Typography>
							</div>
							<Chip size="small" color={action.color} label={action.label} />
						</div>
						<div className={classes.auditChanges}>
							{changes.length ? changes.map(change => (
								<Typography key={`${row.id}-${change.field}`} variant="body2">
									<strong>{change.field}:</strong>{" "}
									{row.action === "update"
										? `de "${change.before}" para "${change.after}"`
										: row.action === "delete"
											? change.before
											: change.after}
								</Typography>
							)) : (
								<Typography variant="body2" color="textSecondary">
									Nenhum campo relevante para exibir.
								</Typography>
							)}
						</div>
					</div>
				);
			})}
			{visibleRows.length === 0 && (
				<Typography variant="body2" color="textSecondary">
					Nenhum registro encontrado.
				</Typography>
			)}
		</>
	);

	if (resource.endpoint === "/audit-logs") {
		return renderAuditLog();
	}

	return (
		<>
			<div className={classes.header}>
				<Typography variant="h6">{resource.label}</Typography>
				<div className={classes.formBuilderToolbarActions}>
					{searchField}
					{!resource.readOnly && (
						<Button variant="contained" color="primary" onClick={openCreate}>
							Novo
						</Button>
					)}
				</div>
			</div>

			<div className={classes.tableWrapper}>
				<Table size="small">
					<TableHead>
						<TableRow>
							{resource.columns.map(col => (
								<TableCell key={col}>{getColumnLabel(resource, col)}</TableCell>
							))}
							{!resource.readOnly && <TableCell align="right">Acoes</TableCell>}
						</TableRow>
					</TableHead>

					<TableBody>
						{visibleRows.map(row => (
							<TableRow key={row.id}>
								{resource.columns.map(col => (
									<TableCell key={col}>{renderCell(row, col)}</TableCell>
								))}
								{!resource.readOnly && (
									<TableCell align="right">
										{resource.endpoint === "/ai-settings" && (
											<IconButton
												size="small"
												title="Testar API da IA"
												onClick={() => testAiApi(row)}
												disabled={testingRowId === row.id}
											>
												<PlayArrowIcon />
											</IconButton>
										)}
										{["/ai-settings", "/knowledge-base"].includes(resource.endpoint) && (
											<IconButton
												size="small"
												title="Baixar TXT"
												onClick={() => downloadRowText(row)}
											>
												<CloudDownloadIcon />
											</IconButton>
										)}
										<IconButton size="small" onClick={() => openEdit(row)}>
											<EditIcon />
										</IconButton>
										<IconButton size="small" onClick={() => remove(row)}>
											<DeleteOutlineIcon />
										</IconButton>
									</TableCell>
								)}
							</TableRow>
						))}

						{visibleRows.length === 0 && (
							<TableRow>
								<TableCell colSpan={resource.columns.length + (resource.readOnly ? 0 : 1)}>
									Nenhum registro encontrado.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			<Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="md" fullWidth>
				<DialogTitle>{form.id ? "Editar" : "Novo"} {resource.title}</DialogTitle>

				<DialogContent>
					<Grid container spacing={2}>
						{isGoogleCalendarForm && (
							<Grid item xs={12}>
								<Button variant="outlined" color="primary" onClick={connectGoogleCalendar}>
									Conectar com Google Agenda
								</Button>
								<Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
									O login do Google salva os tokens com seguranca no servidor. Nao cole access token ou refresh token manualmente.
								</Typography>
							</Grid>
						)}
						{resource.fields.filter(field => shouldRenderResourceField(field)).map(field => (
							<Grid item xs={12} sm={field.multiline || field.type === "richtext" ? 12 : 6} key={field.name}>
								{field.type === "boolean" ? (
									<>
										<FormControlLabel
											control={
												<Switch
													checked={!!form[field.name]}
													onChange={event => handleChange(field.name, event.target.checked)}
													color="primary"
												/>
											}
											label={field.label}
										/>
										{fieldHelper(field)}
									</>
								) : field.type === "multiSelect" || field.type === "multiRelation" ? (
									<>
										<TextField
											select
											fullWidth
											margin="dense"
											variant="outlined"
											label={field.label}
											value={Array.isArray(form[field.name]) ? form[field.name] : parseListValue(form[field.name])}
											onChange={event => handleChange(field.name, event.target.value)}
											SelectProps={{
												multiple: true,
												renderValue: selected => (
													(Array.isArray(selected) ? selected : [])
														.map(value => {
															if (field.type === "multiSelect") {
																return (field.options || []).find(option => option.value === value)?.label || value;
															}
															const config = relationConfigs[field.relation];
															const item = (relations[field.relation] || []).find(option => Number(option.id) === Number(value));
															return item && config ? config.getLabel(item) : `#${value}`;
														})
														.join(", ")
												)
											}}
										>
											{field.type === "multiSelect"
												? (field.options || []).map(option => (
													<MenuItem key={option.value} value={option.value}>
														<Checkbox checked={(form[field.name] || []).indexOf(option.value) > -1} />
														{option.label}
													</MenuItem>
												))
												: (relations[field.relation] || []).map(option => (
													<MenuItem key={option.id} value={String(option.id)}>
														<Checkbox checked={(form[field.name] || []).map(String).indexOf(String(option.id)) > -1} />
														{relationConfigs[field.relation]?.getLabel(option) || option.id}
													</MenuItem>
												))}
										</TextField>
										{fieldHelper(field)}
									</>
								) : field.type === "select" || field.type === "relation" ? (
									<>
										<TextField
											select
											fullWidth
											margin="dense"
											variant="outlined"
											label={field.label}
											value={form[field.name] || ""}
											onChange={event => handleChange(field.name, event.target.value)}
										>
											{field.type === "relation" && (field.nullable || !field.required) && (
												<MenuItem value="">&nbsp;</MenuItem>
											)}

											{field.type === "relation"
												? (relations[field.relation] || []).map(option => (
													<MenuItem key={option.id} value={option.id}>
														{relationConfigs[field.relation]?.getLabel(option) || option.id}
													</MenuItem>
												))
												: (field.options || []).map(option => (
													<MenuItem key={option.value} value={option.value}>
														{option.label}
													</MenuItem>
												))}
										</TextField>
										{fieldHelper(field)}
									</>
								) : field.type === "tags" ? (
									<>
										<TextField
											fullWidth
											margin="dense"
											variant="outlined"
											label={field.label}
											placeholder="Ex: valor, orçamento, pacote"
											value={form[field.name] || ""}
											onChange={event => handleChange(field.name, event.target.value)}
											onBlur={() => commitTagValue(field.name)}
											onKeyDown={event => {
												if (event.key !== "Enter") return;
												event.preventDefault();
												commitTagValue(field.name);
											}}
											helperText="Use virgula para separar palavras-chave ou pressione Enter para confirmar."
										/>
										<div style={{ marginTop: 8 }}>
											{parseTagText(form[field.name]).map(tag => (
												<Chip
													key={tag}
													size="small"
													label={tag}
													onDelete={() => removeTagValue(field.name, tag)}
													style={{ margin: 2 }}
												/>
											))}
										</div>
										{fieldHelper(field)}
									</>
								) : field.type === "richtext" ? (
									<RichTextField
										label={field.label}
										value={form[field.name] || ""}
										onChange={value => handleChange(field.name, value)}
										required={!!field.required}
										helperText={field.helperText}
										classes={classes}
									/>
								) : field.readOnly ? (
									<TextField
										fullWidth
										margin="dense"
										variant="outlined"
										label={field.label}
										value={mediaFile?.name || form[field.name] || ""}
										disabled
									/>
								) : field.template ? (
									<>
										<MessageTemplateField
											label={field.label}
											name={field.name}
											value={form[field.name] || ""}
											onChange={event => handleChange(field.name, event.target.value)}
											rows={field.multiline ? 4 : 1}
											required={!!field.required}
											onMediaChange={field.media ? setMediaFile : undefined}
											mediaName={field.media ? (mediaFile?.name || form[field.name.replace("Message", "MediaName")] || form.welcomeMediaName || form.responseMediaName) : undefined}
										/>
										{fieldHelper(field)}
									</>
								) : (
									<>
										<TextField
											fullWidth
											margin="dense"
											variant="outlined"
											label={field.label}
											type={
												field.type === "number"
													? "number"
													: field.type === "color"
														? "color"
														: "text"
											}
											multiline={!!field.multiline}
											rows={field.multiline ? 4 : 1}
											required={!!field.required}
											InputLabelProps={field.type === "color" ? { shrink: true } : undefined}
											value={form[field.name] || ""}
											onChange={event => handleChange(field.name, event.target.value)}
										/>
										{fieldHelper(field)}
									</>
								)}
							</Grid>
						))}
					</Grid>
				</DialogContent>

				<DialogActions>
					{resource.endpoint === "/ai-settings" && (
						<Button
							onClick={() => testAiApi()}
							color="primary"
							variant="outlined"
							disabled={testingApi || !form.id}
						>
							{testingApi ? "Testando..." : "Testar API"}
						</Button>
					)}
					<Button onClick={() => setModalOpen(false)} color="secondary">
						Cancelar
					</Button>
					<Button onClick={save} color="primary" variant="contained">
						Salvar
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
};

const Settings = () => {
	const classes = useStyles();
	const { user } = useContext(AuthContext);
	const isAdmin = user?.profile === "admin";
	const isSupervisor = user?.profile === "supervisor";
	const supervisorBaseTabs = groupedSettingsTabs.filter(item =>
		item.type === "resource" && supervisorSettingsEndpoints.includes(item.resource?.endpoint)
	);
	const specialSettingsTabs = buildSpecialSettingsTabs(user?.specialPermissions);
	const visibleSettingsTabs = isAdmin
		? groupedSettingsTabs
		: isSupervisor
		? uniqueSettingsTabs([...supervisorBaseTabs, ...specialSettingsTabs])
		: specialSettingsTabs;

	const [settings, setSettings] = useState([]);
	const [tab, setTab] = useState(0);
	const [groupTabs, setGroupTabs] = useState({ ura: 0, ia: 0, aiAudit: 0, forms: 0 });

	useEffect(() => {
		if (!isAdmin) return;

		const fetchSession = async () => {
			try {
				const { data } = await api.get("/settings");
				setSettings(data);
			} catch (err) {
				toastError(err);
			}
		};
		fetchSession();
	}, [isAdmin]);

	useEffect(() => {
		const socket = openSocket();

		socket.on("settings", data => {
			if (data.action === "update") {
				setSettings(prevState => {
					const aux = [...prevState];
					const settingIndex = aux.findIndex(s => s.key === data.setting.key);
					if (settingIndex !== -1) aux[settingIndex] = data.setting;
					else aux.push(data.setting);
					return aux;
				});
			}
		});

		return () => {
			socket.disconnect();
		};
	}, []);

	const handleChangeSetting = async e => {
		const selectedValue = e.target.value;
		const settingKey = e.target.name;

		try {
			const { data } = await api.put(`/settings/${settingKey}`, {
				value: selectedValue
			});
			setSettings(prevState => {
				const next = [...prevState];
				const index = next.findIndex(setting => setting.key === data.key);
				if (index !== -1) next[index] = data;
				else next.push(data);
				return next;
			});
			toast.success(i18n.t("settings.success"));
		} catch (err) {
			toastError(err);
		}
	};

	const handleUploadLogo = async event => {
		const file = event.target.files?.[0];
		if (!file) return;

		const formData = new FormData();
		formData.append("logo", file);

		try {
			const { data } = await api.post("/settings/logo", formData);
			setSettings(prevState => {
				const next = [...prevState];
				const index = next.findIndex(setting => setting.key === data.key);
				if (index !== -1) next[index] = data;
				else next.push(data);
				return next;
			});
			toast.success("Logo atualizado.");
		} catch (err) {
			toastError(err);
		}
	};

	const getSettingValue = key => {
		const setting = settings.find(s => s.key === key);
		return setting ? setting.value : "";
	};

	const activeTab = visibleSettingsTabs[tab] || visibleSettingsTabs[0];
	const activeGroupIndex = activeTab?.type === "group" ? groupTabs[activeTab.groupKey] || 0 : 0;
	const activeGroupChild = activeTab?.type === "group" ? activeTab.children[activeGroupIndex] : null;
	const activeResource = activeTab?.type === "resource" ? activeTab.resource : activeGroupChild?.resource;

	return (
		<Container maxWidth={false} className={classes.root}>
			<div className={classes.pageHeader}>
				<div>
					<Typography variant="h5">Configurações</Typography>
					<Typography variant="body2" className={classes.sectionSubtitle}>
						Cadastros administrativos, URA, IA, etiquetas e personalização visual.
					</Typography>
				</div>
			</div>
			<Tabs
				value={tab}
				indicatorColor="primary"
				textColor="primary"
				onChange={(event, value) => setTab(value)}
				className={classes.navTabs}
				variant="scrollable"
				scrollButtons="auto"
			>
				{visibleSettingsTabs.map(item => (
					<Tab key={item.label} label={item.label} />
				))}
			</Tabs>

			<Paper className={classes.contentPaper} variant="outlined">
				{!activeTab ? (
					<Typography variant="body2" color="textSecondary">
						Nenhuma permissao especial de configuracao foi habilitada para este usuario.
					</Typography>
				) : activeTab.type === "general" ? (
					<GeneralSettings
						onChangeSetting={handleChangeSetting}
						getSettingValue={getSettingValue}
						onUploadLogo={handleUploadLogo}
						classes={classes}
					/>
				) : activeTab.type === "uraTree" ? (
					<UraTreePanel classes={classes} />
				) : activeTab.type === "group" ? (
					<>
						<Tabs
							value={activeGroupIndex}
							indicatorColor="primary"
							textColor="primary"
							onChange={(event, value) => {
								setGroupTabs(prev => ({ ...prev, [activeTab.groupKey]: value }));
							}}
							className={classes.navTabs}
							variant="scrollable"
							scrollButtons="auto"
						>
							{activeTab.children.map(child => (
								<Tab key={child.label} label={child.label} />
							))}
						</Tabs>
						{activeGroupChild?.type === "qualificationForms" ? (
							<QualificationFormsBoundary>
								<QualificationFormsPanel classes={classes} />
							</QualificationFormsBoundary>
						) : (
							<>
								{activeResource?.endpoint === "/ai-calendar-connections" && (
									<GoogleCalendarOAuthSettings
										getSettingValue={getSettingValue}
										onChangeSetting={handleChangeSetting}
										classes={classes}
									/>
								)}
								<ResourcePanel resource={activeResource} classes={classes} />
							</>
						)}
					</>
				) : (
					<>
						{activeResource?.endpoint === "/ai-calendar-connections" && (
							<GoogleCalendarOAuthSettings
								getSettingValue={getSettingValue}
								onChangeSetting={handleChangeSetting}
								classes={classes}
							/>
						)}
						<ResourcePanel resource={activeResource} classes={classes} />
					</>
				)}
			</Paper>
		</Container>
	);
};

export default Settings;

