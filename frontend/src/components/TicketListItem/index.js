import React, { useContext } from "react";

import { useHistory, useParams } from "react-router-dom";
import { format, isSameDay, parseISO } from "date-fns";
import clsx from "clsx";

import { makeStyles } from "@material-ui/core/styles";
import ListItem from "@material-ui/core/ListItem";
import Typography from "@material-ui/core/Typography";
import Avatar from "@material-ui/core/Avatar";
import Tooltip from "@material-ui/core/Tooltip";

import { i18n } from "../../translate/i18n";
import MarkdownWrapper from "../MarkdownWrapper";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles(theme => ({
	ticket: {
		position: "relative",
		height: 60,
		minHeight: 60,
		padding: theme.spacing(0.5, 1, 0.5, 1.5),
		borderBottom: `1px solid ${theme.palette.divider}`,
		backgroundColor: theme.palette.background.paper,
		overflow: "hidden",
		transition: "background-color 140ms ease",
		"&:hover": {
			backgroundColor: theme.palette.action.hover,
		},
		"&.Mui-selected": {
			backgroundColor: theme.palette.type === "dark" ? "rgba(37,99,235,0.18)" : "#EFF6FF",
		},
		"&.Mui-selected:hover": {
			backgroundColor: theme.palette.type === "dark" ? "rgba(37,99,235,0.24)" : "#DBEAFE",
		},
	},
	pendingTicket: {
		cursor: "default",
	},
	ticketQueueColor: {
		position: "absolute",
		top: 0,
		bottom: 0,
		left: 0,
		width: 3,
	},
	avatarWrapper: {
		position: "relative",
		width: 44,
		minWidth: 44,
		height: 40,
		display: "flex",
		alignItems: "center",
	},
	contactAvatar: {
		width: 36,
		height: 36,
		fontSize: 14,
	},
	ownerBadge: {
		position: "absolute",
		top: 0,
		right: 2,
		width: 18,
		height: 18,
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		borderRadius: "50%",
		border: `2px solid ${theme.palette.background.paper}`,
		backgroundColor: theme.palette.type === "dark" ? "#475569" : "#64748B",
		color: "#FFFFFF",
		fontSize: 9,
		fontWeight: 800,
		lineHeight: 1,
		zIndex: 1,
	},
	ownerBadgeMine: {
		backgroundColor: theme.palette.primary.main,
	},
	ticketContent: {
		flex: 1,
		minWidth: 0,
		display: "grid",
		gridTemplateRows: "24px 24px",
	},
	topLine: {
		minWidth: 0,
		display: "flex",
		alignItems: "center",
		gap: 5,
	},
	contactName: {
		minWidth: 0,
		maxWidth: "62%",
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		fontSize: 13,
		fontWeight: 700,
		color: theme.palette.text.primary,
	},
	ownerSeparator: {
		flex: "none",
		color: theme.palette.text.disabled,
		fontSize: 11,
	},
	ownerName: {
		minWidth: 0,
		maxWidth: 72,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		color: theme.palette.text.secondary,
		fontSize: 11,
		fontWeight: 600,
		cursor: "help",
	},
	ownerNameMine: {
		color: theme.palette.primary.main,
	},
	lastMessageTime: {
		marginLeft: "auto",
		flex: "none",
		color: theme.palette.text.secondary,
		fontSize: 11,
		fontVariantNumeric: "tabular-nums",
	},
	bottomLine: {
		minWidth: 0,
		display: "flex",
		alignItems: "center",
		gap: 6,
	},
	contactLastMessage: {
		flex: 1,
		minWidth: 0,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		color: theme.palette.text.secondary,
		fontSize: 11.5,
		lineHeight: "18px",
		"& p": {
			display: "inline",
			margin: 0,
		},
	},
	actions: {
		flex: "none",
		display: "inline-flex",
		alignItems: "center",
		gap: 4,
	},
	unreadCount: {
		minWidth: 18,
		height: 18,
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		padding: "0 5px",
		borderRadius: 9,
		backgroundColor: theme.palette.primary.main,
		color: "#FFFFFF",
		fontSize: 10,
		fontWeight: 800,
		lineHeight: 1,
	},
}));

const firstName = name => String(name || "").trim().split(/\s+/)[0] || "";

const TicketListItem = ({ ticket }) => {
	const classes = useStyles();
	const history = useHistory();
	const { ticketId } = useParams();
	const { user } = useContext(AuthContext);
	const assignedUserName = ticket.user?.name || "";
	const isCurrentUser = Boolean(ticket.userId) && Number(ticket.userId) === Number(user?.id);
	const ownerLabel = assignedUserName
		? (isCurrentUser ? i18n.t("ticketsList.owner.you") : firstName(assignedUserName))
		: i18n.t("ticketsList.owner.unassigned");
	const ownerTooltip = assignedUserName
		? (isCurrentUser
			? i18n.t("ticketsList.owner.attendedByYou", { name: assignedUserName })
			: i18n.t("ticketsList.owner.attendedBy", { name: assignedUserName }))
		: i18n.t("ticketsList.owner.unassignedTooltip");
	const ownerInitial = assignedUserName ? firstName(assignedUserName).charAt(0).toUpperCase() : "-";

	const updatedAt = parseISO(ticket.updatedAt);
	const formattedTime = isSameDay(updatedAt, new Date())
		? format(updatedAt, "HH:mm")
		: format(updatedAt, "dd/MM/yyyy");

	return (
		<ListItem
			button
			onClick={() => history.push(`/tickets/${ticket.id}`)}
			selected={Boolean(ticketId) && Number(ticketId) === Number(ticket.id)}
			className={clsx(classes.ticket, {
				[classes.pendingTicket]: ticket.status === "pending",
			})}
		>
			<Tooltip title={ticket.queue?.name || i18n.t("ticketsList.noQueue")}>
				<span
					className={classes.ticketQueueColor}
					style={{ backgroundColor: ticket.queue?.color || "#94A3B8" }}
				/>
			</Tooltip>

			<div className={classes.avatarWrapper}>
				<Avatar className={classes.contactAvatar} src={ticket.contact?.profilePicUrl}>
					{firstName(ticket.contact?.name).charAt(0).toUpperCase()}
				</Avatar>
				<Tooltip arrow title={ownerTooltip}>
					<span className={clsx(classes.ownerBadge, isCurrentUser && classes.ownerBadgeMine)}>
						{ownerInitial}
					</span>
				</Tooltip>
			</div>

			<div className={classes.ticketContent}>
				<div className={classes.topLine}>
					<Typography component="span" className={classes.contactName}>
						{ticket.contact?.name}
					</Typography>
					<span className={classes.ownerSeparator}>·</span>
					<Tooltip arrow title={ownerTooltip}>
						<span className={clsx(classes.ownerName, isCurrentUser && classes.ownerNameMine)}>
							{ownerLabel}
						</span>
					</Tooltip>
					<span className={classes.lastMessageTime}>{formattedTime}</span>
				</div>

				<div className={classes.bottomLine}>
					<Typography component="span" className={classes.contactLastMessage}>
						{ticket.lastMessage ? <MarkdownWrapper>{ticket.lastMessage}</MarkdownWrapper> : " "}
					</Typography>
					<span className={classes.actions}>
						{ticket.unreadMessages > 0 && (
							<span className={classes.unreadCount}>{ticket.unreadMessages}</span>
						)}
					</span>
				</div>
			</div>
		</ListItem>
	);
};

export default TicketListItem;
