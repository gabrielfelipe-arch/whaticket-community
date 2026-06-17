import React, { useState, useEffect } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";
import Switch from "@material-ui/core/Switch";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Grid from "@material-ui/core/Grid";
import Checkbox from "@material-ui/core/Checkbox";
import Typography from "@material-ui/core/Typography";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { IconButton, InputAdornment, Popover } from "@material-ui/core";
import { Colorize } from "@material-ui/icons";
import { GithubPicker } from "react-color";
import MessageTemplateField from "../MessageTemplateField";

const businessWeekdayOptions = [
	{ value: 1, label: "Seg" },
	{ value: 2, label: "Ter" },
	{ value: 3, label: "Qua" },
	{ value: 4, label: "Qui" },
	{ value: 5, label: "Sex" },
	{ value: 6, label: "Sab" },
	{ value: 0, label: "Dom" },
];

const distributionModes = [
	{
		value: "manual_free",
		label: "Manual livre",
		help: "Os atendimentos ficam aguardando e qualquer atendente Online pode aceitar.",
	},
	{
		value: "manual_limit",
		label: "Manual com limite",
		help: "Os atendentes aceitam manualmente, mas respeitam o limite maximo de atendimentos ativos.",
	},
	{
		value: "manual_balanced",
		label: "Manual balanceado",
		help: "O sistema pode bloquear ou alertar se houver outro atendente Online com menos atendimentos.",
	},
	{
		value: "auto_least_load",
		label: "Automatico por menor carga",
		help: "O sistema entrega automaticamente para quem tem menos atendimentos ativos.",
	},
	{
		value: "round_robin",
		label: "Rodizio",
		help: "O sistema distribui automaticamente em sequencia entre atendentes Online.",
	},
	{
		value: "least_load_round_robin",
		label: "Menor carga + rodizio",
		help: "Prioriza quem tem menos atendimentos. Em empate, usa rodizio.",
	},
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
		display: "flex",
		flexWrap: "wrap",
	},
	textField: {
		marginRight: theme.spacing(1),
		flex: 1,
	},

	btnWrapper: {
		position: "relative",
	},

	buttonProgress: {
		color: green[500],
		position: "absolute",
		top: "50%",
		left: "50%",
		marginTop: -12,
		marginLeft: -12,
	},
	formControl: {
		margin: theme.spacing(1),
		minWidth: 120,
	},
	colorAdorment: {
		width: 20,
		height: 20,
	},
	colorPicker: {
		padding: theme.spacing(1),
	},
}));

const QueueSchema = Yup.object().shape({
	name: Yup.string()
		.min(2, "Too Short!")
		.max(50, "Too Long!")
		.required("Required"),
	color: Yup.string().min(3, "Too Short!").max(9, "Too Long!").required(),
});

