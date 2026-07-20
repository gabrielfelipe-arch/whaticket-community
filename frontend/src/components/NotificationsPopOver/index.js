import React, { useState, useRef, useEffect, useContext } from "react";
import { useHistory } from "react-router-dom";
import clsx from "clsx";
import { format } from "date-fns";
import openSocket from "../../services/socket-io";
import useSound from "use-sound";

import Popover from "@material-ui/core/Popover";
import IconButton from "@material-ui/core/IconButton";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import { makeStyles } from "@material-ui/core/styles";
import Badge from "@material-ui/core/Badge";
import ChatIcon from "@material-ui/icons/Chat";
import WarningIcon from "@material-ui/icons/Warning";

import TicketListItem from "../TicketListItem";
import { i18n } from "../../translate/i18n";
import useTickets from "../../hooks/useTickets";
import alertSound from "../../assets/sound.mp3";
import { AuthContext } from "../../context/Auth/AuthContext";
import useWhatsApps from "../../hooks/useWhatsApps";
import api from "../../services/api";
import { subscribeToPushNotifications } from "../../pwa";

const whatsappAttentionStatuses = new Set([
	"DISCONNECTED",
	"OPENING",
	"PAIRING",
	"QRCODE",
	"TIMEOUT",
	"CONFLICT",
	"UNPAIRED",
	"UNPAIRED_IDLE",
]);

const getWhatsappStatus = session => String(session?.status || "").toUpperCase();

const isWhatsappSessionAttention = session =>
	session?.id && whatsappAttentionStatuses.has(getWhatsappStatus(session));

const getWhatsappAlertText = whatsapp => {
	const status = getWhatsappStatus(whatsapp);

	if (status === "OPENING") {
		return {
			title: `WhatsApp reconectando: ${whatsapp.name || `Conexao #${whatsapp.id}`}`,
			subtitle: "A conexao caiu e o sistema esta tentando reconectar.",
		};
	}

	if (status === "QRCODE" || status === "PAIRING") {
		return {
			title: `WhatsApp precisa de pareamento: ${whatsapp.name || `Conexao #${whatsapp.id}`}`,
			subtitle: "Abra as configuracoes do WhatsApp e confira o QR Code.",
		};
	}

	return {
		title: `WhatsApp desconectado: ${whatsapp.name || `Conexao #${whatsapp.id}`}`,
		subtitle: "Verifique a conexao para voltar a receber e enviar mensagens.",
	};
};

const useStyles = makeStyles(theme => ({
	tabContainer: {
		overflowY: "auto",
		maxHeight: 350,
		...theme.scrollbarStyles,
	},
	popoverPaper: {
		width: "100%",
		maxWidth: 350,
		marginLeft: theme.spacing(2),
		marginRight: theme.spacing(1),
		[theme.breakpoints.down("sm")]: {
			maxWidth: 270,
		},
	},
	noShadow: {
		boxShadow: "none !important",
	},
	iconButton: {
		color: theme.palette.text.primary,
		"& .MuiSvgIcon-root": {
			color: theme.palette.text.primary,
			fill: "currentColor",
		},
	},
	notificationButton: {
		position: "relative",
	},
	disconnectAlert: {
		position: "absolute",
		top: -6,
		right: 22,
		color: "#FBBF24 !important",
		fill: "#FBBF24 !important",
		fontSize: 18,
		zIndex: 2,
		pointerEvents: "none",
		animation: "$pulseAlert 1s ease-in-out infinite",
		filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.75))",
	},
	"@keyframes pulseAlert": {
		"0%": {
			transform: "scale(0.9)",
			opacity: 0.65,
		},
		"50%": {
			transform: "scale(1.2)",
			opacity: 1,
		},
		"100%": {
			transform: "scale(0.9)",
			opacity: 0.65,
		},
	},
	disconnectItem: {
		borderLeft: "4px solid #F59E0B",
		background: theme.palette.type === "dark" ? "rgba(245, 158, 11, 0.12)" : "#FFFBEB",
	},
}));

