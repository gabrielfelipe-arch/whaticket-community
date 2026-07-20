import React, { useState, useEffect, useContext } from "react";

import * as Yup from "yup";
import { Formik, Form, Field, FieldArray } from "formik";
import { toast } from "react-toastify";

import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	CircularProgress,
	Select,
	InputLabel,
	MenuItem,
	FormControl,
	TextField,
	FormControlLabel,
	Switch,
	Typography,
	Checkbox,
	Divider
  } from '@material-ui/core';

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import QueueSelect from "../QueueSelect";
import MessageTemplateField from "../MessageTemplateField";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../Can";
import useWhatsApps from "../../hooks/useWhatsApps";

const useStyles = makeStyles(theme => ({
	root: {
		display: "flex",
		flexWrap: "wrap",
	},
	multFieldLine: {
		display: "flex",
		gap: theme.spacing(2),
		"& > *": {
			flex: "1 1 0",
			minWidth: 0,
		},
		[theme.breakpoints.down("xs")]: {
			flexDirection: "column",
			gap: 0,
		},
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
		marginTop: theme.spacing(1),
		marginBottom: theme.spacing(1),
		minWidth: 0,
	},
	permissionsBox: {
		marginTop: theme.spacing(1),
		padding: theme.spacing(1.5),
		border: `1px solid ${theme.palette.divider}`,
		borderRadius: 8,
		background: theme.palette.type === "dark" ? theme.palette.background.default : "#f8fafc",
	},
	permissionsGrid: {
		display: "grid",
		gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
		gap: theme.spacing(0.5, 1),
		[theme.breakpoints.down("xs")]: {
			gridTemplateColumns: "1fr",
		},
	},
	section: {
		marginTop: theme.spacing(2),
		paddingTop: theme.spacing(1.5),
		borderTop: `1px solid ${theme.palette.divider}`,
	},
	workRule: {
		display: "grid",
		gridTemplateColumns: "1fr 120px 120px auto",
		gap: theme.spacing(1),
		alignItems: "center",
		marginTop: theme.spacing(1),
		[theme.breakpoints.down("xs")]: {
			gridTemplateColumns: "1fr",
		},
	},
	dayGrid: {
		display: "grid",
		gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
		gap: theme.spacing(0.5),
		[theme.breakpoints.down("xs")]: {
			gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
		},
	},
}));

const specialPermissionOptions = [
	{ key: "accessUra", label: "Acessar URA" },
	{ key: "accessForms", label: "Acessar formularios" },
	{ key: "accessAi", label: "Acessar IA" },
	{ key: "importContactsSpreadsheet", label: "Importar contatos por planilha" },
	{ key: "manageOtherCampaigns", label: "Editar/excluir campanhas de outros usuarios" },
	{ key: "deleteMessages", label: "Excluir mensagens" },
];

const dayOptions = [
	{ value: 1, label: "Seg" },
	{ value: 2, label: "Ter" },
	{ value: 3, label: "Qua" },
	{ value: 4, label: "Qui" },
	{ value: 5, label: "Sex" },
	{ value: 6, label: "Sab" },
	{ value: 0, label: "Dom" },
];

const formatCpf = value => {
	const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
	return digits
		.replace(/^(\d{3})(\d)/, "$1.$2")
		.replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
		.replace(/\.(\d{3})(\d)/, ".$1-$2");
};

const onlyDigits = value => String(value || "").replace(/\D/g, "");

const parseWorkHours = value => {
	try {
		const parsed = typeof value === "string" ? JSON.parse(value || "[]") : value;
		if (!Array.isArray(parsed)) return [];
		return parsed.map(rule => ({
			days: Array.isArray(rule.days) ? rule.days.map(Number) : [],
			start: rule.start || "08:00",
			end: rule.end || "18:00",
		}));
	} catch (err) {
		return [];
	}
};

const serializeWorkHours = rules => JSON.stringify((rules || [])
	.map(rule => ({
		days: (rule.days || []).map(Number).filter(day => day >= 0 && day <= 6),
		start: rule.start,
		end: rule.end,
	}))
	.filter(rule => rule.days.length && rule.start && rule.end));

