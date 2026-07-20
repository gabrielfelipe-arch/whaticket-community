import React, { useContext, useEffect, useRef, useState } from "react";

import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import TextField from "@material-ui/core/TextField";
import { toast } from "react-toastify";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ConfirmationModal from "../ConfirmationModal";
import TransferTicketModal from "../TransferTicketModal";
import toastError from "../../errors/toastError";
import { Can } from "../Can";
import { AuthContext } from "../../context/Auth/AuthContext";

const toDateTimeLocalValue = date => {
	const next = date ? new Date(date) : new Date(Date.now() + 10 * 60 * 1000);
	next.setSeconds(0, 0);
	const offset = next.getTimezoneOffset();
	return new Date(next.getTime() - offset * 60000).toISOString().slice(0, 16);
};

const getFieldValue = event => event && event.target ? event.target.value : "";

const TicketOptionsMenu = ({ ticket, menuOpen, handleClose, anchorEl }) => {
	const [confirmationOpen, setConfirmationOpen] = useState(false);
	const [transferTicketModalOpen, setTransferTicketModalOpen] = useState(false);
	const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
	const [scheduleMessage, setScheduleMessage] = useState("");
	const [returnContext, setReturnContext] = useState("");
	const [scheduleAt, setScheduleAt] = useState(() => toDateTimeLocalValue());
	const [scheduleLoading, setScheduleLoading] = useState(false);
	const isMounted = useRef(true);
	const { user } = useContext(AuthContext);

	useEffect(() => {
		return () => {
			isMounted.current = false;
		};
	}, []);

	const handleDeleteTicket = async () => {
		try {
			await api.delete(`/tickets/${ticket.id}`);
		} catch (err) {
			toastError(err);
		}
	};

	const handleOpenConfirmationModal = () => {
		setConfirmationOpen(true);
		handleClose();
	};

	const handleOpenTransferModal = () => {
		setTransferTicketModalOpen(true);
		handleClose();
	};

	const handleOpenScheduleModal = () => {
		setScheduleMessage("");
		setReturnContext("");
		setScheduleAt(toDateTimeLocalValue());
		setScheduleModalOpen(true);
		handleClose();
	};

	const handleCloseScheduleModal = () => {
		setScheduleModalOpen(false);
	};

	const handleScheduleMessage = async () => {
		const trimmedMessage = scheduleMessage.trim();
		if (!trimmedMessage) {
			toast.error("Digite a mensagem que sera agendada.");
			return;
		}

		if (!ticket?.contact?.id) {
			toast.error("Nao foi possivel identificar o contato deste atendimento.");
			return;
		}

		const selectedDate = new Date(scheduleAt);
		if (!scheduleAt || Number.isNaN(selectedDate.getTime()) || selectedDate.getTime() <= Date.now()) {
			toast.error("Escolha uma data e horario futuros.");
			return;
		}

		setScheduleLoading(true);
		const formData = new FormData();
		formData.append("contactId", ticket.contact.id);
		if (ticket.whatsappId) formData.append("whatsappId", ticket.whatsappId);
		formData.append("sourceTicketId", ticket.id);
		if (ticket.queueId) formData.append("returnQueueId", ticket.queueId);
		formData.append("returnContext", returnContext.trim());
		formData.append("sendType", "scheduled");
		formData.append("audience", ticket.contact.isGroup ? "groups" : "contacts");
		formData.append("message", trimmedMessage);
		formData.append("scheduledAt", scheduleAt);
		formData.append("recurrenceType", "once");
		formData.append("intervalPattern", "60:50:55:52:51:53:61");
		formData.append("pauseAfter", "20");
		formData.append("pauseMinutes", "5");

		try {
			await api.post("/scheduled-messages", formData, {
				headers: { "Content-Type": "multipart/form-data" }
			});
			toast.success("Mensagem agendada.");
			setScheduleModalOpen(false);
		} catch (err) {
			toastError(err);
		}

		setScheduleLoading(false);
	};

	const handleCloseTransferTicketModal = () => {
		if (isMounted.current) {
			setTransferTicketModalOpen(false);
		}
	};

	return (
		<>
			<Menu
				id="menu-appbar"
				anchorEl={anchorEl}
				getContentAnchorEl={null}
				anchorOrigin={{
					vertical: "bottom",
					horizontal: "right",
				}}
				keepMounted
				transformOrigin={{
					vertical: "top",
					horizontal: "right",
				}}
				open={menuOpen}
				onClose={handleClose}
			>
				<MenuItem onClick={handleOpenTransferModal}>
					{i18n.t("ticketOptionsMenu.transfer")}
				</MenuItem>
				<MenuItem onClick={handleOpenScheduleModal}>
					Agendar mensagem
				</MenuItem>
				<Can
					role={user.profile}
					perform="ticket-options:deleteTicket"
					yes={() => (
						<MenuItem onClick={handleOpenConfirmationModal}>
							{i18n.t("ticketOptionsMenu.delete")}
						</MenuItem>
					)}
				/>
			</Menu>
			<ConfirmationModal
				title={`${i18n.t("ticketOptionsMenu.confirmationModal.title")}${
					ticket.id
				} ${i18n.t("ticketOptionsMenu.confirmationModal.titleFrom")} ${
					ticket.contact.name
				}?`}
				open={confirmationOpen}
				onClose={setConfirmationOpen}
				onConfirm={handleDeleteTicket}
			>
				{i18n.t("ticketOptionsMenu.confirmationModal.message")}
			</ConfirmationModal>
			<TransferTicketModal
				modalOpen={transferTicketModalOpen}
				onClose={handleCloseTransferTicketModal}
				ticketid={ticket.id}
				ticketWhatsappId={ticket.whatsappId}
			/>
			<Dialog open={scheduleModalOpen} onClose={handleCloseScheduleModal} maxWidth="xs" fullWidth>
				<DialogTitle>Agendar mensagem</DialogTitle>
				<DialogContent>
					<TextField
						label="Contato"
						variant="outlined"
						margin="dense"
						value={ticket?.contact?.name || ""}
						disabled
						fullWidth
					/>
					<TextField
						label="Data e horario"
						type="datetime-local"
						variant="outlined"
						margin="dense"
						value={scheduleAt || ""}
						onChange={event => setScheduleAt(getFieldValue(event))}
						InputLabelProps={{ shrink: true }}
						fullWidth
					/>
					<TextField
						label="Mensagem"
						variant="outlined"
						margin="dense"
						value={scheduleMessage || ""}
						onChange={event => setScheduleMessage(getFieldValue(event))}
						multiline
						rows={4}
						fullWidth
					/>
					<TextField
						label="Contexto do retorno"
						variant="outlined"
						margin="dense"
						value={returnContext || ""}
						onChange={event => setReturnContext(getFieldValue(event))}
						placeholder="Ex: Retornar sobre orcamento enviado e confirmar se deseja falar com a equipe."
						multiline
						rows={3}
						helperText="Anotacao interna para a equipe quando o cliente responder dentro da janela definida na fila."
						fullWidth
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseScheduleModal}>
						Cancelar
					</Button>
					<Button color="primary" variant="contained" onClick={handleScheduleMessage} disabled={scheduleLoading}>
						Agendar
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
};

export default TicketOptionsMenu;
