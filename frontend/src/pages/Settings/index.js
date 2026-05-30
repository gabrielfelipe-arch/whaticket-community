import React, { useState, useEffect, useRef } from "react";
import openSocket from "../../services/socket-io";

import {
	Button,
	Container,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Chip,
	FormControlLabel,
	Grid,
	IconButton,
	MenuItem,
	Paper,
	Select,
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
import EditIcon from "@material-ui/icons/Edit";
import { toast } from "react-toastify";

import api from "../../services/api";
import { i18n } from "../../translate/i18n.js";
import toastError from "../../errors/toastError";
import MessageTemplateField from "../../components/MessageTemplateField";

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
	sectionSubtitle: {
		color: theme.palette.text.secondary,
		marginTop: theme.spacing(0.5)
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
					{ value: "BACK_PREVIOUS", label: "Voltar ao menu anterior" },
					{ value: "BACK_ROOT", label: "Voltar ao menu inicial" }
				]
			},
			{ name: "targetQueueId", label: "Fila destino", type: "relation", relation: "queues", nullable: true, showWhen: form => ["TRANSFER_QUEUE", "HUMAN", "START_AI"].includes(form.action) },
			{
				name: "aiHumanHandoffEnabled",
				label: "Permitir que a IA chame atendente",
				type: "boolean",
				helperText: "Use quando esta opcao da URA acionar IA e a IA puder transferir o cliente para atendimento humano."
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
				label: "Ativar encerramento por inatividade",
				type: "boolean",
				helperText: "Use quando esta opcao da URA acionar IA e o atendimento puder ser encerrado se o cliente parar de responder."
			},
			{
				name: "aiAutoCloseMinutes",
				label: "Tempo sem resposta para encerrar",
				type: "number",
				helperText: "Informe quantos minutos a IA deve aguardar sem resposta do cliente antes de encerrar. Ex: 30."
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
				helperText: "Escolha o motivo usado quando esta opcao da URA encerrar automaticamente pela IA."
			},
			{
				name: "aiAutoCloseOnlyIfNotHandedOff",
				label: "Encerrar somente se nao foi encaminhado",
				type: "boolean",
				helperText: "Mantem o encerramento automatico apenas para atendimentos que continuam com a IA."
			},
			{
				name: "aiHandoffAlertEnabled",
				label: "Avisar outro WhatsApp quando a IA transferir",
				type: "boolean",
				helperText: "Use quando esta opção da URA acionar IA e você quiser avisar um número ou grupo específico ao transferir para atendente."
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
		label: "IA",
		endpoint: "/ai-settings",
		title: "Configuracao de IA",
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
		columns: ["id", "createdAt", "userName", "userProfile", "action", "resource", "resourceId", "route"],
		readOnly: true
	}
];

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

