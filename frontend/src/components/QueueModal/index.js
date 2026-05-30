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

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { IconButton, InputAdornment, Popover } from "@material-ui/core";
import { Colorize } from "@material-ui/icons";
import { GithubPicker } from "react-color";
import MessageTemplateField from "../MessageTemplateField";

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
		businessHoursEnabled: false,
		businessHours: "",
		unavailableMessage: "",
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
					return { ...prevState, ...data, aiSettingId: data.aiSettingId || "" };
				});
			} catch (err) {
				toastError(err);
			}
		})();

		return () => {
			setQueue({
				name: "",
				color: "",
				useAI: false,
				aiSettingId: "",
			});
		};
	}, [queueId, open]);

	const handleClose = () => {
		onClose();
		setQueue(initialState);
		setColorPickerAnchor(null);
	};

	const handleSaveQueue = async values => {
		try {
			const queueData = {
				...values,
				aiSettingId: values.useAI && values.aiSettingId ? values.aiSettingId : null,
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
								<FormControlLabel
									control={
										<Field
											as={Switch}
											color="primary"
											name="businessHoursEnabled"
											checked={values.businessHoursEnabled}
										/>
									}
									label="Ativar horario de funcionamento"
								/>
								{values.businessHoursEnabled && (
									<>
										<Field
											as={TextField}
											fullWidth
											multiline
											rows={4}
											label="Horario de funcionamento"
											name="businessHours"
											variant="outlined"
											margin="dense"
											helperText={'Formato JSON. Ex: [{"days":[1,2,3,4,5],"start":"08:00","end":"18:00"}]. Domingo=0, Segunda=1.'}
										/>
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