const QueueModal = ({ open, onClose, queueId }) => {
	const classes = useStyles();

	const initialState = {
		name: "",
		color: "",
		useAI: false,
		aiSettingId: "",
		businessHoursMode: "always",
		businessHoursEnabled: false,
		businessHours: "",
		businessHoursRules: [defaultBusinessHoursRule()],
		unavailableMessage: "",
		distributionMode: "manual_free",
		maxActiveTicketsPerUser: "",
		balanceAction: "ignore",
		overflowAction: "keep_waiting",
		sendQueuePositionMessage: false,
		queuePositionMessage: "Atendimento nº {{ticketId}} criado com sucesso.\n\nVocê foi encaminhado para a fila {{queueName}}.\nSua posição atual é: {{position}}º.\n\nAguarde, em breve um atendente irá te chamar.",
		blockIfUserHasStalledTicket: false,
		stalledTicketMinutes: "",
		stalledTicketAction: "ignore",
		glpiEnabled: false,
	};

	const [queue, setQueue] = useState(initialState);
	const [mediaFile, setMediaFile] = useState(null);
	const [aiSettings, setAiSettings] = useState([]);
	const [colorPickerAnchor, setColorPickerAnchor] = useState(null);
	const colors = [
		"#B80000", "#DB3E00", "#FCCB00", "#008B02", "#006B76", "#1273DE",
		"#004DCF", "#5300EB", "#EB9694", "#FAD0C3", "#FEF3BD", "#C1E1C5",
		"#BEDADC", "#C4DEF6", "#BED3F3", "#D4C4FB", "#4D4D4D", "#999999",
		"#FFFFFF", "#F44E3B", "#FE9200", "#FCDC00", "#DBDF00", "#A4DD00",
		"#68CCCA", "#73D8FF", "#AEA1FF", "#FDA1FF", "#333333", "#808080",
		"#cccccc", "#D33115", "#E27300", "#FCC400", "#B0BC00", "#68BC00",
		"#16A5A5", "#009CE0", "#7B64FF", "#FA28FF", "#666666", "#B3B3B3",
		"#9F0500", "#C45100", "#FB9E00", "#808900", "#194D33", "#0C797D",
		"#0062B1", "#653294", "#AB149E"
	];

	useEffect(() => {
		const fetchAiSettings = async () => {
			try {
				const { data } = await api.get("/ai-settings");
				setAiSettings(data.filter(setting => setting.active !== false));
			} catch (err) {
				toastError(err);
			}
		};

		if (open) fetchAiSettings();
	}, [open]);

	useEffect(() => {
		(async () => {
			if (!queueId) return;
			try {
				const { data } = await api.get(`/queue/${queueId}`);
				setQueue(prevState => {
					return {
						...prevState,
						...data,
						aiSettingId: data.aiSettingId || "",
						businessHoursMode: data.businessHoursMode || (data.businessHoursEnabled ? "custom" : "always"),
						businessHoursRules: parseBusinessHours(data.businessHours),
						maxActiveTicketsPerUser: data.maxActiveTicketsPerUser || "",
						stalledTicketMinutes: data.stalledTicketMinutes || "",
					};
				});
			} catch (err) {
				toastError(err);
			}
		})();

		return () => {
			setQueue(initialState);
		};
	}, [queueId, open]);

	const handleClose = () => {
		onClose();
		setQueue(initialState);
		setColorPickerAnchor(null);
	};

	const handleSaveQueue = async values => {
		try {
			const { businessHoursRules, ...formValues } = values;
			const queueData = {
				...formValues,
				aiSettingId: values.useAI && values.aiSettingId ? values.aiSettingId : null,
				businessHoursMode: values.businessHoursMode || "always",
				businessHoursEnabled: values.businessHoursMode !== "always",
				businessHours: values.businessHoursMode === "custom" ? serializeBusinessHours(businessHoursRules) : "",
				maxActiveTicketsPerUser: values.maxActiveTicketsPerUser || "",
				stalledTicketMinutes: values.blockIfUserHasStalledTicket ? values.stalledTicketMinutes : "",
				queuePositionMessage: values.sendQueuePositionMessage ? values.queuePositionMessage : "",
			};
			const payload = new FormData();
			Object.entries(queueData).forEach(([key, value]) => {
				if (value !== undefined && value !== null) payload.append(key, value);
			});
			if (mediaFile) payload.append("media", mediaFile);
			const config = { headers: { "Content-Type": "multipart/form-data" } };
			if (queueId) {
				await api.put(`/queue/${queueId}`, payload, config);
			} else {
				await api.post("/queue", payload, config);
			}
			toast.success("Queue saved successfully");
			handleClose();
		} catch (err) {
			toastError(err);
		}
	};

	return (
		<div className={classes.root}>
			<Dialog open={open} onClose={handleClose} scroll="paper">
				<DialogTitle>
					{queueId
						? `${i18n.t("queueModal.title.edit")}`
						: `${i18n.t("queueModal.title.add")}`}
				</DialogTitle>
				<Formik
					initialValues={queue}
					enableReinitialize={true}
					validationSchema={QueueSchema}
					onSubmit={(values, actions) => {
						setTimeout(() => {
							handleSaveQueue(values);
							actions.setSubmitting(false);
						}, 400);
					}}
				>
					{({ touched, errors, isSubmitting, values, setFieldValue }) => (
						<Form>
							<DialogContent dividers>
								<Field
									as={TextField}
									label={i18n.t("queueModal.form.name")}
									autoFocus
									name="name"
									error={touched.name && Boolean(errors.name)}
									helperText={touched.name && errors.name}
									variant="outlined"
									margin="dense"
									className={classes.textField}
								/>
								<Field
									as={TextField}
									label={i18n.t("queueModal.form.color")}
									name="color"
									id="color"
									onClick={event => setColorPickerAnchor(event.currentTarget)}
									inputProps={{ readOnly: true }}
									error={touched.color && Boolean(errors.color)}
									helperText={touched.color && errors.color}
									InputLabelProps={{ shrink: true }}
									InputProps={{
										startAdornment: (
											<InputAdornment position="start">
												<div
													style={{ backgroundColor: values.color }}
													className={classes.colorAdorment}
												></div>
											</InputAdornment>
										),
										endAdornment: (
											<IconButton
												size="small"
												color="default"
												onClick={event => {
													event.stopPropagation();
													setColorPickerAnchor(event.currentTarget);
												}}
											>
												<Colorize />
											</IconButton>
										)
									}}
									variant="outlined"
									margin="dense"
								/>
								<Popover
									open={Boolean(colorPickerAnchor)}
									anchorEl={colorPickerAnchor}
									onClose={() => setColorPickerAnchor(null)}
									anchorOrigin={{
										vertical: "bottom",
										horizontal: "left",
									}}
									transformOrigin={{
										vertical: "top",
										horizontal: "left",
									}}
								>
									<div className={classes.colorPicker}>
										<GithubPicker
											width="250px"
											triangle="hide"
											color={values.color || "#607d8b"}
											colors={colors}
											onChange={color => {
												setFieldValue("color", color.hex);
												setQueue(prev => ({ ...prev, ...values, color: color.hex }));
												setColorPickerAnchor(null);
											}}
										/>
									</div>
								</Popover>
								<FormControlLabel
									control={
										<Field
											as={Switch}
											color="primary"
											name="useAI"
											checked={values.useAI}
										/>
									}
									label="Usar IA nesta fila"
								/>
								<FormControlLabel
									control={
										<Field
											as={Switch}
											color="primary"
											name="glpiEnabled"
											checked={values.glpiEnabled}
										/>
									}
									label="Permitir abertura de chamado GLPI nesta fila"
								/>
								<Field
									as={TextField}
									select
									fullWidth
									disabled={!values.useAI}
									label="Configuracao de IA"
									name="aiSettingId"
									variant="outlined"
									margin="dense"
								>
									<MenuItem value="">Selecione</MenuItem>
									{aiSettings.map(setting => (
										<MenuItem key={setting.id} value={setting.id}>
											{setting.name}
										</MenuItem>
									))}
								</Field>
								<Field
									as={TextField}
									select
									fullWidth
									label="Horario de funcionamento"
									name="businessHoursMode"
									variant="outlined"
									margin="dense"
								>
									<MenuItem value="always">Sempre aberto</MenuItem>
									<MenuItem value="company">Usar horario da empresa</MenuItem>
									<MenuItem value="custom">Horario proprio desta fila</MenuItem>
								</Field>
								{values.businessHoursMode === "company" && (
									<Typography variant="caption" color="textSecondary">
										Esta fila seguira o horario configurado em Configuracoes &gt; Geral &gt; Horario de funcionamento da empresa.
									</Typography>
								)}
								{values.businessHoursMode === "custom" && (
									<>
										<Typography variant="subtitle2" style={{ marginTop: 8 }}>
											Horario proprio desta fila
										</Typography>
										<Typography variant="caption" color="textSecondary">
											Configure um ou mais periodos. Fora desses horarios, o sistema envia a mensagem de indisponibilidade.
										</Typography>
										{(values.businessHoursRules || []).map((rule, index) => (
											<div key={index} style={{ marginTop: 12, padding: 12, border: "1px solid #E2E8F0", borderRadius: 8 }}>
												<Grid container spacing={1} alignItems="center">
													<Grid item xs={12}>
														<Typography variant="caption">Dias deste periodo</Typography>
														<div>
															{businessWeekdayOptions.map(day => (
																<FormControlLabel
																	key={day.value}
																	control={
																		<Checkbox
																			color="primary"
																			checked={(rule.days || []).map(Number).includes(day.value)}
																			onChange={() => {
																				const rules = [...values.businessHoursRules];
																				const currentDays = (rules[index].days || []).map(Number);
																				const exists = currentDays.includes(day.value);
																				rules[index] = {
																					...rules[index],
																					days: exists
																						? currentDays.filter(item => item !== day.value)
																						: [...currentDays, day.value].sort()
																				};
																				setFieldValue("businessHoursRules", rules);
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
																const rules = [...values.businessHoursRules];
																rules[index] = { ...rules[index], start: event.target.value };
																setFieldValue("businessHoursRules", rules);
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
																const rules = [...values.businessHoursRules];
																rules[index] = { ...rules[index], end: event.target.value };
																setFieldValue("businessHoursRules", rules);
															}}
															InputLabelProps={{ shrink: true }}
														/>
													</Grid>
													<Grid item xs={12} sm={4}>
														<Button
															fullWidth
															variant="outlined"
															color="secondary"
															disabled={(values.businessHoursRules || []).length <= 1}
															onClick={() => {
																setFieldValue(
																	"businessHoursRules",
																	values.businessHoursRules.filter((_, ruleIndex) => ruleIndex !== index)
																);
															}}
														>
															Remover periodo
														</Button>
													</Grid>
												</Grid>
											</div>
										))}
										<Button
											style={{ marginTop: 8 }}
											variant="outlined"
											color="primary"
											onClick={() => setFieldValue("businessHoursRules", [...(values.businessHoursRules || []), defaultBusinessHoursRule()])}
										>
											Adicionar periodo
										</Button>
										<MessageTemplateField
											formik
											label="Mensagem de indisponibilidade"
											name="unavailableMessage"
											rows={4}
											onMediaChange={setMediaFile}
											mediaName={mediaFile?.name || values.unavailableMediaName}
										/>
									</>
								)}
								<Typography variant="subtitle2" style={{ marginTop: 16 }}>
									Distribuicao e balanceamento
								</Typography>
								<Typography variant="caption" color="textSecondary">
									Apenas atendentes com status Online entram na distribuicao. Ausentes e Offline nao recebem novos atendimentos.
								</Typography>
								<Field
									as={TextField}
									select
									fullWidth
									label="Modo de distribuicao"
									name="distributionMode"
									variant="outlined"
									margin="dense"
								>
									{distributionModes.map(mode => (
										<MenuItem key={mode.value} value={mode.value}>
											{mode.label}
										</MenuItem>
									))}
								</Field>
								<Typography variant="caption" color="textSecondary">
									{distributionModes.find(mode => mode.value === values.distributionMode)?.help}
								</Typography>
								<Grid container spacing={1}>
									<Grid item xs={12} sm={6}>
										<Field
											as={TextField}
											fullWidth
											type="number"
											label="Maximo de atendimentos por atendente"
											name="maxActiveTicketsPerUser"
											variant="outlined"
											margin="dense"
											helperText="Deixe vazio para nao limitar."
										/>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Field
											as={TextField}
											select
											fullWidth
											label="Se todos atingirem o limite"
											name="overflowAction"
											variant="outlined"
											margin="dense"
										>
											<MenuItem value="keep_waiting">Manter aguardando</MenuItem>
											<MenuItem value="allow_overflow">Permitir exceder limite</MenuItem>
										</Field>
									</Grid>
								</Grid>
								{values.distributionMode === "manual_balanced" && (
									<Field
										as={TextField}
										select
										fullWidth
										label="Quando houver atendente Online com menos carga"
										name="balanceAction"
										variant="outlined"
										margin="dense"
									>
										<MenuItem value="block">Bloquear aceite</MenuItem>
										<MenuItem value="warn">Apenas alertar</MenuItem>
										<MenuItem value="ignore">Ignorar regra</MenuItem>
									</Field>
								)}
								<FormControlLabel
									control={
										<Field
											as={Switch}
											color="primary"
											name="sendQueuePositionMessage"
											checked={values.sendQueuePositionMessage}
										/>
									}
									label="Enviar posicao inicial na fila"
								/>
								{values.sendQueuePositionMessage && (
									<MessageTemplateField
										formik
										label="Mensagem de posicao inicial"
										name="queuePositionMessage"
										rows={5}
									/>
								)}
								<FormControlLabel
									control={
										<Field
											as={Switch}
											color="primary"
											name="blockIfUserHasStalledTicket"
											checked={values.blockIfUserHasStalledTicket}
										/>
									}
									label="Controlar atendimento parado antes de novo aceite"
								/>
								{values.blockIfUserHasStalledTicket && (
									<Grid container spacing={1}>
										<Grid item xs={12} sm={6}>
											<Field
												as={TextField}
												fullWidth
												type="number"
												label="Minutos para considerar parado"
												name="stalledTicketMinutes"
												variant="outlined"
												margin="dense"
											/>
										</Grid>
										<Grid item xs={12} sm={6}>
											<Field
												as={TextField}
												select
												fullWidth
												label="Acao para atendimento parado"
												name="stalledTicketAction"
												variant="outlined"
												margin="dense"
											>
												<MenuItem value="ignore">Ignorar</MenuItem>
												<MenuItem value="block">Bloquear novo aceite</MenuItem>
												<MenuItem value="warn">Apenas alertar</MenuItem>
											</Field>
										</Grid>
									</Grid>
								)}
							</DialogContent>
							<DialogActions>
								<Button
									onClick={handleClose}
									color="secondary"
									disabled={isSubmitting}
									variant="outlined"
								>
									{i18n.t("queueModal.buttons.cancel")}
								</Button>
								<Button
									type="submit"
									color="primary"
									disabled={isSubmitting}
									variant="contained"
									className={classes.btnWrapper}
								>
									{queueId
										? `${i18n.t("queueModal.buttons.okEdit")}`
										: `${i18n.t("queueModal.buttons.okAdd")}`}
									{isSubmitting && (
										<CircularProgress
											size={24}
											className={classes.buttonProgress}
										/>
									)}
								</Button>
							</DialogActions>
						</Form>
					)}
				</Formik>
			</Dialog>
		</div>
	);
};

export default QueueModal;