const defaultValue = field => {
	if (field.name === "fixed") return false;
	if (field.name === "aiHumanHandoffEnabled") return false;
	if (field.name === "aiHandoffAlertEnabled") return false;
	if (field.name === "aiAutoCloseEnabled") return false;
	if (field.name === "aiAutoCloseOnlyIfNotHandedOff") return true;
	if (field.name === "aiAutoCloseReasonId") return "";
	if (field.name === "aiQueueId") return "";
	if (field.name === "confirmationMaxAttempts") return 2;
	if (field.type === "boolean") return true;
	if (field.type === "number") return "";
	if (field.type === "richtext") return "";
	if (field.name === "fallbackQueueId") return "";
	if (field.name === "targetQueueId") return "";
	if (field.name === "aiHumanHandoffQueueId") return "";
	if (field.name === "aiAutoCloseMinutes") return "";
	if (field.name === "provider") return "openai";
	if (field.name === "model") return defaultModelsByProvider.openai;
	if (field.name === "action") return "SEND_MESSAGE";
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
	}
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
		return form.action === "START_AI" && !!form.aiHumanHandoffEnabled;
	}

	if (["aiAutoCloseMinutes", "aiAutoCloseMessage", "aiAutoCloseReasonId", "aiAutoCloseOnlyIfNotHandedOff"].includes(field.name)) {
		return form.action === "START_AI" && !!form.aiAutoCloseEnabled;
	}

	if (["aiHandoffAlertTo", "aiHandoffAlertMessage"].includes(field.name)) {
		return form.action === "START_AI" && !!form.aiHandoffAlertEnabled;
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

const GeneralSettings = ({
	settings,
	onChangeSetting,
	getSettingValue,
	onUploadLogo,
	classes
}) => (
	<Container maxWidth="sm">
		<Typography variant="body2" gutterBottom>
			{i18n.t("settings.title")}
		</Typography>
		<Paper className={classes.generalPaper}>
			<Typography variant="body1">
				{i18n.t("settings.settings.userCreation.name")}
			</Typography>
			<Select
				margin="dense"
				variant="outlined"
				native
				id="userCreation-setting"
				name="userCreation"
				value={settings && settings.length > 0 ? getSettingValue("userCreation") : ""}
				className={classes.settingOption}
				onChange={onChangeSetting}
			>
				<option value="enabled">
					{i18n.t("settings.settings.userCreation.options.enabled")}
				</option>
				<option value="disabled">
					{i18n.t("settings.settings.userCreation.options.disabled")}
				</option>
			</Select>
		</Paper>

		<Paper className={classes.generalPaper}>
			<TextField
				id="api-token-setting"
				InputProps={{ readOnly: true }}
				label="Token Api"
				margin="dense"
				variant="outlined"
				fullWidth
				value={settings && settings.length > 0 ? getSettingValue("userApiToken") : ""}
			/>
		</Paper>

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
							src={`http://localhost:8085${getSettingValue("brandLogo")}`}
							alt="Logo"
							style={{ height: 36, marginLeft: 12, verticalAlign: "middle" }}
						/>
					)}
				</Grid>
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
			GLPI
		</Typography>
		<Paper className={classes.generalPaper}>
			<Typography variant="body1">Integração GLPI</Typography>
			<Select
				margin="dense"
				variant="outlined"
				native
				name="glpiEnabled"
				value={getSettingValue("glpiEnabled") || "disabled"}
				className={classes.settingOption}
				onChange={onChangeSetting}
			>
				<option value="disabled">Desativada</option>
				<option value="enabled">Ativada</option>
			</Select>
		</Paper>
		<Paper className={classes.generalPaper}>
			<Grid container spacing={2}>
				<Grid item xs={12}>
					<SettingTextField
						fullWidth
						label="URL da API GLPI"
						name="glpiApiUrl"
						getSettingValue={getSettingValue}
						onChangeSetting={onChangeSetting}
						margin="dense"
						variant="outlined"
						placeholder="https://glpi.exemplo.com/apirest.php"
					/>
				</Grid>
				<Grid item xs={12} sm={6}>
					<SettingTextField
						fullWidth
						type="password"
						label="App Token"
						name="glpiAppToken"
						getSettingValue={getSettingValue}
						onChangeSetting={onChangeSetting}
						margin="dense"
						variant="outlined"
					/>
				</Grid>
				<Grid item xs={12} sm={6}>
					<SettingTextField
						fullWidth
						type="password"
						label="User Token"
						name="glpiUserToken"
						getSettingValue={getSettingValue}
						onChangeSetting={onChangeSetting}
						margin="dense"
						variant="outlined"
					/>
				</Grid>
				<Grid item xs={12} sm={6}>
					<SettingTextField
						fullWidth
						label="ID da entidade"
						name="glpiEntityId"
						getSettingValue={getSettingValue}
						onChangeSetting={onChangeSetting}
						margin="dense"
						variant="outlined"
					/>
				</Grid>
				<Grid item xs={12} sm={6}>
					<SettingTextField
						fullWidth
						label="ID da categoria GLPI"
						name="glpiCategoryId"
						getSettingValue={getSettingValue}
						onChangeSetting={onChangeSetting}
						margin="dense"
						variant="outlined"
					/>
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
			nextForm[field.name] = field.type === "tags" ? "" : defaultValue(field);
		});
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
			nextForm[field.name] = field.type === "tags" ? formatTagText(value) : value;
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

	const testAiApi = async () => {
		if (!form.id) {
			toast.info("Salve a configuracao antes de testar a API.");
			return;
		}

		setTestingApi(true);
		try {
			const { data } = await api.post(`${resource.endpoint}/${form.id}/test`);
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
		}
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
		if (field?.type === "tags") return parseTagText(value).join(", ");
		if (String(value).length > 80) return String(value).slice(0, 80) + "...";

		return String(value);
	};

	return (
		<>
			<div className={classes.header}>
				<Typography variant="h6">{resource.label}</Typography>
				{!resource.readOnly && (
					<Button variant="contained" color="primary" onClick={openCreate}>
						Novo
					</Button>
				)}
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
						{rows.map(row => (
							<TableRow key={row.id}>
								{resource.columns.map(col => (
									<TableCell key={col}>{renderCell(row, col)}</TableCell>
								))}
								{!resource.readOnly && (
									<TableCell align="right">
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

						{rows.length === 0 && (
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
						{resource.fields.filter(field => shouldShowField(field, form)).map(field => (
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
							onClick={testAiApi}
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

	const [settings, setSettings] = useState([]);
	const [tab, setTab] = useState(0);

	useEffect(() => {
		const fetchSession = async () => {
			try {
				const { data } = await api.get("/settings");
				setSettings(data);
			} catch (err) {
				toastError(err);
			}
		};
		fetchSession();
	}, []);

	useEffect(() => {
		const socket = openSocket();

		socket.on("settings", data => {
			if (data.action === "update") {
				setSettings(prevState => {
					const aux = [...prevState];
					const settingIndex = aux.findIndex(s => s.key === data.setting.key);
					if (settingIndex !== -1) aux[settingIndex].value = data.setting.value;
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
			await api.put(`/settings/${settingKey}`, {
				value: selectedValue
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

	return (
		<Container maxWidth={false} className={classes.root}>
			<div className={classes.pageHeader}>
				<div>
					<Typography variant="h5">Configurações</Typography>
					<Typography variant="body2" className={classes.sectionSubtitle}>
						Cadastros administrativos, integrações, URA, IA, etiquetas e personalização visual.
					</Typography>
				</div>
			</div>
			<Tabs
				value={tab}
				indicatorColor="primary"
				textColor="primary"
				onChange={(event, value) => setTab(value)}
				className={classes.tabs}
				variant="scrollable"
				scrollButtons="auto"
			>
				<Tab label="Geral" />
				{resources.map(item => (
					<Tab key={item.endpoint} label={item.label} />
				))}
			</Tabs>

			<Paper className={classes.contentPaper} variant="outlined">
				{tab === 0 ? (
					<GeneralSettings
						settings={settings}
						onChangeSetting={handleChangeSetting}
						getSettingValue={getSettingValue}
						onUploadLogo={handleUploadLogo}
						classes={classes}
					/>
				) : (
					<ResourcePanel resource={resources[tab - 1]} classes={classes} />
				)}
			</Paper>
		</Container>
	);
};

export default Settings;
