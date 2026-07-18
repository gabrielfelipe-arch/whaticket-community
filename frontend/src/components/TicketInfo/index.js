import React from "react";

import { Avatar, CardHeader, Chip } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

import { i18n } from "../../translate/i18n";

const useStyles = makeStyles(theme => ({
	avatar: {
		width: 44,
		height: 44,
		border: `2px solid ${theme.palette.type === "dark" ? "#1E293B" : "#E0F2FE"}`,
	},
	aiChip: {
		marginLeft: 8,
		height: 22,
		background: theme.custom?.status?.ai?.bg || "#E0F2FE",
		color: theme.custom?.status?.ai?.color || "#0369A1",
		fontWeight: 800,
	},
	title: {
		display: "flex",
		alignItems: "center",
		gap: theme.spacing(0.5),
		minWidth: 0,
		fontWeight: 800,
	},
	subheader: {
		color: theme.palette.text.secondary,
		fontSize: 12,
	},
}));

const TicketInfo = ({ contact, ticket, onClick }) => {
	const classes = useStyles();

	return (
		<CardHeader
			onClick={onClick}
			style={{ cursor: "pointer" }}
			titleTypographyProps={{ noWrap: true }}
			subheaderTypographyProps={{ noWrap: true, className: classes.subheader }}
			avatar={<Avatar src={contact.profilePicUrl} alt="contact_image" className={classes.avatar} />}
			title={
				<span className={classes.title}>
					{`${contact.name} #${ticket.id}`}
					{ticket.aiActive && (
						<Chip
							size="small"
							label="Atendimento com IA"
							className={classes.aiChip}
						/>
					)}
				</span>
			}
			subheader={
				ticket.user &&
				`${i18n.t("messagesList.header.assignedTo")} ${ticket.user.name}`
			}
		/>
	);
};

export default TicketInfo;
