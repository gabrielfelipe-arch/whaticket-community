import React, { useState } from "react";

import * as Yup from "yup";
import { useHistory } from "react-router-dom";
import { Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";
import { Formik, Form, Field } from "formik";

import {
	Avatar,
	Button,
	CssBaseline,
	TextField,
	Grid,
	Box,
	Typography,
	Container,
	Link
} from '@material-ui/core';

import { LockOutlined } from '@material-ui/icons';

import { makeStyles } from "@material-ui/core/styles";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";

// const Copyright = () => {
// 	return (
// 		<Typography variant="body2" color="textSecondary" align="center">
// 			{"Copyleft "}
// 			<Link color="inherit" href="https://github.com/canove">
// 				Canove
// 			</Link>{" "}
// 			{new Date().getFullYear()}
// 			{"."}
// 		</Typography>
// 	);
// };

const useStyles = makeStyles(theme => ({
	paper: {
		marginTop: theme.spacing(8),
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
	},
	avatar: {
		margin: theme.spacing(1),
		backgroundColor: theme.palette.secondary.main,
	},
	form: {
		width: "100%",
		marginTop: theme.spacing(3),
	},
	submit: {
		margin: theme.spacing(3, 0, 2),
	},
}));

const UserSchema = Yup.object().shape({
	name: Yup.string()
		.min(2, "Too Short!")
		.max(50, "Too Long!")
		.required("Required"),
	cpf: Yup.string()
		.required("Required")
		.test("cpf-length", "CPF deve ter 11 digitos", value => String(value || "").replace(/\D/g, "").length === 11),
	email: Yup.string().email("Invalid email").required("Required"),
	birthDate: Yup.string().required("Required"),
	jobTitle: Yup.string().min(2, "Too Short!").required("Required"),
	messageSignature: Yup.string().min(2, "Too Short!").max(50, "Too Long!").required("Required"),
	attendanceGreeting: Yup.string(),
});

const SignUp = () => {
	const classes = useStyles();
	const history = useHistory();

	const formatCpf = value => {
		const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
		return digits
			.replace(/^(\d{3})(\d)/, "$1.$2")
			.replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
			.replace(/\.(\d{3})(\d)/, ".$1-$2");
	};

	const initialState = { name: "", email: "", cpf: "", birthDate: "", jobTitle: "", messageSignature: "", attendanceGreeting: "" };
	const [user] = useState(initialState);

	const handleSignUp = async values => {
		try {
			await api.post("/auth/signup", {
				...values,
				cpf: String(values.cpf || "").replace(/\D/g, ""),
				email: values.email || null
			});
			toast.success(i18n.t("signup.toasts.success"));
			history.push("/login");
		} catch (err) {
			toastError(err);
		}
	};

	return (
		<Container component="main" maxWidth="xs">
			<CssBaseline />
			<div className={classes.paper}>
				<Avatar className={classes.avatar}>
					<LockOutlined />
				</Avatar>
				<Typography component="h1" variant="h5">
					{i18n.t("signup.title")}
				</Typography>
				{/* <form className={classes.form} noValidate onSubmit={handleSignUp}> */}
				<Formik
					initialValues={user}
					enableReinitialize={true}
					validationSchema={UserSchema}
					onSubmit={(values, actions) => {
						setTimeout(() => {
							handleSignUp(values);
							actions.setSubmitting(false);
						}, 400);
					}}
				>
					{({ touched, errors, isSubmitting, setFieldValue }) => (
						<Form className={classes.form}>
							<Grid container spacing={2}>
								<Grid item xs={12}>
									<Field
										as={TextField}
										autoComplete="name"
										name="name"
										error={touched.name && Boolean(errors.name)}
										helperText={touched.name && errors.name}
										variant="outlined"
										fullWidth
										id="name"
										label={i18n.t("signup.form.name")}
										autoFocus
									/>
								</Grid>

								<Grid item xs={12}>
									<Field
										as={TextField}
										variant="outlined"
										fullWidth
										id="cpf"
										label="CPF"
										name="cpf"
										error={touched.cpf && Boolean(errors.cpf)}
										helperText={touched.cpf && errors.cpf}
										autoComplete="username"
										onChange={event => setFieldValue("cpf", formatCpf(event.target.value))}
									/>
								</Grid>
								<Grid item xs={12}>
									<Field
										as={TextField}
										variant="outlined"
										fullWidth
										id="email"
										label="E-mail"
										name="email"
										error={touched.email && Boolean(errors.email)}
										helperText={touched.email && errors.email}
										autoComplete="email"
									/>
								</Grid>
								<Grid item xs={12}>
									<Field
										as={TextField}
										variant="outlined"
										fullWidth
										id="birthDate"
										label="Data de nascimento"
										name="birthDate"
										type="date"
										error={touched.birthDate && Boolean(errors.birthDate)}
										helperText={touched.birthDate && errors.birthDate}
										InputLabelProps={{ shrink: true }}
									/>
								</Grid>
								<Grid item xs={12}>
									<Field
										as={TextField}
										variant="outlined"
										fullWidth
										id="jobTitle"
										label="Cargo"
										name="jobTitle"
										error={touched.jobTitle && Boolean(errors.jobTitle)}
										helperText={touched.jobTitle && errors.jobTitle}
									/>
								</Grid>
								<Grid item xs={12}>
									<Field
										as={TextField}
										variant="outlined"
										fullWidth
										id="messageSignature"
										label="Assinatura nas mensagens"
										name="messageSignature"
										error={touched.messageSignature && Boolean(errors.messageSignature)}
										helperText={(touched.messageSignature && errors.messageSignature) || "Nome curto exibido quando a mensagem for assinada no atendimento."}
									/>
								</Grid>
								<Grid item xs={12}>
									<Field
										as={TextField}
										variant="outlined"
										fullWidth
										id="attendanceGreeting"
										label="Mensagem de saudacao do atendimento"
										name="attendanceGreeting"
										multiline
										minRows={2}
										error={touched.attendanceGreeting && Boolean(errors.attendanceGreeting)}
										helperText={touched.attendanceGreeting && errors.attendanceGreeting}
									/>
								</Grid>
							</Grid>
							<Button
								type="submit"
								fullWidth
								variant="contained"
								color="primary"
								className={classes.submit}
							>
								{i18n.t("signup.buttons.submit")}
							</Button>
							<Grid container justifyContent="flex-end">
								<Grid item>
									<Link
										href="#"
										variant="body2"
										component={RouterLink}
										to="/login"
									>
										{i18n.t("signup.buttons.login")}
									</Link>
								</Grid>
							</Grid>
						</Form>
					)}
				</Formik>
			</div>
			<Box mt={5}>{/* <Copyright /> */}</Box>
		</Container>
	);
};

export default SignUp;