const NotificationsPopOver = ({ className }) => {
	const classes = useStyles();

	const history = useHistory();
	const { user } = useContext(AuthContext);
	const ticketIdUrl = +history.location.pathname.split("/")[2];
	const ticketIdRef = useRef(ticketIdUrl);
	const anchorEl = useRef();
	const [isOpen, setIsOpen] = useState(false);
	const [notifications, setNotifications] = useState([]);
	const [disconnectedWhatsapps, setDisconnectedWhatsapps] = useState([]);

	const [, setDesktopNotifications] = useState([]);

	const { tickets } = useTickets({ withUnreadMessages: "true" });
	const { whatsApps } = useWhatsApps();
	const [play] = useSound(alertSound);
	const soundAlertRef = useRef();

	const historyRef = useRef(history);

	useEffect(() => {
		soundAlertRef.current = play;

		if (!("Notification" in window)) {
			console.log("This browser doesn't support notifications");
		}
	}, [play]);

	useEffect(() => {
		setNotifications(tickets);
	}, [tickets]);

	useEffect(() => {
		setDisconnectedWhatsapps(whatsApps.filter(isWhatsappSessionAttention));
	}, [whatsApps]);

	useEffect(() => {
		ticketIdRef.current = ticketIdUrl;
	}, [ticketIdUrl]);

	useEffect(() => {
		if (user?.id && "Notification" in window && Notification.permission === "granted") {
			subscribeToPushNotifications(api).catch(() => {});
		}
	}, [user]);

	useEffect(() => {
		const socket = openSocket();

		socket.on("connect", () => socket.emit("joinNotification"));

		socket.on("ticket", data => {
			if (data.action === "updateUnread" || data.action === "delete") {
				setNotifications(prevState => {
					const ticketIndex = prevState.findIndex(t => t.id === data.ticketId);
					if (ticketIndex !== -1) {
						prevState.splice(ticketIndex, 1);
						return [...prevState];
					}
					return prevState;
				});

				setDesktopNotifications(prevState => {
					const notfiticationIndex = prevState.findIndex(
						n => n.tag === String(data.ticketId)
					);
					if (notfiticationIndex !== -1) {
						prevState[notfiticationIndex].close();
						prevState.splice(notfiticationIndex, 1);
						return [...prevState];
					}
					return prevState;
				});
			}
		});

		socket.on("appMessage", data => {
			if (
				data.action === "create" &&
				!data.message.read &&
				(data.ticket.userId === user?.id || !data.ticket.userId)
			) {
				setNotifications(prevState => {
					const ticketIndex = prevState.findIndex(t => t.id === data.ticket.id);
					if (ticketIndex !== -1) {
						prevState[ticketIndex] = data.ticket;
						return [...prevState];
					}
					return [data.ticket, ...prevState];
				});

				const shouldNotNotificate =
					(data.message.ticketId === ticketIdRef.current &&
						document.visibilityState === "visible") ||
					(data.ticket.userId && data.ticket.userId !== user?.id) ||
					data.ticket.isGroup;

				if (shouldNotNotificate) return;

				handleNotifications(data);
			}
		});

		socket.on("whatsappSession", data => {
			const session = data?.session;
			if (!session?.id) return;

			if (isWhatsappSessionAttention(session)) {
				setDisconnectedWhatsapps(prevState => {
					const exists = prevState.some(item => Number(item.id) === Number(session.id));
					if (exists) {
						return prevState.map(item => Number(item.id) === Number(session.id) ? session : item);
					}
					return [session, ...prevState];
				});
				return;
			}

			if (getWhatsappStatus(session) === "CONNECTED") {
				setDisconnectedWhatsapps(prevState => prevState.filter(item => Number(item.id) !== Number(session.id)));
			}
		});

		return () => {
			socket.disconnect();
		};
	}, [user]);

	const ensureNotificationPermission = async () => {
		if (!("Notification" in window)) return false;
		if (Notification.permission === "granted") {
			subscribeToPushNotifications(api).catch(() => {});
			return true;
		}
		if (Notification.permission !== "default") return false;

		const permission = await Notification.requestPermission();
		if (permission === "granted") {
			subscribeToPushNotifications(api).catch(() => {});
			return true;
		}
		return false;
	};

	const handleNotifications = async data => {
		const { message, contact, ticket } = data;
		const canNotify = await ensureNotificationPermission();

		if (!canNotify) {
			soundAlertRef.current();
			return;
		}

		const options = {
			body: `${message.body} - ${format(new Date(), "HH:mm")}`,
			icon: contact.profilePicUrl,
			tag: ticket.id,
			renotify: true,
		};

		const notification = new Notification(
			`${i18n.t("tickets.notification.message")} ${contact.name}`,
			options
		);

		notification.onclick = e => {
			e.preventDefault();
			window.focus();
			historyRef.current.push(`/tickets/${ticket.id}`);
		};

		setDesktopNotifications(prevState => {
			const notfiticationIndex = prevState.findIndex(
				n => n.tag === notification.tag
			);
			if (notfiticationIndex !== -1) {
				prevState[notfiticationIndex] = notification;
				return [...prevState];
			}
			return [notification, ...prevState];
		});

		soundAlertRef.current();
	};

	const handleClick = () => {
		setIsOpen(prevState => !prevState);
		ensureNotificationPermission();
	};

	const handleClickAway = () => {
		setIsOpen(false);
	};

	const NotificationTicket = ({ children }) => {
		return <div onClick={handleClickAway}>{children}</div>;
	};

	return (
		<>
			<IconButton
				onClick={handleClick}
				ref={anchorEl}
				aria-label="Open Notifications"
				className={clsx(classes.iconButton, classes.notificationButton, className)}
			>
				<Badge badgeContent={notifications.length + disconnectedWhatsapps.length} color="secondary">
					<ChatIcon />
				</Badge>
				{disconnectedWhatsapps.length > 0 && <WarningIcon className={classes.disconnectAlert} />}
			</IconButton>
			<Popover
				disableScrollLock
				open={isOpen}
				anchorEl={anchorEl.current}
				anchorOrigin={{
					vertical: "bottom",
					horizontal: "right",
				}}
				transformOrigin={{
					vertical: "top",
					horizontal: "right",
				}}
				classes={{ paper: classes.popoverPaper }}
				onClose={handleClickAway}
			>
				<List dense className={classes.tabContainer}>
					{disconnectedWhatsapps.map(whatsapp => {
						const alertText = getWhatsappAlertText(whatsapp);

						return (
							<ListItem key={`whatsapp-${whatsapp.id}`} className={classes.disconnectItem}>
								<ListItemText
									primary={alertText.title}
									secondary={alertText.subtitle}
								/>
							</ListItem>
						);
					})}
					{notifications.length === 0 && disconnectedWhatsapps.length === 0 ? (
						<ListItem>
							<ListItemText>{i18n.t("notifications.noTickets")}</ListItemText>
						</ListItem>
					) : (
						notifications.map(ticket => (
							<NotificationTicket key={ticket.id}>
								<TicketListItem ticket={ticket} />
							</NotificationTicket>
						))
					)}
				</List>
			</Popover>
		</>
	);
};

export default NotificationsPopOver;
