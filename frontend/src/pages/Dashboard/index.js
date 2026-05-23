import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Button,
  Chip,
  Container,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@material-ui/core";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import GetAppIcon from "@material-ui/icons/GetApp";
import PictureAsPdfIcon from "@material-ui/icons/PictureAsPdf";
import SearchIcon from "@material-ui/icons/Search";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles(theme => ({
  root: {
    flex: 1,
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(3),
    overflowY: "auto",
    ...theme.scrollbarStyles
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2)
  },
  filters: {
    display: "flex",
    gap: theme.spacing(1),
    alignItems: "center",
    flexWrap: "wrap"
  },
  metric: {
    padding: theme.spacing(2),
    minHeight: 118,
    borderLeft: "4px solid transparent"
  },
  metricLabel: {
    color: theme.palette.text.secondary,
    fontSize: 13,
    textTransform: "uppercase",
    fontWeight: 600
  },
  metricValue: {
    fontWeight: 700,
    marginTop: theme.spacing(1)
  },
  panel: {
    padding: theme.spacing(2),
    minHeight: 330
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(1)
  },
  tablePanel: {
    padding: theme.spacing(2)
  },
  history: {
    maxHeight: 460,
    overflowY: "auto",
    borderTop: "1px solid rgba(0, 0, 0, 0.08)"
  },
  conversation: {
    padding: theme.spacing(1.5),
    borderBottom: "1px solid rgba(0, 0, 0, 0.08)"
  },
  message: {
    marginTop: theme.spacing(0.75),
    padding: theme.spacing(1),
    borderRadius: 6,
    background: theme.palette.background.default
  },
  "@media print": {
    noPrint: {
      display: "none !important"
    },
    root: {
      overflow: "visible"
    },
    history: {
      maxHeight: "none",
      overflow: "visible"
    }
  }
}));

const getDefaultStartDate = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
};

const today = () => new Date().toISOString().slice(0, 10);

const chartColors = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2"];

const emptyDashboard = {
  summary: { total: 0, open: 0, pending: 0, closed: 0 },
  byCategory: [],
  byReason: [],
  byQueue: [],
  byUser: [],
  byDay: []
};

