import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
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
import AssignmentTurnedInIcon from "@material-ui/icons/AssignmentTurnedIn";
import ChatBubbleOutlineIcon from "@material-ui/icons/ChatBubbleOutline";
import DoneAllIcon from "@material-ui/icons/DoneAll";
import HourglassEmptyIcon from "@material-ui/icons/HourglassEmpty";
import PictureAsPdfIcon from "@material-ui/icons/PictureAsPdf";
import SearchIcon from "@material-ui/icons/Search";
import VisibilityIcon from "@material-ui/icons/Visibility";
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
import { useBranding } from "../../context/Branding";
import { getBackendUrl } from "../../config";
import { EmptyState, MetricCard, SectionPanel } from "../../components/ExecutiveLayout";

const useStyles = makeStyles(theme => ({
  root: {
    flex: 1,
    paddingTop: theme.spacing(2.5),
    paddingBottom: theme.spacing(3),
    overflowY: "auto",
    ...theme.scrollbarStyles
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
	alignItems: "center",
    gap: theme.spacing(2),
	marginBottom: theme.spacing(2),
    paddingBottom: theme.spacing(1.5),
    borderBottom: `1px solid ${theme.palette.divider}`,
    [theme.breakpoints.down("sm")]: {
      flexDirection: "column"
    }
  },
  headerEyebrow: {
    color: theme.palette.primary.main,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.5,
	textTransform: "none",
    marginBottom: theme.spacing(0.5)
  },
  headerTitle: {
    fontWeight: 800,
    letterSpacing: 0,
	marginBottom: theme.spacing(0.5),
	fontSize: 26
  },
  headerSubtitle: {
    maxWidth: 720,
    color: theme.palette.text.secondary
  },
  filters: {
    display: "flex",
    gap: theme.spacing(1),
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
	padding: 0,
    [theme.breakpoints.down("sm")]: {
      width: "100%",
      justifyContent: "flex-start"
    }
  },
  metric: {
    padding: theme.spacing(2),
    minHeight: 118,
    borderLeft: "4px solid transparent",
    borderRadius: 8,
    borderTop: `1px solid ${theme.palette.divider}`,
    borderRight: `1px solid ${theme.palette.divider}`,
    borderBottom: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.custom?.cardShadow,
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
    minHeight: 330,
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.custom?.cardShadow,
    background: theme.palette.background.paper,
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(1)
  },
  tablePanel: {
    padding: theme.spacing(2),
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.custom?.cardShadow,
    background: theme.palette.background.paper,
  },
  history: {
    overflowX: "auto",
    borderTop: `1px solid ${theme.palette.divider}`,
    ...theme.scrollbarStyles,
  },
  conversationDialogMeta: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(2),
    [theme.breakpoints.down("xs")]: {
      gridTemplateColumns: "1fr"
    }
  },
  message: {
    marginTop: theme.spacing(0.75),
    padding: theme.spacing(1),
    borderRadius: 8,
    background: theme.palette.background.default,
    border: `1px solid ${theme.palette.divider}`,
  },
  "@media print": {
    noPrint: {
      display: "none !important"
    },
    printOnlyDialog: {
      display: "block !important"
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
  byDay: [],
  attendants: []
};

const escapeHtml = value =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatPdfDate = value => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const Dashboard = () => {
  const classes = useStyles();
  const theme = useTheme();
  const { user } = useContext(AuthContext);
  const branding = useBranding();
  const canViewFullDashboard = ["admin", "supervisor"].includes(user?.profile);
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(today());
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [historySearch, setHistorySearch] = useState("");
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [satisfaction, setSatisfaction] = useState({ summary: { total: 0, average: 0 }, responses: [] });

  const params = useMemo(() => ({ startDate, endDate }), [startDate, endDate]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [{ data }, satisfactionResponse] = await Promise.all([
          api.get("/reports/dashboard", { params }),
          canViewFullDashboard
            ? api.get("/reports/satisfaction", { params })
            : Promise.resolve({ data: { summary: { total: 0, average: 0 }, responses: [] } })
        ]);
        setDashboard(data);
        setSatisfaction(satisfactionResponse.data);
      } catch (err) {
        toastError(err);
      }
    };

    loadDashboard();
  }, [canViewFullDashboard, params, user?.profile]);

  const loadHistory = async () => {
    if (!canViewFullDashboard) return;

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
  }, [canViewFullDashboard, params, user?.profile]);

  const exportTickets = async () => {
    try {
      const { data } = await api.get("/reports/tickets/export", {
        params,
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `relatorio-atendimentos-${startDate}-${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toastError(err);
    }
  };

  const exportSatisfaction = async () => {
    try {
      const { data } = await api.get("/reports/satisfaction/export", {
        params,
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `relatorio-pesquisa-satisfacao-${startDate}-${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toastError(err);
    }
  };

  const openConversation = async ticketId => {
    setLoadingConversation(true);
    try {
      const { data } = await api.get(`/reports/conversations/${ticketId}`);
      setSelectedConversation(data);
    } catch (err) {
      toastError(err);
    }
    setLoadingConversation(false);
  };

  const printConversationPdf = () => {
    if (!selectedConversation) return;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      window.print();
      return;
    }

    const companyName = branding.companyFantasyName || branding.brandName || branding.companyLegalName || "Rocket Service";
    const legalName = branding.companyLegalName && branding.companyLegalName !== companyName
      ? branding.companyLegalName
      : "";
    const backendUrl = getBackendUrl() || "http://localhost:8085";
    const logoUrl = branding.brandLogo ? `${backendUrl}${branding.brandLogo}` : "";
    const issuedAt = formatPdfDate(new Date());
    const footerParts = [
      branding.companyAddress,
      branding.companyPhone,
      branding.companyEmail,
      branding.companyWebsite
    ].filter(Boolean);

    const rows = (selectedConversation.messages || []).map(message => {
      const origin = message.fromMe ? "Atendente / Sistema" : "Cliente";
      const deletedBy = message.deletedAudit?.userName || "";
      const deletedAt = message.deletedAudit?.createdAt ? formatPdfDate(message.deletedAudit.createdAt) : "";
      const deletionInfo = message.isDeleted
        ? [
            "Mensagem deletada",
            deletedBy ? `por ${deletedBy}` : "",
            deletedAt ? `em ${deletedAt}` : ""
          ].filter(Boolean).join(" ")
        : "";
      const body = message.isDeleted
        ? `${deletionInfo}.\nConteudo registrado: ${message.body || `[${message.mediaType || "midia"}]`}`
        : message.body || `[${message.mediaType || "midia"}]`;
      return `
      <tr>
        <td>${escapeHtml(formatPdfDate(message.createdAt))}</td>
        <td><span class="origin ${message.fromMe ? "origin-agent" : "origin-client"}">${escapeHtml(origin)}</span></td>
        <td class="${message.isDeleted ? "deletedMessage" : ""}">${escapeHtml(body).replace(/\n/g, "<br />")}</td>
      </tr>
    `;
    }).join("");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Relatorio de Atendimento #${escapeHtml(selectedConversation.id)}</title>
          <style>
            @page { margin: 18mm 14mm 22mm; }
            * { box-sizing: border-box; }
            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #0f172a;
              margin: 0;
              background: #ffffff;
              font-size: 12px;
            }
            .document { padding: 0 0 18px; }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 24px;
              padding-bottom: 16px;
              border-bottom: 2px solid #1d4ed8;
              margin-bottom: 18px;
            }
            .brand { display: flex; align-items: center; gap: 14px; min-width: 0; }
            .logoBox {
              width: 86px;
              height: 54px;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
              background: #f8fafc;
              color: #1d4ed8;
              font-weight: 800;
              font-size: 22px;
            }
            .logoBox img { width: 100%; height: 100%; object-fit: contain; padding: 6px; }
            .brandName { font-size: 17px; font-weight: 800; line-height: 1.2; }
            .legalName { color: #475569; margin-top: 3px; }
            .titleBlock { text-align: right; white-space: nowrap; }
            .titleBlock h1 { font-size: 19px; margin: 0 0 6px; }
            .titleBlock div { color: #475569; line-height: 1.5; }
            .sectionTitle {
              font-size: 13px;
              font-weight: 800;
              color: #1d4ed8;
              text-transform: uppercase;
              margin: 18px 0 10px;
            }
            .metaGrid {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 8px;
              margin-bottom: 14px;
            }
            .metaItem {
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 9px 10px;
              min-height: 54px;
              background: #f8fafc;
            }
            .metaLabel {
              display: block;
              color: #64748b;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .metaValue { font-size: 12px; font-weight: 700; overflow-wrap: anywhere; }
            table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
            th, td {
              border: 1px solid #d8dee9;
              padding: 8px;
              text-align: left;
              vertical-align: top;
              line-height: 1.45;
            }
            th {
              background: #eef4ff;
              color: #1e3a8a;
              font-size: 10.5px;
              text-transform: uppercase;
              letter-spacing: .02em;
            }
            td:nth-child(1) { width: 132px; color: #475569; }
            td:nth-child(2) { width: 142px; }
            .origin {
              display: inline-block;
              border-radius: 999px;
              padding: 3px 7px;
              font-size: 10px;
              font-weight: 800;
              white-space: nowrap;
            }
            .origin-agent { background: #dbeafe; color: #1d4ed8; }
            .origin-client { background: #dcfce7; color: #166534; }
            .deletedMessage {
              color: #7f1d1d;
              background: #fef2f2;
              font-style: italic;
            }
            .footer {
              position: fixed;
              left: 0;
              right: 0;
              bottom: 0;
              border-top: 1px solid #cbd5e1;
              padding-top: 7px;
              display: flex;
              justify-content: space-between;
              gap: 16px;
              color: #475569;
              font-size: 10px;
              line-height: 1.35;
              background: #ffffff;
            }
            .footerCompany { max-width: 74%; }
            .footerRight { text-align: right; white-space: nowrap; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="document">
            <header class="header">
              <div class="brand">
                <div class="logoBox">
                  ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(companyName)}" />` : escapeHtml(companyName.charAt(0).toUpperCase())}
                </div>
                <div>
                  <div class="brandName">${escapeHtml(companyName)}</div>
                  ${legalName ? `<div class="legalName">${escapeHtml(legalName)}</div>` : ""}
                </div>
              </div>
              <div class="titleBlock">
                <h1>Relatorio de Atendimento</h1>
                <div>Ticket #${escapeHtml(selectedConversation.id)}</div>
                <div>Emitido em ${escapeHtml(issuedAt)}</div>
              </div>
            </header>

            <div class="sectionTitle">Dados do atendimento</div>
            <section class="metaGrid">
              <div class="metaItem"><span class="metaLabel">Cliente</span><span class="metaValue">${escapeHtml(selectedConversation.contact?.name || "Contato")}</span></div>
              <div class="metaItem"><span class="metaLabel">WhatsApp</span><span class="metaValue">${escapeHtml(selectedConversation.contact?.number || "-")}</span></div>
              <div class="metaItem"><span class="metaLabel">Fila</span><span class="metaValue">${escapeHtml(selectedConversation.queue?.name || "Sem fila")}</span></div>
              <div class="metaItem"><span class="metaLabel">Atendente</span><span class="metaValue">${escapeHtml(selectedConversation.user?.name || "Sem atendente")}</span></div>
              <div class="metaItem"><span class="metaLabel">Categoria</span><span class="metaValue">${escapeHtml(selectedConversation.category?.name || "Nao informada")}</span></div>
              <div class="metaItem"><span class="metaLabel">Motivo</span><span class="metaValue">${escapeHtml(selectedConversation.closingReason?.name || "Nao informado")}</span></div>
              <div class="metaItem"><span class="metaLabel">Abertura</span><span class="metaValue">${escapeHtml(formatPdfDate(selectedConversation.createdAt))}</span></div>
              <div class="metaItem"><span class="metaLabel">Conclusao</span><span class="metaValue">${escapeHtml(formatPdfDate(selectedConversation.updatedAt))}</span></div>
            </section>

            <div class="sectionTitle">Historico da conversa</div>
            <table>
              <thead>
                <tr>
                  <th>Data/hora</th>
                  <th>Origem</th>
                  <th>Mensagem</th>
                </tr>
              </thead>
              <tbody>${rows || `<tr><td colspan="3">Nenhuma mensagem encontrada.</td></tr>`}</tbody>
            </table>
          </div>

          <footer class="footer">
            <div class="footerCompany">
              <strong>${escapeHtml(companyName)}</strong>${branding.companyCnpj ? ` | CNPJ ${escapeHtml(branding.companyCnpj)}` : ""}
              ${footerParts.length ? `<br />${escapeHtml(footerParts.join(" | "))}` : ""}
            </div>
            <div class="footerRight">
              Gerado automaticamente<br />
              pelo Rocket Service
            </div>
          </footer>
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const metrics = [
    {
      label: "Atendimentos",
      value: dashboard.summary.total,
      helper: "Volume total no periodo selecionado.",
      tone: "primary",
      icon: AssignmentTurnedInIcon
    },
    {
      label: "Em atendimento",
      value: dashboard.summary.open,
      helper: "Conversas sob responsabilidade da equipe.",
      tone: "success",
      icon: ChatBubbleOutlineIcon
    },
    {
      label: "Aguardando",
      value: dashboard.summary.pending,
      helper: "Demandas pendentes de primeira acao.",
      tone: "warning",
      icon: HourglassEmptyIcon
    },
    {
      label: "Resolvidos",
      value: dashboard.summary.closed,
      helper: "Atendimentos finalizados no periodo.",
      tone: "purple",
      icon: DoneAllIcon
    }
  ];

  const attendantStatusLabels = {
    online: "Online",
    away: "Inativo",
    offline: "Deslogado",
  };

  const attendantStatusColors = {
    online: "#22C55E",
    away: "#F59E0B",
    offline: "#94A3B8",
  };

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
		  <Typography className={classes.headerEyebrow}>Gestão / Painel</Typography>
          <Typography variant="h4" className={classes.headerTitle}>Dashboard operacional</Typography>
          <Typography variant="body2" className={classes.headerSubtitle}>
            Acompanhe demanda, produtividade, satisfacao e historico de atendimentos em um unico painel.
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
          {canViewFullDashboard && (
            <Button color="primary" variant="contained" startIcon={<GetAppIcon />} onClick={exportTickets}>
              Excel
            </Button>
          )}
        </div>
      </div>

      <Grid container spacing={2}>
        {metrics.map(metric => (
          <Grid item xs={12} sm={6} md={3} key={metric.label}>
            <MetricCard
              label={metric.label}
              value={metric.value}
              helper={metric.helper}
              icon={metric.icon}
              tone={metric.tone}
            />
          </Grid>
        ))}

        <Grid item xs={12} md={7}>
          <SectionPanel
            title="Atendimentos por dia"
            description="Evolucao diaria do volume recebido no periodo."
            dense
            action={<Chip size="small" label={`${startDate} a ${endDate}`} />}
          >
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dashboard.byDay} margin={{ top: 10, right: 20, left: -18, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, .35)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </SectionPanel>
        </Grid>

        <Grid item xs={12} md={5}>
          <SectionPanel title="Por categoria" description="Distribuicao das demandas registradas." dense>
            {dashboard.byCategory.length ? renderPieChart(dashboard.byCategory) : (
              <EmptyState title="Sem dados no periodo" description="Nenhum atendimento foi encontrado para os filtros atuais." />
            )}
          </SectionPanel>
        </Grid>

        <Grid item xs={12} md={6}>
          <SectionPanel title="Por motivo de fechamento" description="Principais motivos de conclusao dos atendimentos." dense>
            {dashboard.byReason.length ? renderBarChart(dashboard.byReason) : (
              <EmptyState title="Sem dados no periodo" description="Os atendimentos finalizados aparecerao aqui." />
            )}
          </SectionPanel>
        </Grid>

        <Grid item xs={12} md={6}>
          <SectionPanel title="Detalhamento por categoria" description="Volume consolidado por tipo de demanda." dense>
            {dashboard.byCategory.length ? renderBarChart(dashboard.byCategory) : (
              <EmptyState title="Sem dados no periodo" description="A distribuicao por categoria sera exibida apos novos atendimentos." />
            )}
          </SectionPanel>
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

        {canViewFullDashboard && (
          <Grid item xs={12}>
            <Paper className={classes.tablePanel}>
              <div className={classes.panelHeader}>
                <div>
                  <Typography variant="h6">Auditoria dos atendentes</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Status operacional, ultima atividade e atendimentos ativos por usuario.
                  </Typography>
                </div>
                <Chip size="small" label={`${dashboard.attendants?.length || 0} usuarios`} />
              </div>
              <div className={classes.history}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Usuario</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Ultima atividade</TableCell>
                      <TableCell>Filas</TableCell>
                      <TableCell align="right">Atendimentos ativos</TableCell>
                      <TableCell>Atendimentos em andamento</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(dashboard.attendants || []).map(attendant => (
                      <TableRow key={attendant.id}>
                        <TableCell>
                          <Typography variant="body2">{attendant.name}</Typography>
                          <Typography variant="caption" color="textSecondary">{attendant.email}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={attendantStatusLabels[attendant.operationalStatus] || "Deslogado"}
                            style={{
                              backgroundColor: attendantStatusColors[attendant.operationalStatus] || attendantStatusColors.offline,
                              color: "#fff",
                              fontWeight: 700
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {attendant.lastActivityAt
                            ? new Date(attendant.lastActivityAt).toLocaleString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {(attendant.queues || []).length
                            ? attendant.queues.map(queue => queue.name).join(", ")
                            : "Sem fila"}
                        </TableCell>
                        <TableCell align="right">{attendant.activeTicketsCount || 0}</TableCell>
                        <TableCell>
                          {(attendant.activeTickets || []).length ? (
                            attendant.activeTickets.map(ticket => (
                              <Typography key={ticket.id} variant="caption" display="block">
                                #{ticket.id} - {ticket.contact?.name || "Contato"} / {ticket.queue?.name || "Sem fila"}
                              </Typography>
                            ))
                          ) : (
                            <Typography variant="caption" color="textSecondary">Nenhum atendimento ativo</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!(dashboard.attendants || []).length && (
                      <TableRow>
                        <TableCell colSpan={6}>Nenhum usuario encontrado.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Paper>
          </Grid>
        )}

        {canViewFullDashboard && (
          <Grid item xs={12}>
            <Paper className={classes.tablePanel}>
              <div className={classes.panelHeader}>
                <Typography variant="h6">Pesquisa de satisfação</Typography>
                <Chip
                  size="small"
                  color="primary"
                  label={`Média ${satisfaction.summary.average || 0}`}
                />
                <Button size="small" color="primary" variant="outlined" startIcon={<GetAppIcon />} onClick={exportSatisfaction}>
                  Excel
                </Button>
              </div>
              <Typography variant="body2" color="textSecondary">
                {satisfaction.summary.total || 0} resposta(s) no período.
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Contato</TableCell>
                    <TableCell>Atendente</TableCell>
                    <TableCell>Categoria</TableCell>
                    <TableCell>Motivo</TableCell>
                    <TableCell align="right">Nota</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Comentário</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(satisfaction.responses || []).slice(0, 8).map(row => (
                    <TableRow key={row.id}>
                      <TableCell>{row.contact?.name || "Contato"}</TableCell>
                      <TableCell>{row.user?.name || "Sem atendente"}</TableCell>
                      <TableCell>{row.category?.name || "Nao informada"}</TableCell>
                      <TableCell>{row.closingReason?.name || "Nao informado"}</TableCell>
                      <TableCell align="right">{row.rating}</TableCell>
                      <TableCell>{row.feedbackType || "-"}</TableCell>
                      <TableCell>{row.feedbackText || "Sem comentario"}</TableCell>
                    </TableRow>
                  ))}
                  {!(satisfaction.responses || []).length && (
                    <TableRow>
                      <TableCell colSpan={7}>Nenhuma resposta encontrada.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Grid>
        )}

        {canViewFullDashboard && (
          <Grid item xs={12}>
            <Paper className={classes.tablePanel}>
              <div className={`${classes.panelHeader} ${classes.noPrint}`}>
                <div>
                  <Typography variant="h6">Conversas concluidas</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Consulte atendimentos finalizados e abra uma conversa para visualizar ou gerar PDF.
                  </Typography>
                </div>
              </div>
              <div className={`${classes.filters} ${classes.noPrint}`} style={{ marginBottom: 12 }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  margin="dense"
                  placeholder="Buscar por contato, telefone, fila, atendente, categoria, motivo, status, protocolo ou mensagem"
                  value={historySearch}
                  onChange={event => setHistorySearch(event.target.value)}
                  InputProps={{ startAdornment: <SearchIcon color="action" /> }}
                />
                <Button variant="outlined" onClick={loadHistory}>
                  Buscar
                </Button>
              </div>
              <div className={classes.history}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Contato</TableCell>
                      <TableCell>Telefone</TableCell>
                      <TableCell>Atendente</TableCell>
                      <TableCell>Categoria</TableCell>
                      <TableCell>Motivo</TableCell>
                      <TableCell>Data/hora</TableCell>
                      <TableCell align="right">Acoes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.map(ticket => (
                      <TableRow key={ticket.id}>
                        <TableCell>#{ticket.id}</TableCell>
                        <TableCell>{ticket.contact?.name || "Contato"}</TableCell>
                        <TableCell>{ticket.contact?.number || "-"}</TableCell>
                        <TableCell>{ticket.user?.name || "Sem atendente"}</TableCell>
                        <TableCell>{ticket.category?.name || "Nao informada"}</TableCell>
                        <TableCell>{ticket.closingReason?.name || "Nao informado"}</TableCell>
                        <TableCell>{new Date(ticket.updatedAt).toLocaleString()}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => openConversation(ticket.id)}>
                            <VisibilityIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!history.length && (
                      <TableRow>
                        <TableCell colSpan={8}>
                          {loadingHistory ? "Carregando..." : "Nenhuma conversa concluida encontrada."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Paper>
          </Grid>
        )}
      </Grid>

      <Dialog
        open={!!selectedConversation || loadingConversation}
        onClose={() => setSelectedConversation(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Conversa concluida {selectedConversation ? `#${selectedConversation.id}` : ""}
        </DialogTitle>
        <DialogContent>
          {loadingConversation && !selectedConversation ? (
            <Typography>Carregando conversa...</Typography>
          ) : selectedConversation ? (
            <div>
              <div className={classes.conversationDialogMeta}>
                <Typography variant="body2"><strong>Contato:</strong> {selectedConversation.contact?.name || "Contato"}</Typography>
                <Typography variant="body2"><strong>Telefone:</strong> {selectedConversation.contact?.number || "-"}</Typography>
                <Typography variant="body2"><strong>Atendente:</strong> {selectedConversation.user?.name || "Sem atendente"}</Typography>
                <Typography variant="body2"><strong>Fila:</strong> {selectedConversation.queue?.name || "Sem fila"}</Typography>
                <Typography variant="body2"><strong>Categoria:</strong> {selectedConversation.category?.name || "Nao informada"}</Typography>
                <Typography variant="body2"><strong>Motivo:</strong> {selectedConversation.closingReason?.name || "Nao informado"}</Typography>
                <Typography variant="body2"><strong>Abertura:</strong> {new Date(selectedConversation.createdAt).toLocaleString()}</Typography>
                <Typography variant="body2"><strong>Conclusao:</strong> {new Date(selectedConversation.updatedAt).toLocaleString()}</Typography>
              </div>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Data/hora</TableCell>
                    <TableCell>Origem</TableCell>
                    <TableCell>Mensagem</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(selectedConversation.messages || []).map(message => (
                    <TableRow key={message.id}>
                      <TableCell>{new Date(message.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{message.fromMe ? "Atendente/Sistema" : "Contato"}</TableCell>
                      <TableCell>{message.body || `[${message.mediaType || "midia"}]`}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </DialogContent>
        <DialogActions className={classes.noPrint}>
          <Button onClick={() => setSelectedConversation(null)}>Fechar</Button>
          <Button
            color="primary"
            variant="contained"
            startIcon={<PictureAsPdfIcon />}
            onClick={printConversationPdf}
            disabled={!selectedConversation}
          >
            PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Dashboard;