const UserSchema = Yup.object().shape({
	name: Yup.string()
		.min(2, "Too Short!")
		.max(50, "Too Long!")
		.required("Required"),
	attendanceGreeting: Yup.string(),
	cpf: Yup.string()
		.required("Required")
		.test("cpf-length", "CPF deve ter 11 digitos", value => onlyDigits(value).length === 11),
	birthDate: Yup.string().required("Required"),
	jobTitle: Yup.string().min(2, "Too Short!").required("Required"),
	messageSignature: Yup.string().min(2, "Too Short!").max(50, "Too Long!").required("Required"),
	email: Yup.string().email("Invalid email").required("Required"),
});

const UserModal = ({ open, onClose, userId }) => {
	const classes = useStyles();

	const initialState = {
		name: "",
		email: "",
		cpf: "",
		birthDate: "",
		jobTitle: "",
		messageSignature: "",
		profile: "user",
		profileId: "",
		workHoursRules: [],
		active: true,
		glpiEnabled: false,
		glpiUserToken: "",
		attendanceGreeting: "",
		specialPermissions: {
			accessUra: false,
			accessForms: false,
			accessAi: false,
			importContactsSpreadsheet: false,
			manageOtherCampaigns: false,
			deleteMessages: false,
		},
	};

	const { user: loggedInUser } = useContext(AuthContext);
	const canEditProfiles = ["admin", "supervisor"].includes(loggedInUser?.profile);
	const canUseCustomProfiles = loggedInUser?.profile === "admin";
	const profileOptions = [
		...(loggedInUser?.profile === "admin" ? [{ value: "admin", label: "Admin" }] : []),
		{ value: "supervisor", label: "Supervisor" },
		{ value: "user", label: "User" }
	];

	const [user, setUser] = useState(initialState);
	const [selectedQueueIds, setSelectedQueueIds] = useState([]);
	const [accessProfiles, setAccessProfiles] = useState([]);
	const [whatsappId, setWhatsappId] = useState(false);
	const {loading, whatsApps} = useWhatsApps();

	useEffect(() => {
		const fetchProfiles = async () => {
			if (!open || !canUseCustomProfiles) return;
			try {
				const { data } = await api.get("/user-profiles", { params: { active: true } });
				setAccessProfiles(data || []);
			} catch (err) {
				toastError(err);
			}
		};

		fetchProfiles();
	}, [open, canUseCustomProfiles]);

	useEffect(() => {
		const fetchUser = async () => {
			if (!userId) return;
			try {
				const { data } = await api.get(`/users/${userId}`);
				setUser(prevState => {
					return {
						...prevState,
						...data,
						cpf: formatCpf(data.cpf),
						profileId: data.profileId || "",
						workHoursRules: parseWorkHours(data.workHours),
					};
				});
				const userQueueIds = data.queues?.map(queue => queue.id);
				setSelectedQueueIds(userQueueIds);
				setWhatsappId(data.whatsappId ? data.whatsappId : '');
			} catch (err) {
				toastError(err);
			}
		};

		fetchUser();
	}, [userId, open]);

	const handleClose = () => {
		onClose();
		setUser(initialState);
		setAccessProfiles([]);
	};

	const handleSaveUser = async values => {
		const userData = {
			...values,
			cpf: onlyDigits(values.cpf),
			email: values.email || null,
			workHours: serializeWorkHours(values.workHoursRules),
			profileId: values.profileId || undefined,
			whatsappId,
			queueIds: selectedQueueIds
		};
		delete userData.workHoursRules;
		delete userData.password;
		try {
			if (userId) {
				await api.put(`/users/${userId}`, userData);
			} else {
				await api.post("/users", userData);
				}
				toast.success(i18n.t("userModal.success"));
				handleClose();
			} catch (err) {
				toastError(err);
			}
	};

	return (
		<div className={classes.root}>
				<Dialog
					open={open}
					onClose={handleClose}
					maxWidth="md"
				fullWidth
				scroll="paper"
			>
				<DialogTitle id="form-dialog-title">
					{userId
						? `${i18n.t("userModal.title.edit")}`
						: `${i18n.t("userModal.title.add")}`}
				</DialogTitle>
					<Formik
						initialValues={user}
						enableReinitialize={true}
						validationSchema={UserSchema}
						onSubmit={(values, actions) => {
							setTimeout(async () => {
								await handleSaveUser(values);
								actions.setSubmitting(false);
							}, 400);
						}}
				>
					{({ touched, errors, isSubmitting, values, setFieldValue }) => (
						<Form>
							<DialogContent dividers>
								<div className={classes.multFieldLine}>
									<Field
										as={TextField}
										label={i18n.t("userModal.form.name")}
										autoFocus
										name="name"
										error={touched.name && Boolean(errors.name)}
										helperText={touched.name && errors.name}
										variant="outlined"
										margin="dense"
										fullWidth
									/>
										<Field
											as={TextField}
											label="CPF"
											name="cpf"
											variant="outlined"
											margin="dense"
											error={touched.cpf && Boolean(errors.cpf)}
											helperText={touched.cpf && errors.cpf}
											onChange={event => setFieldValue("cpf", formatCpf(event.target.value))}
											fullWidth
										/>
								</div>
									<div className={classes.multFieldLine}>
										<Field
											as={TextField}
											label="E-mail"
											name="email"
											error={touched.email && Boolean(errors.email)}
											helperText={touched.email && errors.email}
											variant="outlined"
											margin="dense"
											fullWidth
										/>
										<Field
											as={TextField}
											label="Data de nascimento"
											name="birthDate"
											type="date"
											error={touched.birthDate && Boolean(errors.birthDate)}
											helperText={touched.birthDate && errors.birthDate}
											variant="outlined"
											margin="dense"
											InputLabelProps={{ shrink: true }}
											fullWidth
										/>
									</div>
									<div className={classes.multFieldLine}>
										<Field
											as={TextField}
											label="Cargo"
											name="jobTitle"
											error={touched.jobTitle && Boolean(errors.jobTitle)}
											helperText={touched.jobTitle && errors.jobTitle}
											variant="outlined"
											margin="dense"
											fullWidth
										/>
										<Field
											as={TextField}
											label="Assinatura nas mensagens"
											name="messageSignature"
											error={touched.messageSignature && Boolean(errors.messageSignature)}
											helperText={(touched.messageSignature && errors.messageSignature) || "Nome curto exibido quando a mensagem for assinada no atendimento."}
											variant="outlined"
											margin="dense"
											fullWidth
										/>
									</div>
									<div className={classes.multFieldLine}>
										<FormControl
											variant="outlined"
											className={classes.formControl}
										margin="dense"
									>
										{canUseCustomProfiles && (
											<>
												<InputLabel id="access-profile-selection-input-label">
													Perfil de acesso
												</InputLabel>

												<Field
													as={Select}
													label="Perfil de acesso"
													name="profileId"
													labelId="access-profile-selection-label"
													id="access-profile-selection"
												>
													<MenuItem value="">&nbsp;</MenuItem>
													{accessProfiles.map(option => (
														<MenuItem key={option.id} value={option.id}>
															{option.name}
														</MenuItem>
													))}
												</Field>
											</>
										)}
										{canEditProfiles && !canUseCustomProfiles && (
											<>
												<InputLabel id="profile-selection-input-label">
													{i18n.t("userModal.form.profile")}
												</InputLabel>

												<Field
													as={Select}
													label={i18n.t("userModal.form.profile")}
													name="profile"
													labelId="profile-selection-label"
													id="profile-selection"
													required
												>
													{profileOptions.map(option => (
														<MenuItem key={option.value} value={option.value}>
															{option.label}
														</MenuItem>
													))}
												</Field>
											</>
											)}
										</FormControl>
									</div>
									<div className={classes.section}>
										<Typography variant="subtitle2">Horario de trabalho</Typography>
										<Typography variant="caption" color="textSecondary">
											Se nenhum periodo for informado, o usuario pode acessar em qualquer horario. Fora dos periodos cadastrados, o backend bloqueia o acesso.
										</Typography>
										<FieldArray
											name="workHoursRules"
											render={arrayHelpers => (
												<>
													{(values.workHoursRules || []).map((rule, index) => (
														<div className={classes.workRule} key={index}>
															<div className={classes.dayGrid}>
																{dayOptions.map(day => (
																	<FormControlLabel
																		key={day.value}
																		control={
																			<Checkbox
																				color="primary"
																				size="small"
																				checked={(rule.days || []).includes(day.value)}
																				onChange={event => {
																					const currentDays = rule.days || [];
																					const nextDays = event.target.checked
																						? [...currentDays, day.value]
																						: currentDays.filter(value => value !== day.value);
																					setFieldValue(`workHoursRules.${index}.days`, nextDays);
																				}}
																			/>
																		}
																		label={day.label}
																	/>
																))}
															</div>
															<Field
																as={TextField}
																label="Inicio"
																name={`workHoursRules.${index}.start`}
																type="time"
																variant="outlined"
																margin="dense"
																InputLabelProps={{ shrink: true }}
															/>
															<Field
																as={TextField}
																label="Fim"
																name={`workHoursRules.${index}.end`}
																type="time"
																variant="outlined"
																margin="dense"
																InputLabelProps={{ shrink: true }}
															/>
															<Button
																variant="outlined"
																color="secondary"
																onClick={() => arrayHelpers.remove(index)}
															>
																Remover
															</Button>
														</div>
													))}
													<Button
														style={{ marginTop: 12 }}
														variant="outlined"
														color="primary"
														onClick={() => arrayHelpers.push({ days: [1, 2, 3, 4, 5], start: "08:00", end: "18:00" })}
													>
														Adicionar periodo
													</Button>
												</>
											)}
										/>
									</div>
									<Divider className={classes.section} />
									<Can
									role={loggedInUser.profile}
									perform="user-modal:editQueues"
									yes={() => (
										<QueueSelect
											selectedQueueIds={selectedQueueIds}
											onChange={values => setSelectedQueueIds(values)}
										/>
									)}
								/>
								<Can
									role={loggedInUser.profile}
									perform="user-modal:editQueues"
									yes={() => (!loading &&
										<FormControl variant="outlined" margin="dense" className={classes.maxWidth} fullWidth>
											<InputLabel>{i18n.t("userModal.form.whatsapp")}</InputLabel>
											<Field
												as={Select}
												value={whatsappId}
												onChange={(e) => setWhatsappId(e.target.value)}
												label={i18n.t("userModal.form.whatsapp")}
											>
												<MenuItem value={''}>&nbsp;</MenuItem>
												{whatsApps.map((whatsapp) => (
													<MenuItem key={whatsapp.id} value={whatsapp.id}>{whatsapp.name}</MenuItem>
												))}
											</Field>
										</FormControl>
									)}
								/>
									<MessageTemplateField
										formik
										label="Mensagem de saudacao do atendimento"
										name="attendanceGreeting"
										rows={3}
									/>
								<Can
									role={loggedInUser.profile}
									perform="user-modal:editProfile"
									yes={() => (
										<FormControlLabel
											control={
												<Field
													as={Switch}
													color="primary"
													name="active"
													checked={values.active !== false}
												/>
											}
											label={values.active === false ? "Usuario inativo" : "Usuario ativo"}
										/>
									)}
								/>
								<Can
									role={loggedInUser.profile}
									perform="user-modal:editProfile"
									yes={() => (
										<>
											<FormControlLabel
												control={
													<Field
														as={Switch}
														color="primary"
														name="glpiEnabled"
														checked={values.glpiEnabled === true}
													/>
												}
												label={values.glpiEnabled ? "Usuario utiliza GLPI" : "Usuario nao utiliza GLPI"}
											/>
											{values.glpiEnabled && (
												<Field
													as={TextField}
													label="User Token GLPI"
													name="glpiUserToken"
													variant="outlined"
													margin="dense"
													fullWidth
													helperText="Token individual do GLPI usado quando este usuario abrir chamado manualmente."
												/>
											)}
										</>
									)}
								/>
								{loggedInUser.profile === "admin" && (
									<div className={classes.permissionsBox}>
										<Typography variant="subtitle2">Permissoes especiais</Typography>
										<Typography variant="caption" color="textSecondary">
											Use para liberar funcionalidades especificas sem transformar o usuario em administrador.
										</Typography>
										<div className={classes.permissionsGrid}>
											{specialPermissionOptions.map(permission => (
												<FormControlLabel
													key={permission.key}
													control={
														<Field
															as={Switch}
															color="primary"
															name={`specialPermissions.${permission.key}`}
															checked={values.specialPermissions?.[permission.key] === true}
														/>
													}
													label={permission.label}
												/>
											))}
										</div>
									</div>
								)}
							</DialogContent>
							<DialogActions>
								<Button
									onClick={handleClose}
									color="secondary"
									disabled={isSubmitting}
									variant="outlined"
								>
									{i18n.t("userModal.buttons.cancel")}
								</Button>
								<Button
									type="submit"
									color="primary"
									disabled={isSubmitting}
									variant="contained"
									className={classes.btnWrapper}
								>
									{userId
										? `${i18n.t("userModal.buttons.okEdit")}`
										: `${i18n.t("userModal.buttons.okAdd")}`}
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

export default UserModal;
