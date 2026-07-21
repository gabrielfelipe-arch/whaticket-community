import React, { useState, useEffect, useContext, useCallback } from "react";
import { useHistory } from "react-router-dom";

import Button from "@material-ui/core/Button";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import Select from "@material-ui/core/Select";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import { makeStyles } from "@material-ui/core";

import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Autocomplete, {
	createFilterOptions,
} from "@material-ui/lab/Autocomplete";
import CircularProgress from "@material-ui/core/CircularProgress";
import PersonOutlineIcon from "@material-ui/icons/PersonOutline";
import BusinessOutlinedIcon from "@material-ui/icons/BusinessOutlined";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import useQueues from "../../hooks/useQueues";
import useWhatsApps from "../../hooks/useWhatsApps";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../Can";

const useStyles = makeStyles((theme) => ({
  maxWidth: {
    width: "100%",
  },
  targetSelector: {
    width: "100%",
    marginBottom: theme.spacing(2.5),
  },
  targetButton: {
    flex: 1,
    minHeight: 42,
    gap: theme.spacing(1),
  },
  targetButtonActive: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    "&:hover": {
      backgroundColor: theme.palette.primary.dark,
    },
  },
}));

const filterOptions = createFilterOptions({
	trim: true,
});

const TransferTicketModal = ({ modalOpen, onClose, ticketid, ticketWhatsappId, currentUserId }) => {
	const history = useHistory();
	const [options, setOptions] = useState([]);
	const [queues, setQueues] = useState([]);
	const [loading, setLoading] = useState(false);
	const [searchParam, setSearchParam] = useState("");
	const [selectedUser, setSelectedUser] = useState(null);
	const [selectedQueue, setSelectedQueue] = useState('');
	const [targetType, setTargetType] = useState("user");
	const [selectedWhatsapp, setSelectedWhatsapp] = useState(ticketWhatsappId);
	const classes = useStyles();
	const { findAll: findAllQueues } = useQueues();
	const { loadingWhatsapps, whatsApps } = useWhatsApps();

	const { user: loggedInUser } = useContext(AuthContext);

	const userCanReceiveTransfer = useCallback((user) => {
		return user?.active !== false && user?.operationalStatus === "online";
	}, []);

	const getUserStatusLabel = useCallback((user) => {
		if (user?.active === false) return i18n.t("transferTicketModal.inactiveLabel");
		if (user?.operationalStatus === "online") return i18n.t("transferTicketModal.onlineLabel");
		if (user?.operationalStatus === "away") return i18n.t("transferTicketModal.awayLabel");
		return i18n.t("transferTicketModal.offlineLabel");
	}, []);

	useEffect(() => {
		const loadQueues = async () => {
			const list = await findAllQueues();
			setQueues(list);
		}
		loadQueues();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (!modalOpen || targetType !== "user" || searchParam.length < 3) {
			setLoading(false);
			return;
		}
		setLoading(true);
		const delayDebounceFn = setTimeout(() => {
			const fetchUsers = async () => {
				try {
					const { data } = await api.get(`/tickets/${ticketid}/transfer-users`, {
						params: { searchParam },
					});
					setOptions(data.users);
					setLoading(false);
				} catch (err) {
					setLoading(false);
					toastError(err);
				}
			};

			fetchUsers();
		}, 500);
		return () => clearTimeout(delayDebounceFn);
	}, [searchParam, modalOpen, targetType]);

	const handleClose = () => {
		onClose();
		setSearchParam("");
		setSelectedUser(null);
		setSelectedQueue('');
		setTargetType("user");
	};

	const handleTargetTypeChange = nextType => {
		setTargetType(nextType);
		setSelectedUser(null);
		setSelectedQueue('');
		setSearchParam("");
		setOptions([]);
	};

	const handleSaveTicket = async e => {
		e.preventDefault();
		if (!ticketid) return;
		if (targetType === "user" && !selectedUser) {
			toast.warning(i18n.t("transferTicketModal.selectTarget"));
			return;
		}
		if (targetType === "queue" && !selectedQueue) {
			toast.warning(i18n.t("transferTicketModal.selectTarget"));
			return;
		}
		if (targetType === "user" && !userCanReceiveTransfer(selectedUser)) {
			toast.warning(i18n.t("transferTicketModal.onlineOnly"));
			return;
		}
		setLoading(true);
		try {
			const data = {
				targetType,
				targetId: targetType === "user" ? selectedUser.id : selectedQueue,
			};

			if(selectedWhatsapp) {
				data.whatsappId = selectedWhatsapp;
			}

			await api.post(`/tickets/${ticketid}/transfer`, data);

			setLoading(false);
			history.push(`/tickets`);
		} catch (err) {
			setLoading(false);
			toastError(err);
		}
	};

	return (
		<Dialog open={modalOpen} onClose={handleClose} maxWidth="lg" scroll="paper">
			<form onSubmit={handleSaveTicket}>
				<DialogTitle id="form-dialog-title">
					{i18n.t("transferTicketModal.title")}
				</DialogTitle>
				<DialogContent dividers>
					<ButtonGroup className={classes.targetSelector} aria-label={i18n.t("transferTicketModal.targetTypeLabel")}>
						<Button
							className={`${classes.targetButton} ${targetType === "user" ? classes.targetButtonActive : ""}`}
							onClick={() => handleTargetTypeChange("user")}
							aria-pressed={targetType === "user"}
						>
							<PersonOutlineIcon fontSize="small" />
							{i18n.t("transferTicketModal.targetUser")}
						</Button>
						<Button
							className={`${classes.targetButton} ${targetType === "queue" ? classes.targetButtonActive : ""}`}
							onClick={() => handleTargetTypeChange("queue")}
							aria-pressed={targetType === "queue"}
						>
							<BusinessOutlinedIcon fontSize="small" />
							{i18n.t("transferTicketModal.targetQueue")}
						</Button>
					</ButtonGroup>
					{targetType === "user" && <Autocomplete
						style={{ width: 300, marginBottom: 20 }}
						getOptionLabel={option => `${option.name}`}
						onChange={(e, newValue) => {
							setSelectedUser(newValue);
						}}
						options={options.filter(option => Number(option.id) !== Number(currentUserId))}
						filterOptions={filterOptions}
						getOptionDisabled={option => !userCanReceiveTransfer(option)}
						autoHighlight
						noOptionsText={i18n.t("transferTicketModal.noOptions")}
						loading={loading}
						renderOption={option => (
							<div style={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 12 }}>
								<span>{option.name}</span>
								<span style={{ color: userCanReceiveTransfer(option) ? "#2e7d32" : "#9e9e9e", fontSize: 12 }}>
									{getUserStatusLabel(option)}
								</span>
							</div>
						)}
						renderInput={params => (
							<TextField
								{...params}
								label={i18n.t("transferTicketModal.fieldLabel")}
								variant="outlined"
								autoFocus
								onChange={e => setSearchParam(e.target.value)}
								InputProps={{
									...params.InputProps,
									endAdornment: (
										<React.Fragment>
											{loading ? (
												<CircularProgress color="inherit" size={20} />
											) : null}
											{params.InputProps.endAdornment}
										</React.Fragment>
									),
								}}
							/>
						)}
					/>}
					{targetType === "queue" && <FormControl variant="outlined" className={classes.maxWidth}>
						<InputLabel>{i18n.t("transferTicketModal.fieldQueueLabel")}</InputLabel>
						<Select
							value={selectedQueue}
							onChange={(e) => setSelectedQueue(e.target.value)}
							label={i18n.t("transferTicketModal.fieldQueuePlaceholder")}
						>
							<MenuItem value={''}>&nbsp;</MenuItem>
							{queues.map((queue) => (
								<MenuItem key={queue.id} value={queue.id}>{queue.name}</MenuItem>
							))}
						</Select>
					</FormControl>}
					<Can
						role={loggedInUser.profile}
						perform="ticket-options:transferWhatsapp"
						yes={() => (!loadingWhatsapps && 
							<FormControl variant="outlined" className={classes.maxWidth} style={{ marginTop: 20 }}>
								<InputLabel>{i18n.t("transferTicketModal.fieldConnectionLabel")}</InputLabel>
								<Select
									value={selectedWhatsapp}
									onChange={(e) => setSelectedWhatsapp(e.target.value)}
									label={i18n.t("transferTicketModal.fieldConnectionPlaceholder")}
								>
									{whatsApps.map((whasapp) => (
										<MenuItem key={whasapp.id} value={whasapp.id}>{whasapp.name}</MenuItem>
									))}
								</Select>
							</FormControl>
						)}
					/>
				</DialogContent>
				<DialogActions>
					<Button
						onClick={handleClose}
						color="secondary"
						disabled={loading}
						variant="outlined"
					>
						{i18n.t("transferTicketModal.buttons.cancel")}
					</Button>
					<ButtonWithSpinner
						variant="contained"
						type="submit"
						color="primary"
						loading={loading}
					>
						{i18n.t("transferTicketModal.buttons.ok")}
					</ButtonWithSpinner>
				</DialogActions>
			</form>
		</Dialog>
	);
};

export default TransferTicketModal;
