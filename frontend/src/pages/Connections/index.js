import React, { useState, useCallback, useContext } from "react";
import { toast } from "react-toastify";
import { format, parseISO } from "date-fns";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import {
	Button,
	TableBody,
	TableRow,
	TableCell,
	IconButton,
	Table,
	TableHead,
	Paper,
	Tooltip,
	Typography,
	CircularProgress,
	Grid,
	Chip,
} from "@material-ui/core";
import {
	Edit,
	CheckCircle,
	SignalCellularConnectedNoInternet2Bar,
	SignalCellularConnectedNoInternet0Bar,
	SignalCellular4Bar,
	CropFree,
	DeleteOutline,
	WhatsApp,
} from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import TableRowSkeleton from "../../components/TableRowSkeleton";

import api from "../../services/api";
import WhatsAppModal from "../../components/WhatsAppModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import QrcodeModal from "../../components/QrcodeModal";
import { i18n } from "../../translate/i18n";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import { AuthContext } from "../../context/Auth/AuthContext";
import toastError from "../../errors/toastError";
import { EmptyState } from "../../components/ExecutiveLayout";

const useStyles = makeStyles(theme => ({
	mainPaper: {
		flex: 1,
		padding: theme.spacing(1),
		overflowY: "scroll",
		...theme.scrollbarStyles,
	},
	connectionGrid: {
		paddingBottom: theme.spacing(1),
	},
	connectionCard: {
		height: "100%",
		padding: theme.spacing(2),
		borderRadius: 8,
		border: `1px solid ${theme.palette.divider}`,
		background: theme.palette.background.paper,
		boxShadow: theme.custom?.cardShadow,
		display: "flex",
		flexDirection: "column",
		gap: theme.spacing(1.5),
	},
	connectionCardHeader: {
		display: "flex",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: theme.spacing(1.5),
	},
	connectionIdentity: {
		display: "flex",
		alignItems: "center",
		gap: theme.spacing(1.25),
		minWidth: 0,
	},
	connectionIcon: {
		width: 44,
		height: 44,
		borderRadius: 8,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		color: "#16A34A",
		background: theme.palette.type === "dark" ? "rgba(34, 197, 94, 0.12)" : "#DCFCE7",
		flexShrink: 0,
	},
	connectionName: {
		fontWeight: 800,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	connectionMeta: {
		display: "grid",
		gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
		gap: theme.spacing(1),
		[theme.breakpoints.down("xs")]: {
			gridTemplateColumns: "1fr",
		},
	},
	metaItem: {
		padding: theme.spacing(1),
		borderRadius: 8,
		border: `1px solid ${theme.palette.divider}`,
		background: theme.palette.background.default,
	},
	metaLabel: {
		fontSize: 11,
		fontWeight: 800,
		textTransform: "uppercase",
		color: theme.palette.text.secondary,
	},
	metaValue: {
		fontSize: 13,
		fontWeight: 700,
		color: theme.palette.text.primary,
		marginTop: 2,
	},
	connectionActions: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: theme.spacing(1),
		flexWrap: "wrap",
		paddingTop: theme.spacing(1),
		borderTop: `1px solid ${theme.palette.divider}`,
	},
	customTableCell: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	tooltip: {
		backgroundColor: "#f5f5f9",
		color: "rgba(0, 0, 0, 0.87)",
		fontSize: theme.typography.pxToRem(14),
		border: "1px solid #dadde9",
		maxWidth: 450,
	},
	tooltipPopper: {
		textAlign: "center",
	},
	buttonProgress: {
		color: green[500],
	},
}));

const CustomToolTip = ({ title, content, children }) => {
	const classes = useStyles();

	return (
		<Tooltip
			arrow
			classes={{
				tooltip: classes.tooltip,
				popper: classes.tooltipPopper,
			}}
			title={
				<React.Fragment>
					<Typography gutterBottom color="inherit">
						{title}
					</Typography>
					{content && <Typography>{content}</Typography>}
				</React.Fragment>
			}
		>
			{children}
		</Tooltip>
	);
};

