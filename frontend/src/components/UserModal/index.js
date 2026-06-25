import React, { useState, useEffect, useContext } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
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
	InputAdornment,
	IconButton,
	FormControlLabel,
	Switch,
	Typography
  } from '@material-ui/core';

import { Visibility, VisibilityOff } from '@material-ui/icons';

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
		"& > *:not(:last-child)": {
			marginRight: theme.spacing(1),
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
		margin: theme.spacing(1),
		minWidth: 120,
	},
	permissionsBox: {
		marginTop: theme.spacing(1),
		padding: theme.spacing(1.5),
		border: "1px solid #d8dee9",
		borderRadius: 8,
		background: "#f8fafc",
	},
	permissionsGrid: {
		display: "grid",
		gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
		gap: theme.spacing(0.5, 1),
		[theme.breakpoints.down("xs")]: {
			gridTemplateColumns: "1fr",
		},
	},
}));

const specialPermissionOptions = [
	{ key: "accessUra", label: "Acessar URA" },
	{ key: "accessForms", label: "Acessar formularios" },
	{ key: "accessAi", label: "Acessar IA" },
	{ key: "importContactsSpreadsheet", label: "Importar contatos por planilha" },
	{ key: "manageOtherCampaigns", label: "Editar/excluir campanhas de outros usuarios" },
];

const UserSchema = Yup.object().shape({
	name: Yup.string()
		.min(2, "Too Short!")
		.max(50, "Too Long!")
		.required("Required"),
	password: Yup.string().min(5, "Too Short!").max(50, "Too Long!"),
	email: Yup.string().email("Invalid email").required("Required"),
});

const UserModal = ({ open, onClose, userId }) => {
	const classes = useStyles();

	const initialState = {
		name: "",
		email: "",
		password: "",
		profile: "user",
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
		},
	};

	const { user: loggedInUser } = useContext(AuthContext);
	const canEditProfiles = ["admin", "supervisor"].includes(loggedInUser?.profile);
	const profileOptions = [
		...(loggedInUser?.profile === "admin" ? [{ value: "admin", label: "Admin" }] : []),
		{ value: "supervisor", label: "Supervisor" },
		{ value: "user", label: "User" }
	];

	const [user, setUser] = useState(initialState);
	const [selectedQueueIds, setSelectedQueueIds] = useState([]);
	const [showPassword, setShowPassword] = useState(false);
	const [whatsappId, setWhatsappId] = useState(false);
	const {loading, whatsApps} = useWhatsApps();

	useEffect(() => {
		const fetchUser = async () => {
			if (!userId) return;
			try {
				const { data } = await api.get(`/users/${userId}`);
				setUser(prevState => {
					return { ...prevState, ...data };
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
	};

	const handleSaveUser = async values => {
		const userData = { ...values, whatsappId, queueIds: selectedQueueIds };
		try {
			if (userId) {
				await api.put(`/users/${userId}`, userData);
			} else {
				await api.post("/users", userData);
			}
			toast.success(i18n.t("userModal.success"));
		} catch (err) {
			toastError(err);
		}
		handleClose();
	};

	return (
		<div className={classes.root}>
			<Dialog
				open={open}
				onClose={handleClose}
				maxWidth="sm"
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
						setTimeout(() => {
							handleSaveUser(values);
							actions.setSubmitting(false);
						}, 400);
					}}
				>
					{({ touched, errors, isSubmitting, values }) => (
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
										name="password"
										variant="outlined"
										margin="dense"
										label={i18n.t("userModal.form.password")}
										error={touched.password && Boolean(errors.password)}
										helperText={touched.password && errors.password}
										type={showPassword ? 'text' : 'password'}
										InputProps={{
										endAdornment: (
											<InputAdornment position="end">
											<IconButton
												aria-label="toggle password visibility"
												onClick={() => setShowPassword((e) => !e)}
											>
												{showPassword ? <VisibilityOff /> : <Visibility />}
											</IconButton>
											</InputAdornment>
										)
										}}
										fullWidth
									/>
								</div>
								<div className={classes.multFieldLine}>
									<Field
										as={TextField}
										label={i18n.t("userModal.form.email")}
										name="email"
										error={touched.email && Boolean(errors.email)}
										helperText={touched.email && errors.email}
										variant="outlined"
										margin="dense"
										fullWidth
									/>
									<FormControl
										variant="outlined"
										className={classes.formControl}
										margin="dense"
									>
										{canEditProfiles && (
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
									label="Saudacao de atendimento"
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
