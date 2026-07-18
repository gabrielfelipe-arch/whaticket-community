import React from "react";

import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(theme => ({
	contactsHeader: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: theme.spacing(2),
		minHeight: 68,
		padding: theme.spacing(1, 0, 1.5, 0),
		borderBottom: `1px solid ${theme.palette.divider}`,
		marginBottom: 0,
		"& h5, & h6": {
			fontWeight: 800,
			color: theme.palette.text.primary,
			marginBottom: 0,
		},
		[theme.breakpoints.down("sm")]: {
			alignItems: "flex-start",
			flexDirection: "column",
			paddingBottom: theme.spacing(1.25),
		},
	},
}));

const MainHeader = ({ children }) => {
	const classes = useStyles();

	return <div className={classes.contactsHeader}>{children}</div>;
};

export default MainHeader;
