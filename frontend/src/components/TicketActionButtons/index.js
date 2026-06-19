import React, { useContext, useState } from "react";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import {
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	IconButton,
	MenuItem,
	TextField,
	Checkbox,
	FormControlLabel
} from "@material-ui/core";
import { MoreVert, Replay } from "@material-ui/icons";
import { toast } from "react-toastify";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import TicketOptionsMenu from "../TicketOptionsMenu";
import ButtonWithSpinner from "../ButtonWithSpinner";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import GlpiTicketModal from "../GlpiTicketModal";

const useStyles = makeStyles(theme => ({
	actionButtons: {
		marginRight: 6,
		flex: "none",
		alignSelf: "center",
		marginLeft: "auto",
		"& > *": {
			margin: theme.spacing(0.5),
		},
	},
}));

const TicketActionButtons = ({ ticket }) => {
	const classes = useStyles();
	const history = useHistory();
	const [anchorEl, setAnchorEl] = useState(null);
	const [loading, setLoading] = useState(false);
	const [closingModalOpen, setClosingModalOpen] = useState(false);
	const [closingData, setClosingData] = useState({
		categoryId: "",
		closingReasonId: "",
		closingNote: "",
		sendFarewellMessage: false,
		sendSatisfactionSurvey: false,
	});
	const [categories, setCategories] = useState([]);
	const [closingReasons, setClosingReasons] = useState([]);
	const [satisfactionSurvey, setSatisfactionSurvey] = useState(null);
	const [glpiStatus, setGlpiStatus] = useState(null);
	const [glpiModalOpen, setGlpiModalOpen] = useState(false);
	const ticketOptionsMenuOpen = Boolean(anchorEl);
	const { user } = useContext(AuthContext);
	const latestGlpiLink = glpiStatus?.links?.[0];

	React.useEffect(() => {
		if (!ticket?.id || ticket.status !== "open") {
			setGlpiStatus(null);
			return;
		}

		const loadGlpiStatus = async () => {
			try {
				const { data } = await api.get(`/tickets/${ticket.id}/glpi`);
				setGlpiStatus(data);
			} catch (err) {
				setGlpiStatus(null);
			}
		};

		loadGlpiStatus();
	}, [ticket?.id, ticket?.status, ticket?.queueId]);

	const handleOpenTicketOptionsMenu = e => {
		setAnchorEl(e.currentTarget);
	};

	const handleCloseTicketOptionsMenu = e => {
		setAnchorEl(null);
	};

	const handleUpdateTicketStatus = async (e, status, userId, extraData = {}) => {
		setLoading(true);
		try {
			await api.put(`/tickets/${ticket.id}`, {
				status: status,
				userId: userId || null,
				...(status === "closed" ? closingData : {}),
				...extraData,
			});

			setLoading(false);
			setClosingModalOpen(false);
			if (status === "open") {
				history.push(`/tickets/${ticket.id}`);
			} else {
				history.push("/tickets");
			}
		} catch (err) {
			setLoading(false);
			toastError(err);
		}
	};

	const handleOpenClosingModal = async () => {
		setLoading(true);
		try {
			const [{ data: categoriesData }, { data: reasonsData }, { data: surveysData }] = await Promise.all([
				api.get("/ticket-categories"),
				api.get("/closing-reasons"),
				api.get("/satisfaction-surveys"),
			]);

			setCategories(categoriesData);
			setClosingReasons(reasonsData);
			const activeSurvey = (surveysData || []).find(survey => survey.active !== false && survey.sendMode !== "disabled");
			setSatisfactionSurvey(activeSurvey || null);
			setClosingData({
				categoryId: "",
				closingReasonId: "",
				closingNote: "",
				sendFarewellMessage: false,
				sendSatisfactionSurvey: activeSurvey?.sendMode === "always",
			});
			setClosingModalOpen(true);
		} catch (err) {
			toastError(err);
		} finally {
			setLoading(false);
		}
	};

	const handleClosingChange = event => {
		const { name, value, checked, type } = event.target;
		setClosingData(prev => ({
			...prev,
			[name]: type === "checkbox" ? checked : value,
		}));
	};

	const handleResolveTicket = e => {
		if (!closingData.categoryId && !closingData.closingReasonId) {
			toast.error("Informe a categoria e o motivo de fechamento antes de resolver o atendimento.");
			return;
		}
		if (!closingData.categoryId) {
			toast.error("Informe a categoria antes de resolver o atendimento.");
			return;
		}
		if (!closingData.closingReasonId) {
			toast.error("Informe o motivo de fechamento antes de resolver o atendimento.");
			return;
		}

		handleUpdateTicketStatus(e, "closed", user?.id);
	};
	const getPreferredQueueId = () => {
		if (ticket.queueId && !ticket.queue?.useAI) return ticket.queueId;
		const availableQueues = user?.queues || [];
		const glpiQueue = availableQueues.find(queue => queue.glpiEnabled);
		return glpiQueue?.id || availableQueues[0]?.id || null;
	};

	const handleAssumeAiTicket = async e => {
		const humanQueue = user?.queues?.find(queue => queue.id !== ticket.aiQueueId && queue.id !== ticket.queueId && queue.glpiEnabled)
			|| user?.queues?.find(queue => queue.id !== ticket.aiQueueId && queue.id !== ticket.queueId);
		await handleUpdateTicketStatus(e, "open", user?.id, {
			assumeAi: true,
			queueId: humanQueue?.id || getPreferredQueueId(),
		});
	};

	return (
		<div className={classes.actionButtons}>
			{ticket.status === "closed" && (
				<ButtonWithSpinner
					loading={loading}
					startIcon={<Replay />}
					size="small"
					onClick={e => handleUpdateTicketStatus(e, "open", user?.id)}
				>
					{i18n.t("messagesList.header.buttons.reopen")}
				</ButtonWithSpinner>
			)}
			{ticket.status === "open" && (
				<>
					{ticket.aiActive && (
						<ButtonWithSpinner
							loading={loading}
							size="small"
							variant="contained"
							color="primary"
							onClick={handleAssumeAiTicket}
						>
							Assumir atendimento
						</ButtonWithSpinner>
					)}
					<ButtonWithSpinner
						loading={loading}
						startIcon={<Replay />}
						size="small"
						onClick={e => handleUpdateTicketStatus(e, "pending", null)}
					>
						{i18n.t("messagesList.header.buttons.return")}
					</ButtonWithSpinner>
					<ButtonWithSpinner
						loading={loading}
						size="small"
						variant="contained"
						color="primary"
						onClick={handleOpenClosingModal}
					>
						{i18n.t("messagesList.header.buttons.resolve")}
					</ButtonWithSpinner>
					{latestGlpiLink?.glpiUrl && (
						<ButtonWithSpinner
							loading={loading}
							size="small"
							variant="outlined"
							color="primary"
							onClick={() => window.open(latestGlpiLink.glpiUrl, "_blank", "noopener,noreferrer")}
						>
							GLPI #{latestGlpiLink.glpiTicketNumber || latestGlpiLink.glpiTicketId}
						</ButtonWithSpinner>
					)}
					{glpiStatus?.enabled && glpiStatus?.queueEnabled && glpiStatus?.configValid && glpiStatus.canCreate && (
						<ButtonWithSpinner
							loading={loading}
							size="small"
							variant="outlined"
							color="primary"
							onClick={() => setGlpiModalOpen(true)}
						>
							Chamado GLPI
						</ButtonWithSpinner>
					)}
					<IconButton onClick={handleOpenTicketOptionsMenu}>
						<MoreVert />
					</IconButton>
					<TicketOptionsMenu
						ticket={ticket}
						anchorEl={anchorEl}
						menuOpen={ticketOptionsMenuOpen}
						handleClose={handleCloseTicketOptionsMenu}
					/>
				</>
			)}
			{ticket.status === "pending" && (
				<ButtonWithSpinner
					loading={loading}
					size="small"
					variant="contained"
					color="primary"
					onClick={e => handleUpdateTicketStatus(e, "open", user?.id, { queueId: getPreferredQueueId() })}
				>
					{i18n.t("messagesList.header.buttons.accept")}
				</ButtonWithSpinner>
			)}
			<Dialog
				open={closingModalOpen}
				onClose={() => setClosingModalOpen(false)}
				maxWidth="sm"
				fullWidth
			>
				<DialogTitle>Resolver chamado</DialogTitle>
				<DialogContent>
					<TextField
						select
						fullWidth
						required
						margin="dense"
						variant="outlined"
						label="Categoria"
						name="categoryId"
						value={closingData.categoryId}
						onChange={handleClosingChange}
					>
						{categories.map(category => (
							<MenuItem key={category.id} value={category.id}>
								{category.name}
							</MenuItem>
						))}
					</TextField>
					<TextField
						select
						fullWidth
						required
						margin="dense"
						variant="outlined"
						label="Motivo de fechamento"
						name="closingReasonId"
						value={closingData.closingReasonId}
						onChange={handleClosingChange}
					>
						{closingReasons.map(reason => (
							<MenuItem key={reason.id} value={reason.id}>
								{reason.name}
							</MenuItem>
						))}
					</TextField>
					<TextField
						fullWidth
						margin="dense"
						variant="outlined"
						label="Observacao"
						name="closingNote"
						value={closingData.closingNote}
						onChange={handleClosingChange}
						multiline
						rows={3}
					/>
					<FormControlLabel
						control={
							<Checkbox
								color="primary"
								name="sendFarewellMessage"
								checked={closingData.sendFarewellMessage}
								onChange={handleClosingChange}
							/>
						}
						label="Enviar mensagem de encerramento"
					/>
					{satisfactionSurvey && (
						<FormControlLabel
							control={
								<Checkbox
									color="primary"
									name="sendSatisfactionSurvey"
									checked={closingData.sendSatisfactionSurvey}
									disabled={satisfactionSurvey.sendMode === "always"}
									onChange={handleClosingChange}
								/>
							}
							label={
								satisfactionSurvey.sendMode === "always"
									? "Enviar pesquisa de satisfação automaticamente"
									: "Enviar pesquisa de satisfação"
							}
						/>
					)}
				</DialogContent>
				<DialogActions>
					<ButtonWithSpinner
						size="small"
						onClick={() => setClosingModalOpen(false)}
					>
						Cancelar
					</ButtonWithSpinner>
					<ButtonWithSpinner
						loading={loading}
						size="small"
						variant="contained"
						color="primary"
						onClick={handleResolveTicket}
					>
						Resolver
					</ButtonWithSpinner>
				</DialogActions>
			</Dialog>
			<GlpiTicketModal
				open={glpiModalOpen}
				onClose={() => setGlpiModalOpen(false)}
				ticket={ticket}
				onCreated={async () => {
					const { data } = await api.get(`/tickets/${ticket.id}/glpi`);
					setGlpiStatus(data);
				}}
			/>
		</div>
	);
};

export default TicketActionButtons;
