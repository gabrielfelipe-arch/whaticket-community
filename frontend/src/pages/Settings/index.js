import React, { useState, useEffect } from "react";
import openSocket from "../../services/socket-io";

import {
	Button,
	Container,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
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
		marginBottom: theme.spacing(2)
	},
	generalPaper: {
		padding: theme.spacing(2),
		display: "flex",
		alignItems: "center",
		marginBottom: theme.spacing(2)
	},
	settingOption: {
		marginLeft: "auto"
	},
	tableWrapper: {
		overflowX: "auto"
	},
	contentPaper: {
		padding: theme.spacing(2),
		borderRadius: 6
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
			{ name: "farewellMessage", label: "Mensagem de encerramento", multiline: true },
			{ name: "sendFarewellMessage", label: "Enviar mensagem ao encerrar", type: "boolean" },
			{ name: "active", label: "Ativo", type: "boolean" }
		],
		columns: ["id", "name", "sendFarewellMessage", "active"]
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
			{ name: "color", label: "Cor", type: "color" }
		],
		columns: ["id", "name", "color"]
	},
	{
		label: "URA - Fluxos",
		endpoint: "/ura-flows",
		title: "Fluxo de URA",
		fields: [
			{ name: "name", label: "Nome", required: true },
			{ name: "description", label: "Descricao", multiline: true },
			{ name: "welcomeMessage", label: "Mensagem inicial", multiline: true, required: true },
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
			{ name: "optionKey", label: "Opcao digitada. Ex: 1", required: true },
			{ name: "title", label: "Titulo", required: true },
			{ name: "responseMessage", label: "Mensagem de resposta", multiline: true },
			{
				name: "action",
				label: "Acao",
				type: "select",
				options: [
					{ value: "SEND_MESSAGE", label: "Enviar mensagem" },
					{ value: "TRANSFER_QUEUE", label: "Transferir para fila" },
					{ value: "START_AI", label: "Acionar IA" },
					{ value: "HUMAN", label: "Encaminhar para humano" }
				]
			},
			{ name: "targetQueueId", label: "Fila destino", type: "relation", relation: "queues", nullable: true },
			{ name: "order", label: "Ordem", type: "number" },
			{ name: "active", label: "Ativo", type: "boolean" }
		],
		columns: ["id", "flowId", "optionKey", "title", "action", "targetQueueId", "active"]
	},
	{
		label: "IA",
		endpoint: "/ai-settings",
		title: "Configuracao de IA",
		fields: [
			{ name: "name", label: "Nome" },
			{
				name: "provider",
				label: "Provedor",
				type: "select",
				options: [
					{ value: "openai", label: "OpenAI" },
					{ value: "gemini", label: "Gemini" },
					{ value: "deepseek", label: "DeepSeek" }
				]
			},
			{ name: "model", label: "Modelo" },
			{ name: "apiKey", label: "Chave da API" },
			{ name: "systemPrompt", label: "Prompt do sistema", multiline: true },
			{ name: "temperature", label: "Temperatura", type: "number" },
			{ name: "maxTokens", label: "Maximo de tokens", type: "number" },
			{ name: "transferToHumanOnFailure", label: "Transferir para humano se falhar", type: "boolean" },
			{ name: "active", label: "Ativo", type: "boolean" }
		],
		columns: ["id", "name", "provider", "model", "active"]
	},
	{
		label: "Base de conhecimento",
		endpoint: "/knowledge-base",
		title: "Artigo da base",
		fields: [
			{ name: "title", label: "Titulo", required: true },
			{ name: "content", label: "Conteudo", multiline: true, required: true },
			{ name: "tags", label: "Palavras-chave" },
			{ name: "active", label: "Ativo", type: "boolean" }
		],
		columns: ["id", "title", "tags", "active"]
	}
];

const defaultModelsByProvider = {
	openai: "gpt-4o-mini",
	gemini: "gemini-2.5-flash",
	deepseek: "deepseek-chat"
};

