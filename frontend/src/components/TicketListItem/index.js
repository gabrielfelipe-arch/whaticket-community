import React, { useState, useEffect, useRef, useContext } from "react";

import { useHistory, useParams } from "react-router-dom";
import { parseISO, format, isSameDay } from "date-fns";
import clsx from "clsx";

import { makeStyles } from "@material-ui/core/styles";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import Typography from "@material-ui/core/Typography";
import Avatar from "@material-ui/core/Avatar";
import Divider from "@material-ui/core/Divider";
import Badge from "@material-ui/core/Badge";
import Chip from "@material-ui/core/Chip";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import MarkdownWrapper from "../MarkdownWrapper";
import { Tooltip } from "@material-ui/core";
import { AuthContext } from "../../context/Auth/AuthContext";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
	ticket: {
		position: "relative",
		marginBottom: theme.spacing(1),
		borderRadius: 8,
		background: theme.palette.background.paper,
		border: `1px solid ${theme.palette.divider}`,
		boxShadow: theme.palette.type === "dark"
			? "0 10px 24px rgba(0,0,0,0.18)"
			: "0 10px 24px rgba(15,23,42,0.05)",
		overflow: "hidden",
		transition: "all 160ms ease",
		"&:hover": {
			transform: "translateY(-1px)",
			boxShadow: theme.palette.type === "dark"
				? "0 14px 30px rgba(0,0,0,0.22)"
				: "0 14px 30px rgba(15,23,42,0.08)",
		},
		"&.Mui-selected": {
			background: theme.palette.type === "dark" ? "#102040" : "#EFF6FF",
			borderColor: "#60A5FA",
		},
	},

	pendingTicket: {
		cursor: "unset",
	},

	noTicketsDiv: {
		display: "flex",
		height: "100px",
		margin: 40,
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
	},

	noTicketsText: {
		textAlign: "center",
		color: "rgb(104, 121, 146)",
		fontSize: "14px",
		lineHeight: "1.4",
	},

	noTicketsTitle: {
		textAlign: "center",
		fontSize: "16px",
		fontWeight: "600",
		margin: "0px",
	},

	contactNameWrapper: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		gap: theme.spacing(1),
	},

	lastMessageTime: {
		justifySelf: "flex-end",
		fontSize: 12,
		color: theme.palette.text.secondary,
	},

	contactLastMessage: {
		paddingRight: 8,
		minWidth: 0,
		flex: 1,
		color: theme.palette.text.secondary,
	},

	newMessagesCount: {
		alignSelf: "center",
		marginRight: 8,
		marginLeft: "auto",
	},

	badgeStyle: {
		color: "white",
		backgroundColor: "#22C55E",
		fontWeight: 800,
	},

	acceptButton: {
		flex: "none",
		marginLeft: theme.spacing(1),
		whiteSpace: "nowrap",
	},

	ticketQueueColor: {
		flex: "none",
		width: "8px",
		height: "100%",
		position: "absolute",
		top: "0%",
		left: "0%",
	},

	userTag: {
		position: "absolute",
		marginRight: 5,
		right: 5,
		bottom: 5,
		background: "#DBEAFE",
		color: "#1D4ED8",
		border: "1px solid #BFDBFE",
		fontWeight: 800,
		maxWidth: 120,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	statusChip: {
		height: 22,
		fontSize: 11,
		fontWeight: 800,
	},
	closedChip: {
		background: theme.custom?.status?.closed?.bg || "#E2E8F0",
		color: theme.custom?.status?.closed?.color || "#334155",
	},
	pendingChip: {
		background: theme.custom?.status?.waiting?.bg || "#FEF3C7",
		color: theme.custom?.status?.waiting?.color || "#92400E",
	},
	openChip: {
		background: theme.custom?.status?.open?.bg || "#DCFCE7",
		color: theme.custom?.status?.open?.color || "#166534",
	},
	aiTag: {
		marginLeft: 8,
		height: 22,
		fontSize: 11,
		background: theme.custom?.status?.ai?.bg || "#E0F2FE",
		color: theme.custom?.status?.ai?.color || "#0369A1",
		fontWeight: 800,
	},
}));

