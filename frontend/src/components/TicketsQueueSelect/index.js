import React from "react";

import { makeStyles } from "@material-ui/core/styles";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import Checkbox from "@material-ui/core/Checkbox";
import ListItemText from "@material-ui/core/ListItemText";
import Tooltip from "@material-ui/core/Tooltip";

import { i18n } from "../../translate/i18n";

const ALL_QUEUES = "__all_queues__";

const useStyles = makeStyles(theme => ({
	formControl: {
		flex: 1,
		minWidth: 120,
		maxWidth: 164,
		margin: 0,
	},
	select: {
		height: 32,
		borderRadius: 6,
		fontSize: 12,
		color: theme.palette.text.primary,
		"& .MuiSelect-select": {
			display: "flex",
			alignItems: "center",
			height: 32,
			boxSizing: "border-box",
			padding: theme.spacing(0, 4, 0, 1.25),
		},
		"& .MuiOutlinedInput-notchedOutline": {
			borderColor: theme.palette.divider,
		},
	},
}));

const TicketsQueueSelect = ({
	userQueues = [],
	selectedQueueIds = [],
	onChange,
}) => {
	const classes = useStyles();
	const allQueueIds = userQueues.map(queue => queue.id);
	const allSelected = allQueueIds.length > 0 &&
		allQueueIds.every(queueId => selectedQueueIds.includes(queueId));

	const handleChange = event => {
		const values = event.target.value;

		if (values.includes(ALL_QUEUES) || values.length === 0) {
			onChange(allQueueIds);
			return;
		}

		onChange(values);
	};

	const renderSelectedQueues = () => {
		if (!userQueues.length || allSelected) {
			return i18n.t("ticketsQueueSelect.all");
		}

		if (selectedQueueIds.length === 1) {
			return userQueues.find(queue => queue.id === selectedQueueIds[0])?.name ||
				i18n.t("ticketsQueueSelect.all");
		}

		return i18n.t("ticketsQueueSelect.selected", {
			count: selectedQueueIds.length,
		});
	};

	return (
		<Tooltip arrow title={i18n.t("ticketsQueueSelect.tooltip")}>
			<FormControl className={classes.formControl}>
				<Select
					multiple
					displayEmpty
					variant="outlined"
					value={selectedQueueIds}
					onChange={handleChange}
					className={classes.select}
					inputProps={{ "aria-label": i18n.t("ticketsQueueSelect.tooltip") }}
					MenuProps={{
						anchorOrigin: {
							vertical: "bottom",
							horizontal: "left",
						},
						transformOrigin: {
							vertical: "top",
							horizontal: "left",
						},
						getContentAnchorEl: null,
					}}
					renderValue={renderSelectedQueues}
				>
					<MenuItem dense value={ALL_QUEUES}>
						<Checkbox size="small" color="primary" checked={allSelected} />
						<ListItemText primary={i18n.t("ticketsQueueSelect.all")} />
					</MenuItem>
					{userQueues.map(queue => (
						<MenuItem dense key={queue.id} value={queue.id}>
							<Checkbox
								style={{ color: queue.color }}
								size="small"
								checked={selectedQueueIds.includes(queue.id)}
							/>
							<ListItemText primary={queue.name} />
						</MenuItem>
					))}
				</Select>
			</FormControl>
		</Tooltip>
	);
};

export default TicketsQueueSelect;
