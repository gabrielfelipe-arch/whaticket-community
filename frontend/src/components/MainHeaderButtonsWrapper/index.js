import React from "react";

import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(theme => ({
	MainHeaderButtonsWrapper: {
		flex: "none",
		marginLeft: "auto",
		display: "flex",
		alignItems: "center",
		gap: theme.spacing(1),
		flexWrap: "wrap",
		justifyContent: "flex-end",
		"& > *": {
			margin: 0,
		},
		"& .MuiTextField-root": {
			minWidth: 240,
		},
		[theme.breakpoints.down("sm")]: {
			marginLeft: 0,
			width: "100%",
			justifyContent: "flex-start",
			"& .MuiTextField-root": {
				minWidth: 220,
			},
		},
		[theme.breakpoints.down("xs")]: {
			"& .MuiTextField-root": {
				width: "100%",
				minWidth: "100%",
			},
			"& .MuiButton-root": {
				flex: "1 1 auto",
			},
		},
	},
}));

const MainHeaderButtonsWrapper = ({ children }) => {
	const classes = useStyles();

	return <div className={classes.MainHeaderButtonsWrapper}>{children}</div>;
};

export default MainHeaderButtonsWrapper;
