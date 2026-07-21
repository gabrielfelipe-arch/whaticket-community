import React from "react";

import { makeStyles } from "@material-ui/core/styles";
import Skeleton from "@material-ui/lab/Skeleton";

const useStyles = makeStyles(theme => ({
	row: {
		height: 60,
		display: "flex",
		alignItems: "center",
		gap: theme.spacing(1),
		padding: theme.spacing(0.5, 1.25),
		borderBottom: `1px solid ${theme.palette.divider}`,
	},
	content: {
		flex: 1,
		minWidth: 0,
	},
}));

const TicketsSkeleton = () => {
	const classes = useStyles();

	return (
		<>
			{[72, 58, 66, 62, 76].map((width, index) => (
				<div className={classes.row} key={`${width}-${index}`}>
					<Skeleton animation="wave" variant="circle" width={36} height={36} />
					<div className={classes.content}>
						<Skeleton animation="wave" height={18} width={`${width}%`} />
						<Skeleton animation="wave" height={16} width={`${Math.min(width + 14, 92)}%`} />
					</div>
				</div>
			))}
		</>
	);
};

export default TicketsSkeleton;
