import React from "react";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(theme => ({
	titleBlock: {
		minWidth: 0,
	},
	title: {
		color: theme.palette.text.primary,
		fontWeight: 800,
		letterSpacing: 0,
		marginBottom: 2,
	},
	subtitle: {
		color: theme.palette.text.secondary,
		lineHeight: 1.45,
	},
}));

export default function Title(props) {
	const classes = useStyles();

	return (
		<div className={classes.titleBlock}>
			<Typography variant="h5" className={classes.title}>
				{props.children}
			</Typography>
			{props.subtitle && (
				<Typography variant="body2" className={classes.subtitle}>
					{props.subtitle}
				</Typography>
			)}
		</div>
	);
}