const TicketListItem = ({ ticket }) => {
	const classes = useStyles();
	const history = useHistory();
	const [loading, setLoading] = useState(false);
	const { ticketId } = useParams();
	const isMounted = useRef(true);
	const { user } = useContext(AuthContext);

	useEffect(() => {
		return () => {
			isMounted.current = false;
		};
	}, []);

	const handleAcepptTicket = async id => {
		setLoading(true);
		try {
			const humanQueue = ticket.aiActive
				? user?.queues?.find(queue => queue.id !== ticket.aiQueueId && queue.id !== ticket.queueId)
				: null;

			await api.put(`/tickets/${id}`, {
				status: "open",
				userId: user?.id,
				...(ticket.aiActive
					? { assumeAi: true, queueId: humanQueue?.id || null }
					: {}),
			});
		} catch (err) {
			setLoading(false);
			toastError(err);
		}
		if (isMounted.current) {
			setLoading(false);
		}
		history.push(`/tickets/${id}`);
	};

	const handleSelectTicket = id => {
		history.push(`/tickets/${id}`);
	};

	return (
		<React.Fragment key={ticket.id}>
			<ListItem
				dense
				button
				onClick={e => {
					if (ticket.status === "pending" && !ticket.aiActive) return;
					handleSelectTicket(ticket.id);
				}}
				selected={ticketId && +ticketId === ticket.id}
				className={clsx(classes.ticket, {
					[classes.pendingTicket]: ticket.status === "pending",
				})}
			>
				<Tooltip
					arrow
					placement="right"
					title={ticket.queue?.name || "Sem fila"}
				>
					<span
						style={{ backgroundColor: ticket.queue?.color || "#7C7C7C" }}
						className={classes.ticketQueueColor}
					></span>
				</Tooltip>
				<ListItemAvatar>
					<Avatar src={ticket?.contact?.profilePicUrl} />
				</ListItemAvatar>
				<ListItemText
					disableTypography
					primary={
						<span className={classes.contactNameWrapper}>
							<Typography
								noWrap
								component="span"
								variant="body2"
								color="textPrimary"
							>
								{ticket.contact.name}
							</Typography>
							{ticket.aiActive && (
								<Chip size="small" className={classes.aiTag} label="IA atendendo" />
							)}
							{ticket.status === "closed" && (
								<Chip size="small" className={clsx(classes.statusChip, classes.closedChip)} label="Finalizado" />
							)}
							{ticket.status === "pending" && !ticket.aiActive && (
								<Chip size="small" className={clsx(classes.statusChip, classes.pendingChip)} label="Aguardando" />
							)}
							{ticket.status === "open" && !ticket.aiActive && (
								<Chip size="small" className={clsx(classes.statusChip, classes.openChip)} label="Em atendimento" />
							)}
							{ticket.lastMessage && (
								<Typography
									className={classes.lastMessageTime}
									component="span"
									variant="body2"
									color="textSecondary"
								>
									{isSameDay(parseISO(ticket.updatedAt), new Date()) ? (
										<>{format(parseISO(ticket.updatedAt), "HH:mm")}</>
									) : (
										<>{format(parseISO(ticket.updatedAt), "dd/MM/yyyy")}</>
									)}
								</Typography>
							)}
							{ticket.whatsappId && (
								<div className={classes.userTag} title={i18n.t("ticketsList.connectionTitle")}>{ticket.whatsapp?.name}</div>
							)}
						</span>
					}
					secondary={
						<span className={classes.contactNameWrapper}>
							<Typography
								className={classes.contactLastMessage}
								noWrap
								component="span"
								variant="body2"
								color="textSecondary"
							>
								{ticket.lastMessage ? (
									<MarkdownWrapper>{ticket.lastMessage}</MarkdownWrapper>
								) : (
									<br />
								)}
							</Typography>

							<Badge
								className={classes.newMessagesCount}
								badgeContent={ticket.unreadMessages}
								classes={{
									badge: classes.badgeStyle,
								}}
							/>
						</span>
					}
				/>
				{ticket.status === "pending" && (
					<ButtonWithSpinner
						color="primary"
						variant="contained"
						className={classes.acceptButton}
						size="small"
						loading={loading}
						onClick={e => handleAcepptTicket(ticket.id)}
					>
						{ticket.aiActive ? "Assumir atendimento" : i18n.t("ticketsList.buttons.accept")}
					</ButtonWithSpinner>
				)}
			</ListItem>
			<Divider variant="inset" component="li" />
		</React.Fragment>
	);
};

export default TicketListItem;
