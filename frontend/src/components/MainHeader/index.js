import React from "react";

import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(theme => ({
	contactsHeader: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: theme.spacing(2),
		padding: theme.spacing(0.5, 0, 2, 0),
		borderBottom: `1px solid ${theme.palette.divider}`,
		marginBottom: theme.spacing(2),
		"& h5, & h6": {
			fontWeight: 800,
			color: theme.palette.text.primary,
		},
		[theme.breakpoints.down("xs")]: {
			alignItems: "flex-start",
			flexDirection: "column",
		},
	},
}));

const MainHeader = ({ children }) => {
	const classes = useStyles();

	return <div className={classes.contactsHeader}>{children}</div>;
};

export default MainHeader;
