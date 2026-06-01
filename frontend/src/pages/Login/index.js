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
import rocketLogo from "../../assets/rocketservice-logo.png";

const useStyles = makeStyles(theme => ({
  page: {
    minHeight: "100dvh",
    position: "relative",
    overflowX: "hidden",
    overflowY: "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(2.5, 3),
    color: "#F8FAFC",
    background:
      "linear-gradient(135deg, #020817 0%, #061633 46%, #020817 100%)",
    "&:before": {
      content: '""',
      position: "absolute",
      inset: 0,
      opacity: 0.42,
      backgroundImage:
        "linear-gradient(rgba(56,189,248,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.08) 1px, transparent 1px)",
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
      alignItems: "flex-start"
    }
  },
  shell: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 1360,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(360px, 480px)",
    gap: theme.spacing(5),
    alignItems: "center",
    padding: theme.spacing(1, 0, 5),
    [theme.breakpoints.down("md")]: {
      maxWidth: 980,
      gridTemplateColumns: "minmax(0, 1fr) minmax(360px, 460px)",
      gap: theme.spacing(4)
    },
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr",
      gap: theme.spacing(3),
      maxWidth: 560,
      padding: theme.spacing(1, 0, 2)
    }
  },
  brandPanel: {
    position: "relative",
    paddingLeft: 0,
    minWidth: 0,
    maxWidth: 520,
    minHeight: 650,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    transform: "translateX(-38px)",
    "&:before": {
      content: '""',
      position: "absolute",
      zIndex: -1,
      width: 760,
      height: 760,
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      borderRadius: "50%",
      border: "1px solid rgba(37,99,235,0.2)",
      boxShadow:
        "0 0 0 52px rgba(37,99,235,0.04), 0 0 0 112px rgba(56,189,248,0.028)",
      pointerEvents: "none"
    },
    [theme.breakpoints.down("md")]: {
      paddingLeft: 0,
      maxWidth: 460,
      minHeight: 610,
      transform: "translateX(-16px)",
      "&:before": {
        width: 680,
        height: 680
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
    }
  },
  heroLogo: {
    width: "min(420px, 100%)",
    display: "block",
    marginLeft: "auto",
    marginRight: "auto",
    marginBottom: theme.spacing(2),
    filter: "drop-shadow(0 18px 32px rgba(0, 178, 255, 0.28))",
    objectFit: "contain",
    [theme.breakpoints.down("md")]: {
      maxWidth: 350,
      marginBottom: theme.spacing(1.5)
    },
    [theme.breakpoints.down("sm")]: {
      margin: "0 auto 10px",
      maxWidth: 300
    }
  },
  headline: {
    maxWidth: 460,
    fontSize: 34,
    lineHeight: 1.08,
    fontWeight: 800,
    letterSpacing: 0,
    textAlign: "center",
    marginBottom: theme.spacing(1.25),
    "& span": {
      display: "block",
      color: "#38BDF8"
    },
    [theme.breakpoints.down("sm")]: {
      margin: "0 auto 10px",
      fontSize: 28
    },
    [theme.breakpoints.down("xs")]: {
      fontSize: 26
    }
  },
  subtitle: {
    maxWidth: 420,
    color: "#CBD5E1",
    fontSize: 16,
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
    gridTemplateColumns: "repeat(3, minmax(96px, 118px))",
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
    color: "#D9E7FF",
    fontSize: 13,
    lineHeight: 1.32
  },
  benefitIcon: {
    width: 48,
    height: 48,
    margin: "0 auto 8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    color: "#38BDF8",
    border: "1px solid rgba(56,189,248,0.35)",
    background:
      "linear-gradient(180deg, rgba(37,99,235,0.22), rgba(2,8,23,0.38))",
    boxShadow: "0 16px 28px rgba(37,99,235,0.18)"
  },
  loginCard: {
    width: "100%",
    maxWidth: 480,
    justifySelf: "end",
    padding: theme.spacing(3.5, 4),
    borderRadius: 24,
    border: "1px solid rgba(56,189,248,0.48)",
    background:
      "linear-gradient(180deg, rgba(15, 34, 68, 0.78), rgba(2, 8, 23, 0.82))",
    boxShadow:
      "0 0 0 1px rgba(37,99,235,0.14), 0 28px 70px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.12)",
    backdropFilter: "blur(18px)",
    [theme.breakpoints.down("md")]: {
      padding: theme.spacing(4)
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
    width: 225,
    maxWidth: "90%",
    display: "block",
    margin: "0 auto 16px",
    filter: "drop-shadow(0 12px 22px rgba(0, 178, 255, 0.24))",
    objectFit: "contain",
    [theme.breakpoints.down("xs")]: {
      width: 220,
      marginBottom: theme.spacing(2)
    }
  },
  title: {
    textAlign: "center",
    fontSize: 30,
    fontWeight: 800,
    lineHeight: 1.15,
    letterSpacing: 0,
    marginBottom: theme.spacing(0.75),
    [theme.breakpoints.down("xs")]: {
      fontSize: 26
    }
  },
  description: {
    textAlign: "center",
    color: "#CBD5E1",
    marginBottom: theme.spacing(2.5),
    [theme.breakpoints.down("xs")]: {
      marginBottom: theme.spacing(2.5)
    }
  },
  form: {
    width: "100%"
  },
  fieldLabel: {
    color: "#F8FAFC",
    fontWeight: 700,
    marginTop: theme.spacing(1.5),
    marginBottom: theme.spacing(0.75)
  },
  textField: {
    "& .MuiOutlinedInput-root": {
      height: 56,
      color: "#F8FAFC",
      borderRadius: 10,
      background: "rgba(2, 8, 23, 0.42)",
      "& fieldset": {
        borderColor: "rgba(148,163,184,0.28)"
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
      color: "#94A3B8",
      opacity: 1
    },
    "& .MuiSvgIcon-root": {
      color: "#94A3B8"
    }
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(2),
    marginTop: theme.spacing(2),
    color: "#E2E8F0",
    "& .MuiCheckbox-root": {
      color: "#38BDF8",
      padding: 6
    },
    [theme.breakpoints.down("xs")]: {
      alignItems: "flex-start",
      flexDirection: "column",
      gap: theme.spacing(0.5)
    }
  },
  submit: {
    height: 54,
    marginTop: theme.spacing(2.5),
    borderRadius: 10,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: 800,
    textTransform: "none",
    background: "linear-gradient(90deg, #1663FF 0%, #14D9E8 100%)",
    boxShadow: "0 18px 34px rgba(20, 217, 232, 0.22)",
    "&:hover": {
      background: "linear-gradient(90deg, #0F56E8 0%, #10C8D9 100%)"
    }
  },
  footer: {
    position: "absolute",
    left: "50%",
    bottom: 14,
    transform: "translateX(-50%)",
    zIndex: 1,
    width: "min(860px, calc(100% - 32px))",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: theme.spacing(3),
    color: "#94A3B8",
    fontSize: 14,
    [theme.breakpoints.down("md")]: {
      display: "none"
    },
    "@media (max-height: 820px)": {
      position: "relative",
      left: "auto",
      bottom: "auto",
      transform: "none",
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(2)
    },
    [theme.breakpoints.down("sm")]: {
      display: "none"
    }
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
          <img src={rocketLogo} alt="RocketService" className={classes.heroLogo} />
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
          <img src={rocketLogo} alt="RocketService" className={classes.cardLogo} />
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