const defaultValue = field => {
	if (field.type === "boolean") return true;
	if (field.type === "number") return "";
	if (field.name === "fallbackQueueId") return "";
	if (field.name === "targetQueueId") return "";
	if (field.name === "provider") return "openai";
	if (field.name === "model") return defaultModelsByProvider.openai;
	if (field.name === "action") return "SEND_MESSAGE";
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
	}
};

const getField = (resource, name) => {
	return resource.fields.find(field => field.name === name);
};

const getColumnLabel = (resource, col) => {
	const field = getField(resource, col);
	return field?.label || col;
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
			Personalizacao
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
				<Grid item xs={12} sm={3}>
					<SettingTextField
						fullWidth
						type="color"
						label="Cor principal"
						name="primaryColor"
						getSettingValue={getSettingValue}
						onChangeSetting={onChangeSetting}
						margin="dense"
						variant="outlined"
						InputLabelProps={{ shrink: true }}
					/>
				</Grid>
				<Grid item xs={12} sm={3}>
					<SettingTextField
						fullWidth
						type="color"
						label="Cor secundaria"
						name="secondaryColor"
						getSettingValue={getSettingValue}
						onChangeSetting={onChangeSetting}
						margin="dense"
						variant="outlined"
						InputLabelProps={{ shrink: true }}
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
			nextForm[field.name] = defaultValue(field);
		});
		setForm(nextForm);
		setModalOpen(true);
	};

	const openEdit = row => {
		const nextForm = {};
		resource.fields.forEach(field => {
			nextForm[field.name] =
				row[field.name] === null || row[field.name] === undefined
					? defaultValue(field)
					: row[field.name];
		});
		nextForm.id = row.id;
		setForm(nextForm);
		setModalOpen(true);
	};

	const handleChange = (name, value) => {
		setForm(prev => {
			const nextForm = { ...prev, [name]: value };

			if (
				resource.endpoint === "/ai-settings" &&
				name === "provider" &&
				(!prev.model || Object.values(defaultModelsByProvider).includes(prev.model))
			) {
				nextForm.model = defaultModelsByProvider[value] || "";
			}

			return nextForm;
		});
	};

	const save = async () => {
		try {
			if (form.id) {
				await api.put(`${resource.endpoint}/${form.id}`, form);
			} else {
				await api.post(resource.endpoint, form);
			}

			toast.success("Registro salvo.");
			setModalOpen(false);
			loadRows();
		} catch (err) {
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
		if (String(value).length > 80) return String(value).slice(0, 80) + "...";

		return String(value);
	};

	return (
		<>
			<div className={classes.header}>
				<Typography variant="h6">{resource.label}</Typography>
				<Button variant="contained" color="primary" onClick={openCreate}>
					Novo
				</Button>
			</div>

			<div className={classes.tableWrapper}>
				<Table size="small">
					<TableHead>
						<TableRow>
							{resource.columns.map(col => (
								<TableCell key={col}>{getColumnLabel(resource, col)}</TableCell>
							))}
							<TableCell align="right">Acoes</TableCell>
						</TableRow>
					</TableHead>

					<TableBody>
						{rows.map(row => (
							<TableRow key={row.id}>
								{resource.columns.map(col => (
									<TableCell key={col}>{renderCell(row, col)}</TableCell>
								))}
								<TableCell align="right">
									<IconButton size="small" onClick={() => openEdit(row)}>
										<EditIcon />
									</IconButton>
									<IconButton size="small" onClick={() => remove(row)}>
										<DeleteOutlineIcon />
									</IconButton>
								</TableCell>
							</TableRow>
						))}

						{rows.length === 0 && (
							<TableRow>
								<TableCell colSpan={resource.columns.length + 1}>
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
						{resource.fields.map(field => (
							<Grid item xs={12} sm={field.multiline ? 12 : 6} key={field.name}>
								{field.type === "boolean" ? (
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
								) : field.type === "select" || field.type === "relation" ? (
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
								) : (
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
								)}
							</Grid>
						))}
					</Grid>
				</DialogContent>

				<DialogActions>
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