const Dashboard = () => {
  const classes = useStyles();
  const theme = useTheme();
  const { user } = useContext(AuthContext);
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(today());
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [historySearch, setHistorySearch] = useState("");
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const params = useMemo(() => ({ startDate, endDate }), [startDate, endDate]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const { data } = await api.get("/reports/dashboard", { params });
        setDashboard(data);
      } catch (err) {
        toastError(err);
      }
    };

    loadDashboard();
  }, [params]);

  const loadHistory = async () => {
    if (user?.profile !== "admin") return;

    setLoadingHistory(true);
    try {
      const { data } = await api.get("/reports/conversations", {
        params: { ...params, searchParam: historySearch }
      });
      setHistory(data);
    } catch (err) {
      toastError(err);
    }
    setLoadingHistory(false);
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, user?.profile]);

  const exportTickets = async () => {
    try {
      const { data } = await api.get("/reports/tickets/export", {
        params,
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([data], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `relatorio-atendimentos-${startDate}-${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toastError(err);
    }
  };

  const metrics = [
    { label: "Atendimentos", value: dashboard.summary.total, color: "#2563eb" },
    { label: "Em atendimento", value: dashboard.summary.open, color: "#16a34a" },
    { label: "Aguardando", value: dashboard.summary.pending, color: "#f59e0b" },
    { label: "Resolvidos", value: dashboard.summary.closed, color: "#7c3aed" }
  ];

  const renderBarChart = data => (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 20, left: -18, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, .35)" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-20} textAnchor="end" height={58} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="total" radius={[4, 4, 0, 0]} fill={theme.palette.primary.main} />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderPieChart = data => (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="total" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );

  return (
    <Container maxWidth={false} className={classes.root}>
      <div className={`${classes.header} ${classes.noPrint}`}>
        <div>
          <Typography variant="h5">Dashboard operacional</Typography>
          <Typography variant="body2" color="textSecondary">
            Relatórios consolidados por categoria, motivo, atendente e período.
          </Typography>
        </div>
        <div className={classes.filters}>
          <TextField
            type="date"
            label="Inicio"
            variant="outlined"
            margin="dense"
            value={startDate}
            onChange={event => setStartDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            type="date"
            label="Fim"
            variant="outlined"
            margin="dense"
            value={endDate}
            onChange={event => setEndDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          {user?.profile === "admin" && (
            <Button color="primary" variant="contained" startIcon={<GetAppIcon />} onClick={exportTickets}>
              Excel
            </Button>
          )}
        </div>
      </div>

      <Grid container spacing={2}>
        {metrics.map(metric => (
          <Grid item xs={12} sm={6} md={3} key={metric.label}>
            <Paper className={classes.metric} style={{ borderLeftColor: metric.color }}>
              <Typography className={classes.metricLabel}>{metric.label}</Typography>
              <Typography variant="h3" className={classes.metricValue}>
                {metric.value}
              </Typography>
            </Paper>
          </Grid>
        ))}

        <Grid item xs={12} md={7}>
          <Paper className={classes.panel}>
            <div className={classes.panelHeader}>
              <Typography variant="h6">Atendimentos por dia</Typography>
              <Chip size="small" label={`${startDate} a ${endDate}`} />
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dashboard.byDay} margin={{ top: 10, right: 20, left: -18, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, .35)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper className={classes.panel}>
            <Typography variant="h6">Por categoria</Typography>
            {dashboard.byCategory.length ? renderPieChart(dashboard.byCategory) : (
              <Typography color="textSecondary">Sem dados no período.</Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper className={classes.panel}>
            <Typography variant="h6">Por motivo de fechamento</Typography>
            {dashboard.byReason.length ? renderBarChart(dashboard.byReason) : (
              <Typography color="textSecondary">Sem dados no período.</Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper className={classes.panel}>
            <Typography variant="h6">Detalhamento por categoria</Typography>
            {dashboard.byCategory.length ? renderBarChart(dashboard.byCategory) : (
              <Typography color="textSecondary">Sem dados no período.</Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper className={classes.tablePanel}>
            <Typography variant="h6">Ranking por atendente</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Atendente</TableCell>
                  <TableCell align="right">Atendimentos</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dashboard.byUser.map(row => (
                  <TableRow key={row.name}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell align="right">{row.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        {user?.profile === "admin" && (
          <Grid item xs={12} md={6}>
            <Paper className={classes.tablePanel}>
              <div className={`${classes.panelHeader} ${classes.noPrint}`}>
                <Typography variant="h6">Histórico de conversas</Typography>
                <Button startIcon={<PictureAsPdfIcon />} onClick={() => window.print()}>
                  PDF
                </Button>
              </div>
              <div className={`${classes.filters} ${classes.noPrint}`} style={{ marginBottom: 12 }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  margin="dense"
                  placeholder="Buscar contato"
                  value={historySearch}
                  onChange={event => setHistorySearch(event.target.value)}
                  InputProps={{ startAdornment: <SearchIcon color="action" /> }}
                />
                <Button variant="outlined" onClick={loadHistory}>
                  Buscar
                </Button>
              </div>
              <div className={classes.history}>
                {history.map(ticket => (
                  <div className={classes.conversation} key={ticket.id}>
                    <Typography variant="subtitle2">
                      #{ticket.id} - {ticket.contact?.name} - {ticket.status}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Fila: {ticket.queue?.name || "Sem fila"} | Atendente: {ticket.user?.name || "Sem atendente"} |
                      Categoria: {ticket.category?.name || "Nao informada"} | Motivo: {ticket.closingReason?.name || "Nao informado"}
                    </Typography>
                    {(ticket.messages || []).map(message => (
                      <div className={classes.message} key={message.id}>
                        <Typography variant="caption" color="textSecondary">
                          {message.fromMe ? "Atendente" : "Contato"} - {new Date(message.createdAt).toLocaleString()}
                        </Typography>
                        <Typography variant="body2">{message.body || `[${message.mediaType || "midia"}]`}</Typography>
                      </div>
                    ))}
                  </div>
                ))}
                {!history.length && (
                  <Typography color="textSecondary">
                    {loadingHistory ? "Carregando..." : "Nenhuma conversa encontrada."}
                  </Typography>
                )}
              </div>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default Dashboard;
