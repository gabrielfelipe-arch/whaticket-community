import React, { useState, useContext } from "react";
import {
  Button,
  Checkbox,
  CssBaseline,
  FormControlLabel,
  IconButton,
  InputAdornment,
  TextField,
  Typography
} from "@material-ui/core";

import {
  ArrowForward,
  EmailOutlined,
  FlashOn,
  LockOutlined,
  SecurityOutlined,
  TrendingUp,
  Visibility,
  VisibilityOff
} from "@material-ui/icons";

import { makeStyles } from "@material-ui/core/styles";

import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import rocketLoginLogo from "../../assets/rocketservice-logo-login.png";

const useStyles = makeStyles(theme => ({
  page: {
    minHeight: "100dvh",
    position: "relative",
    overflowX: "hidden",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(2, 2.5),
    color: theme.palette.type === "dark" ? "#F8FAFC" : "#0F172A",
    background: theme.palette.type === "dark"
      ? "linear-gradient(135deg, #020817 0%, #061633 46%, #020817 100%)"
      : "linear-gradient(135deg, #F8FAFC 0%, #EDF4FF 48%, #FFFFFF 100%)",
    "&:before": {
      content: '""',
      position: "absolute",
      inset: 0,
      opacity: theme.palette.type === "dark" ? 0.42 : 0.28,
      backgroundImage:
        theme.palette.type === "dark"
          ? "linear-gradient(rgba(56,189,248,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.08) 1px, transparent 1px)"
          : "linear-gradient(rgba(37,99,235,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.08) 1px, transparent 1px)",
      backgroundSize: "72px 72px",
      transform: "perspective(900px) rotateX(62deg) translateY(28%) scale(1.25)",
      transformOrigin: "bottom center"
    },
    "&:after": {
      content: '""',
      position: "absolute",
      display: "none"
    },
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(2),
      alignItems: "flex-start",
      "&:after": {
        left: "-45%",
        top: "-12%"
      }
    },
    "@media (max-height: 820px)": {
      paddingTop: theme.spacing(1),
      paddingBottom: theme.spacing(1)
    }
  },
  shell: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 1120,
    display: "grid",
    gridTemplateColumns: "minmax(380px, 1fr) minmax(290px, 340px)",
    gap: theme.spacing(4),
    alignItems: "center",
    padding: 0,
    [theme.breakpoints.down("md")]: {
      maxWidth: "calc(100vw - 32px)",
      gridTemplateColumns: "minmax(360px, 1fr) minmax(280px, 330px)",
      gap: theme.spacing(3)
    },
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "minmax(330px, 1fr) minmax(270px, 310px)",
      gap: theme.spacing(2),
      maxWidth: "calc(100vw - 24px)"
    },
    "@media (max-width: 900px) and (pointer: coarse)": {
      gridTemplateColumns: "1fr",
      maxWidth: 500,
      gap: theme.spacing(2),
      justifyItems: "center"
    }
  },
  brandPanel: {
    position: "relative",
    paddingLeft: 0,
    minWidth: 0,
    maxWidth: 620,
    minHeight: 590,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    transform: "none",
    "&:before": {
      content: '""',
      position: "absolute",
      zIndex: -1,
      width: 620,
      height: 620,
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      borderRadius: "50%",
      border: theme.palette.type === "dark" ? "1px solid rgba(37,99,235,0.2)" : "1px solid rgba(37,99,235,0.16)",
      boxShadow: theme.palette.type === "dark"
        ? "0 0 0 44px rgba(37,99,235,0.04), 0 0 0 92px rgba(56,189,248,0.028)"
        : "0 0 0 44px rgba(37,99,235,0.05), 0 0 0 92px rgba(56,189,248,0.05)",
      pointerEvents: "none"
    },
    [theme.breakpoints.down("md")]: {
      paddingLeft: 0,
      maxWidth: 540,
      minHeight: 540,
      "&:before": {
        width: 560,
        height: 560
      }
    },
    [theme.breakpoints.down("sm")]: {
      paddingLeft: 0,
      transform: "none",
      textAlign: "center",
      minHeight: "auto",
      "&:before": {
        display: "none"
      }
    },
    "@media (max-width: 900px) and (pointer: coarse)": {
      display: "none"
    },
    "@media (max-height: 760px) and (min-width: 901px)": {
      minHeight: 520,
      "&:before": {
        width: 550,
        height: 550
      }
    }
  },
  heroLogo: {
    width: "min(260px, 70%)",
    display: "block",
    marginLeft: "auto",
    marginRight: "auto",
    marginBottom: theme.spacing(2),
    filter: "drop-shadow(0 18px 32px rgba(0, 178, 255, 0.28))",
    objectFit: "contain",
    [theme.breakpoints.down("md")]: {
      maxWidth: 235,
      marginBottom: theme.spacing(1.5)
    },
    [theme.breakpoints.down("sm")]: {
      margin: "0 auto 10px",
      maxWidth: 300
    }
  },
  headline: {
    maxWidth: 400,
    fontSize: 25,
    lineHeight: 1.08,
    fontWeight: 800,
    letterSpacing: 0,
    textAlign: "center",
    marginBottom: theme.spacing(1.25),
    "& span": {
      display: "block",
      color: theme.palette.type === "dark" ? "#38BDF8" : "#2563EB"
    },
    [theme.breakpoints.down("sm")]: {
      margin: "0 auto 10px",
      fontSize: 24
    },
    [theme.breakpoints.down("xs")]: {
      fontSize: 26
    }
  },
  subtitle: {
    maxWidth: 360,
    color: theme.palette.type === "dark" ? "#CBD5E1" : "#475569",
    fontSize: 13,
    lineHeight: 1.55,
    textAlign: "center",
    marginBottom: theme.spacing(2),
    [theme.breakpoints.down("sm")]: {
      margin: "0 auto 18px",
      fontSize: 16
    },
    [theme.breakpoints.down("xs")]: {
      marginBottom: theme.spacing(1.5)
    }
  },
  benefits: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(78px, 100px))",
    justifyContent: "center",
    width: "100%",
    gap: theme.spacing(2),
    [theme.breakpoints.down("md")]: {
      gridTemplateColumns: "repeat(3, minmax(88px, 125px))",
      gap: theme.spacing(1.5)
    },
    [theme.breakpoints.down("sm")]: {
      justifyContent: "center",
      gridTemplateColumns: "repeat(3, minmax(88px, 120px))",
      gap: theme.spacing(1.5)
    },
    [theme.breakpoints.down("xs")]: {
      gridTemplateColumns: "1fr",
      maxWidth: 230,
      margin: "0 auto"
    }
  },
  benefit: {
    textAlign: "center",
    color: theme.palette.type === "dark" ? "#D9E7FF" : "#334155",
    fontSize: 11,
    lineHeight: 1.32
  },
  benefitIcon: {
    width: 38,
    height: 38,
    margin: "0 auto 7px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    color: "#38BDF8",
    border: theme.palette.type === "dark" ? "1px solid rgba(56,189,248,0.35)" : "1px solid rgba(37,99,235,0.18)",
    background: theme.palette.type === "dark"
      ? "linear-gradient(180deg, rgba(37,99,235,0.22), rgba(2,8,23,0.38))"
      : "linear-gradient(180deg, #FFFFFF, #EAF3FF)",
    boxShadow: theme.palette.type === "dark"
      ? "0 16px 28px rgba(37,99,235,0.18)"
      : "0 12px 24px rgba(37,99,235,0.12)"
  },
  loginCard: {
    width: "100%",
    maxWidth: 340,
    justifySelf: "end",
    padding: theme.spacing(3),
    borderRadius: 16,
    border: theme.palette.type === "dark" ? "1px solid rgba(56,189,248,0.48)" : "1px solid #DCE5F2",
    background: theme.palette.type === "dark"
      ? "linear-gradient(180deg, rgba(15, 34, 68, 0.78), rgba(2, 8, 23, 0.82))"
      : "rgba(255, 255, 255, 0.92)",
    boxShadow: theme.palette.type === "dark"
      ? "0 0 0 1px rgba(37,99,235,0.14), 0 28px 70px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.12)"
      : "0 28px 70px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255,255,255,0.9)",
    backdropFilter: "blur(18px)",
    [theme.breakpoints.down("md")]: {
      padding: theme.spacing(2.75)
    },
    "@media (max-width: 900px) and (pointer: coarse)": {
      justifySelf: "center",
      maxWidth: 380
    },
    "@media (max-height: 760px) and (min-width: 901px)": {
      padding: theme.spacing(2.25),
      maxWidth: 340
    },
    [theme.breakpoints.down("sm")]: {
      justifySelf: "center"
    },
    [theme.breakpoints.down("xs")]: {
      padding: theme.spacing(2.5),
      borderRadius: 20
    }
  },
  cardLogo: {
    width: 150,
    maxWidth: "90%",
    display: "block",
    margin: "0 auto 18px",
    filter: "drop-shadow(0 12px 22px rgba(0, 178, 255, 0.24))",
    objectFit: "contain",
    [theme.breakpoints.down("xs")]: {
      width: 160,
      marginBottom: theme.spacing(2)
    },
    "@media (max-height: 760px)": {
      width: 130,
      marginBottom: theme.spacing(1)
    }
  },
  title: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: 800,
    lineHeight: 1.15,
    letterSpacing: 0,
    marginBottom: theme.spacing(0.75),
    [theme.breakpoints.down("xs")]: {
      fontSize: 23
    },
    "@media (max-height: 760px)": {
      fontSize: 22
    }
  },
  description: {
    textAlign: "center",
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(2),
    fontSize: 13,
    [theme.breakpoints.down("xs")]: {
      marginBottom: theme.spacing(2.5)
    },
    "@media (max-height: 760px)": {
      marginBottom: theme.spacing(1)
    }
  },
  form: {
    width: "100%"
  },
  fieldLabel: {
    color: theme.palette.text.primary,
    fontWeight: 700,
    marginTop: theme.spacing(1.25),
    marginBottom: theme.spacing(0.5),
    fontSize: 12,
    "@media (max-height: 760px)": {
      marginTop: theme.spacing(0.75),
      marginBottom: theme.spacing(0.5)
    }
  },
  textField: {
    "& .MuiOutlinedInput-root": {
      height: 42,
      color: theme.palette.text.primary,
      borderRadius: 10,
      background: theme.palette.type === "dark" ? "rgba(2, 8, 23, 0.42)" : "#FFFFFF",
      "& fieldset": {
        borderColor: theme.palette.type === "dark" ? "rgba(148,163,184,0.28)" : "#CBD5E1"
      },
      "&:hover fieldset": {
        borderColor: "rgba(56,189,248,0.52)"
      },
      "&.Mui-focused fieldset": {
        borderColor: "#38BDF8",
        boxShadow: "0 0 0 3px rgba(56,189,248,0.12)"
      }
    },
    "& .MuiInputBase-input::placeholder": {
      color: theme.palette.text.secondary,
      opacity: 1
    },
    "& .MuiSvgIcon-root": {
      color: "#94A3B8"
    },
    "& .MuiInputBase-input": {
      fontSize: 13,
      paddingTop: 11,
      paddingBottom: 11
    },
    "@media (max-height: 760px)": {
      "& .MuiOutlinedInput-root": {
        height: 40
      }
    }
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(2),
    marginTop: theme.spacing(1.5),
    color: theme.palette.text.secondary,
    "& .MuiCheckbox-root": {
      color: "#38BDF8",
      padding: 6
    },
    [theme.breakpoints.down("xs")]: {
      alignItems: "flex-start",
      flexDirection: "column",
      gap: theme.spacing(0.5)
    },
    "& .MuiFormControlLabel-label": {
      fontSize: 13
    },
    "@media (max-height: 760px)": {
      marginTop: theme.spacing(1)
    }
  },
  submit: {
    height: 42,
    marginTop: theme.spacing(1.75),
    borderRadius: 10,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: 800,
    textTransform: "none",
    background: "linear-gradient(90deg, #1663FF 0%, #14D9E8 100%)",
    boxShadow: "0 18px 34px rgba(20, 217, 232, 0.22)",
    "&:hover": {
      background: "linear-gradient(90deg, #0F56E8 0%, #10C8D9 100%)"
    },
    "@media (max-height: 760px)": {
      height: 40,
      marginTop: theme.spacing(1.25),
      fontSize: 13
    }
  },
  footer: {
    display: "none"
  }
}));