const Connections = () => {
	const classes = useStyles();

	const { whatsApps, loading } = useContext(WhatsAppsContext);
	const { user } = useContext(AuthContext);
	const isAdmin = user?.profile === "admin";
	const canManageConnections = isAdmin || user?.permissions?.["connections.manage"] === true;
	const canCreateConnections = isAdmin || user?.permissions?.["connections.create"] === true;
	const canEditConnections = isAdmin || user?.permissions?.["connections.edit"] === true;
	const canDeleteConnections = isAdmin || user?.permissions?.["connections.delete"] === true;
	const canReconnectConnections = isAdmin || user?.permissions?.["connections.reconnect"] === true;
	const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
	const [qrModalOpen, setQrModalOpen] = useState(false);
	const [selectedWhatsApp, setSelectedWhatsApp] = useState(null);
	const [confirmModalOpen, setConfirmModalOpen] = useState(false);
	const confirmationModalInitialState = {
		action: "",
		title: "",
		message: "",
		whatsAppId: "",
		open: false,
	};
	const [confirmModalInfo, setConfirmModalInfo] = useState(
		confirmationModalInitialState
	);

	const handleStartWhatsAppSession = async whatsAppId => {
		try {
			await api.post(`/whatsappsession/${whatsAppId}`);
		} catch (err) {
			toastError(err);
		}
	};

	const handleRequestNewQrCode = async whatsAppId => {
		try {
			await api.put(`/whatsappsession/${whatsAppId}`);
		} catch (err) {
			toastError(err);
		}
	};

	const handleOpenWhatsAppModal = () => {
		setSelectedWhatsApp(null);
		setWhatsAppModalOpen(true);
	};

	const handleCloseWhatsAppModal = useCallback(() => {
		setWhatsAppModalOpen(false);
		setSelectedWhatsApp(null);
	}, [setSelectedWhatsApp, setWhatsAppModalOpen]);

	const handleOpenQrModal = whatsApp => {
		setSelectedWhatsApp(whatsApp);
		setQrModalOpen(true);
	};

	const handleCloseQrModal = useCallback(() => {
		setSelectedWhatsApp(null);
		setQrModalOpen(false);
	}, [setQrModalOpen, setSelectedWhatsApp]);

	const handleEditWhatsApp = whatsApp => {
		setSelectedWhatsApp(whatsApp);
		setWhatsAppModalOpen(true);
	};

	const handleOpenConfirmationModal = (action, whatsAppId) => {
		if (action === "disconnect") {
			setConfirmModalInfo({
				action: action,
				title: i18n.t("connections.confirmationModal.disconnectTitle"),
				message: i18n.t("connections.confirmationModal.disconnectMessage"),
				whatsAppId: whatsAppId,
			});
		}

		if (action === "delete") {
			setConfirmModalInfo({
				action: action,
				title: i18n.t("connections.confirmationModal.deleteTitle"),
				message: i18n.t("connections.confirmationModal.deleteMessage"),
				whatsAppId: whatsAppId,
			});
		}
		setConfirmModalOpen(true);
	};

	const handleSubmitConfirmationModal = async () => {
		if (confirmModalInfo.action === "disconnect") {
			try {
				await api.delete(`/whatsappsession/${confirmModalInfo.whatsAppId}`);
			} catch (err) {
				toastError(err);
			}
		}

		if (confirmModalInfo.action === "delete") {
			try {
				await api.delete(`/whatsapp/${confirmModalInfo.whatsAppId}`);
				toast.success(i18n.t("connections.toasts.deleted"));
			} catch (err) {
				toastError(err);
			}
		}

		setConfirmModalInfo(confirmationModalInitialState);
	};

	const renderActionButtons = whatsApp => {
		return (
			<>
				{canReconnectConnections && whatsApp.status === "qrcode" && (
					<Button
						size="small"
						variant="contained"
						color="primary"
						onClick={() => handleOpenQrModal(whatsApp)}
					>
						{i18n.t("connections.buttons.qrcode")}
					</Button>
				)}
				{canReconnectConnections && whatsApp.status === "DISCONNECTED" && (
					<>
						<Button
							size="small"
							variant="outlined"
							color="primary"
							onClick={() => handleStartWhatsAppSession(whatsApp.id)}
						>
							{i18n.t("connections.buttons.tryAgain")}
						</Button>{" "}
						<Button
							size="small"
							variant="outlined"
							color="secondary"
							onClick={() => handleRequestNewQrCode(whatsApp.id)}
						>
							{i18n.t("connections.buttons.newQr")}
						</Button>
					</>
				)}
				{canReconnectConnections && (whatsApp.status === "CONNECTED" ||
					whatsApp.status === "PAIRING" ||
					whatsApp.status === "TIMEOUT") && (
					<>
						<Button
							size="small"
							variant="outlined"
							color="secondary"
							onClick={() => {
								handleOpenConfirmationModal("disconnect", whatsApp.id);
							}}
						>
							{i18n.t("connections.buttons.disconnect")}
						</Button>{" "}
						{whatsApp.status !== "CONNECTED" && (
							<Button
								size="small"
								variant="outlined"
								color="primary"
								onClick={() => handleRequestNewQrCode(whatsApp.id)}
							>
								{i18n.t("connections.buttons.newQr")}
							</Button>
						)}
					</>
				)}
				{canReconnectConnections && whatsApp.status === "OPENING" && (
					<>
						<Button size="small" variant="outlined" disabled color="default">
							{i18n.t("connections.buttons.connecting")}
						</Button>{" "}
						<Button
							size="small"
							variant="outlined"
							color="primary"
							onClick={() => handleRequestNewQrCode(whatsApp.id)}
						>
							{i18n.t("connections.buttons.newQr")}
						</Button>
					</>
				)}
			</>
		);
	};

	const renderStatusToolTips = whatsApp => {
		return (
			<div className={classes.customTableCell}>
				{whatsApp.status === "DISCONNECTED" && (
					<CustomToolTip
						title={i18n.t("connections.toolTips.disconnected.title")}
						content={i18n.t("connections.toolTips.disconnected.content")}
					>
						<SignalCellularConnectedNoInternet0Bar color="secondary" />
					</CustomToolTip>
				)}
				{whatsApp.status === "OPENING" && (
					<CircularProgress size={24} className={classes.buttonProgress} />
				)}
				{whatsApp.status === "qrcode" && (
					<CustomToolTip
						title={i18n.t("connections.toolTips.qrcode.title")}
						content={i18n.t("connections.toolTips.qrcode.content")}
					>
						<CropFree />
					</CustomToolTip>
				)}
				{whatsApp.status === "CONNECTED" && (
					<CustomToolTip title={i18n.t("connections.toolTips.connected.title")}>
						<SignalCellular4Bar style={{ color: green[500] }} />
					</CustomToolTip>
				)}
				{(whatsApp.status === "TIMEOUT" || whatsApp.status === "PAIRING") && (
					<CustomToolTip
						title={i18n.t("connections.toolTips.timeout.title")}
						content={i18n.t("connections.toolTips.timeout.content")}
					>
						<SignalCellularConnectedNoInternet2Bar color="secondary" />
					</CustomToolTip>
				)}
			</div>
		);
	};

	return (
		<MainContainer>
			<ConfirmationModal
				title={confirmModalInfo.title}
				open={confirmModalOpen}
				onClose={setConfirmModalOpen}
				onConfirm={handleSubmitConfirmationModal}
			>
				{confirmModalInfo.message}
			</ConfirmationModal>
			<QrcodeModal
				open={qrModalOpen}
				onClose={handleCloseQrModal}
				whatsAppId={!whatsAppModalOpen && selectedWhatsApp?.id}
			/>
			<WhatsAppModal
				open={whatsAppModalOpen}
				onClose={handleCloseWhatsAppModal}
				whatsAppId={!qrModalOpen && selectedWhatsApp?.id}
			/>
			<MainHeader>
				<Title subtitle="Monitore sessoes, QR codes e a saude das conexoes de atendimento.">{i18n.t("connections.title")}</Title>
				{canCreateConnections && (
					<MainHeaderButtonsWrapper>
						<Button
							variant="contained"
							color="primary"
							onClick={handleOpenWhatsAppModal}
						>
							{i18n.t("connections.buttons.add")}
						</Button>
					</MainHeaderButtonsWrapper>
				)}
			</MainHeader>
			{loading ? (
				<Paper className={classes.mainPaper} variant="outlined">
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>{i18n.t("connections.table.name")}</TableCell>
								<TableCell>{i18n.t("connections.table.status")}</TableCell>
								<TableCell>{i18n.t("connections.table.actions")}</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							<TableRowSkeleton columns={3} />
						</TableBody>
					</Table>
				</Paper>
			) : whatsApps?.length ? (
				<Grid container spacing={2} className={classes.connectionGrid}>
					{whatsApps.map(whatsApp => (
						<Grid item xs={12} md={6} xl={4} key={whatsApp.id}>
							<Paper variant="outlined" className={classes.connectionCard}>
								<div className={classes.connectionCardHeader}>
									<div className={classes.connectionIdentity}>
										<div className={classes.connectionIcon}>
											<WhatsApp />
										</div>
										<div>
											<Typography className={classes.connectionName}>{whatsApp.name}</Typography>
											<Typography variant="body2" color="textSecondary">
												Conexao #{whatsApp.id}
											</Typography>
										</div>
									</div>
									{whatsApp.isDefault && (
										<Chip size="small" color="primary" label="Padrao" />
									)}
								</div>
								<div className={classes.connectionMeta}>
									<div className={classes.metaItem}>
										<Typography className={classes.metaLabel}>Status</Typography>
										<div className={classes.metaValue}>{renderStatusToolTips(whatsApp)}</div>
									</div>
									<div className={classes.metaItem}>
										<Typography className={classes.metaLabel}>Ultima atualizacao</Typography>
										<Typography className={classes.metaValue}>
											{format(parseISO(whatsApp.updatedAt), "dd/MM/yy HH:mm")}
										</Typography>
									</div>
								</div>
								<div className={classes.connectionActions}>
									<div>{renderActionButtons(whatsApp)}</div>
									{(canEditConnections || canDeleteConnections) && (
										<div>
											{canEditConnections && (
												<IconButton size="small" onClick={() => handleEditWhatsApp(whatsApp)}>
													<Edit />
												</IconButton>
											)}
											{canDeleteConnections && (
												<IconButton size="small" onClick={() => handleOpenConfirmationModal("delete", whatsApp.id)}>
													<DeleteOutline />
												</IconButton>
											)}
										</div>
									)}
								</div>
							</Paper>
						</Grid>
					))}
				</Grid>
			) : (
				<EmptyState
					icon={WhatsApp}
					title="Nenhuma conexao cadastrada"
					description="Cadastre uma conexao WhatsApp para iniciar recebimento e envio de mensagens."
					actionLabel={isAdmin ? i18n.t("connections.buttons.add") : undefined}
					onAction={isAdmin ? handleOpenWhatsAppModal : undefined}
				/>
			)}
		</MainContainer>
	);
};

export default Connections;