const Login = () => {
  const classes = useStyles();

  const [user, setUser] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberAccess, setRememberAccess] = useState(true);

  const { handleLogin } = useContext(AuthContext);

  const handleChangeInput = e => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handlSubmit = e => {
    e.preventDefault();
    handleLogin(user);
  };

  return (
    <main className={classes.page}>
      <CssBaseline />
      <div className={classes.shell}>
        <section className={classes.brandPanel}>
          <img src={rocketLoginLogo} alt="Rocket Service" className={classes.heroLogo} />
          <Typography component="h1" className={classes.headline}>
            Atendimento inteligente,
            <span>rapido e organizado</span>
          </Typography>
          <Typography className={classes.subtitle}>
            Centralize, gerencie e resolva solicitacoes com eficiencia e total visibilidade.
          </Typography>

          <div className={classes.benefits}>
            <div className={classes.benefit}>
              <div className={classes.benefitIcon}>
                <FlashOn />
              </div>
              Respostas mais rapidas
            </div>
            <div className={classes.benefit}>
              <div className={classes.benefitIcon}>
                <SecurityOutlined />
              </div>
              Seguranca e confianca
            </div>
            <div className={classes.benefit}>
              <div className={classes.benefitIcon}>
                <TrendingUp />
              </div>
              Produtividade e resultados
            </div>
          </div>
        </section>

        <section className={classes.loginCard}>
          <img src={rocketLoginLogo} alt="Rocket Service" className={classes.cardLogo} />
          <Typography component="h2" className={classes.title}>
            Entrar na plataforma
          </Typography>
          <Typography className={classes.description}>
            Acesse sua conta para continuar
          </Typography>

          <form className={classes.form} noValidate onSubmit={handlSubmit}>
            <Typography className={classes.fieldLabel}>E-mail</Typography>
            <TextField
              variant="outlined"
              required
              fullWidth
              id="email"
              name="email"
              value={user.email}
              onChange={handleChangeInput}
              autoComplete="email"
              autoFocus
              placeholder="Digite seu e-mail"
              className={classes.textField}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlined />
                  </InputAdornment>
                )
              }}
            />

            <Typography className={classes.fieldLabel}>Senha</Typography>
            <TextField
              variant="outlined"
              required
              fullWidth
              name="password"
              id="password"
              value={user.password}
              onChange={handleChangeInput}
              autoComplete="current-password"
              placeholder="Digite sua senha"
              type={showPassword ? "text" : "password"}
              className={classes.textField}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(current => !current)}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <div className={classes.row}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberAccess}
                    onChange={event => setRememberAccess(event.target.checked)}
                    color="primary"
                  />
                }
                label="Lembrar acesso"
              />
            </div>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              className={classes.submit}
              endIcon={<ArrowForward />}
            >
              {i18n.t("login.buttons.submit")}
            </Button>

          </form>
        </section>
      </div>

      <footer className={classes.footer}>
        <span>
          <SecurityOutlined style={{ fontSize: 18, verticalAlign: "middle", marginRight: 6 }} />
          Acesse com seguranca sua central de atendimento.
        </span>
        <span>|</span>
        <span>(c) 2026 RocketService. Todos os direitos reservados.</span>
      </footer>
    </main>
  );
};

export default Login;
