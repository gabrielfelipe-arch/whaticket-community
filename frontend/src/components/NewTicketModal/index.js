import React, { useContext, useEffect, useState } from "react";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListItemText,
  TextField,
  Typography,
} from "@material-ui/core";
import Autocomplete, { createFilterOptions } from "@material-ui/lab/Autocomplete";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import ContactModal from "../ContactModal";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";

const filter = createFilterOptions({ trim: true });
const onlyDigits = value => String(value || "").replace(/\D/g, "");
const directNumberValue = value => {
  const text = String(value || "").trim();
  const digits = onlyDigits(text);
  return text.startsWith("+") ? `+${digits}` : digits;
};
const displayNumber = value => String(value || "").startsWith("+") ? value : `+${value}`;
const isPhoneInput = value => {
  const text = String(value || "").trim();
  const digits = onlyDigits(text);
  return /^[+\d\s().-]+$/.test(text) && digits.length >= 8 && digits.length <= 15;
};

const NewTicketModal = ({ modalOpen, onClose, onStartDraft }) => {
  const { user } = useContext(AuthContext);
  const canCreateContacts =
    user?.profile === "admin" || user?.permissions?.["contacts.create"] === true;

  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [selectedOption, setSelectedOption] = useState(null);
  const [newContact, setNewContact] = useState({});
  const [contactModalOpen, setContactModalOpen] = useState(false);

  useEffect(() => {
    if (!modalOpen || searchParam.trim().length < 3) {
      setOptions([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const { data } = await api.get("/contacts", {
          params: { searchParam: searchParam.trim() },
        });
        setOptions(data.contacts || []);
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, modalOpen]);

  const handleClose = () => {
    onClose();
    setSearchParam("");
    setSelectedOption(null);
    setOptions([]);
  };

  const handleStartConversation = async option => {
    if (!option || loading) return;
    if (option.directNumber) {
      setLoading(true);
      try {
        const { data } = await api.post("/tickets/validate-number", {
          number: option.directNumber,
        });
        handleClose();
        onStartDraft({ number: data.number });
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
      return;
    }

    handleClose();
    onStartDraft({
      contactId: option.id,
      number: option.number,
      name: option.name,
      profilePicUrl: option.profilePicUrl,
    });
  };

  const handleSelectOption = (event, value) => {
    if (typeof value === "string") {
      if (isPhoneInput(value)) {
        setSelectedOption({ directNumber: directNumberValue(value) });
      }
      return;
    }

    if (value?.createContactName) {
      setNewContact({ name: value.createContactName });
      setContactModalOpen(true);
      setSelectedOption(null);
      return;
    }

    setSelectedOption(value || null);
  };

  const handleAddNewContactTicket = contact => {
    setContactModalOpen(false);
    handleClose();
    onStartDraft({
      contactId: contact.id,
      number: contact.number,
      name: contact.name,
      profilePicUrl: contact.profilePicUrl,
    });
  };

  const createOptions = (availableOptions, params) => {
    const filtered = filter(availableOptions, params);
    const input = params.inputValue.trim();
    const digits = onlyDigits(input);
    const exactNumberExists = availableOptions.some(
      option => onlyDigits(option.number) === digits
    );

    if (isPhoneInput(input) && !exactNumberExists) {
      filtered.push({ directNumber: directNumberValue(input) });
    } else if (input && !isPhoneInput(input) && canCreateContacts && !loading) {
      filtered.push({ createContactName: input });
    }

    return filtered;
  };

  const optionLabel = option => {
    if (typeof option === "string") return option;
    if (option.directNumber) return displayNumber(option.directNumber);
    if (option.createContactName) return option.createContactName;
    return `${option.name || ""}${option.number ? ` - ${option.number}` : ""}`;
  };

  const renderOption = option => {
    if (option.directNumber) {
      return (
        <ListItemText
          primary={displayNumber(option.directNumber)}
          secondary={i18n.t("newTicketModal.directNumber")}
        />
      );
    }

    if (option.createContactName) {
      return (
        <ListItemText
          primary={`${i18n.t("newTicketModal.add")} ${option.createContactName}`}
          secondary={i18n.t("newTicketModal.createContact")}
        />
      );
    }

    return <ListItemText primary={option.name} secondary={option.number} />;
  };

  const optionToStart = selectedOption || (
    isPhoneInput(searchParam)
      ? { directNumber: directNumberValue(searchParam) }
      : null
  );

  return (
    <>
      <ContactModal
        open={contactModalOpen}
        initialValues={newContact}
        onClose={() => setContactModalOpen(false)}
        onSave={handleAddNewContactTicket}
      />

      <Dialog open={modalOpen} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>{i18n.t("newTicketModal.title")}</DialogTitle>
        <DialogContent dividers>
          <Autocomplete
            options={options}
            loading={loading}
            value={selectedOption}
            inputValue={searchParam}
            autoHighlight
            freeSolo
            clearOnEscape
            filterOptions={createOptions}
            getOptionLabel={optionLabel}
            renderOption={renderOption}
            onChange={handleSelectOption}
            onInputChange={(event, value, reason) => {
              setSearchParam(value);
              if (reason === "input") setSelectedOption(null);
            }}
            renderInput={params => (
              <TextField
                {...params}
                label={i18n.t("newTicketModal.fieldLabel")}
                variant="outlined"
                autoFocus
                onKeyDown={event => {
                  if (event.key !== "Enter" || loading) return;
                  if (selectedOption) {
                    event.preventDefault();
                    handleStartConversation(selectedOption);
                  } else if (isPhoneInput(searchParam)) {
                    event.preventDefault();
                    handleStartConversation({ directNumber: directNumberValue(searchParam) });
                  }
                }}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loading && <CircularProgress color="inherit" size={20} />}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
          <Typography variant="caption" color="textSecondary" display="block" style={{ marginTop: 8 }}>
            {i18n.t("newTicketModal.phoneHelp")}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleClose}
            color="secondary"
            disabled={loading}
            variant="outlined"
          >
            {i18n.t("newTicketModal.buttons.cancel")}
          </Button>
          <ButtonWithSpinner
            variant="contained"
            type="button"
            disabled={loading || !optionToStart}
            onClick={() => handleStartConversation(optionToStart)}
            color="primary"
            loading={loading}
          >
            {i18n.t("newTicketModal.buttons.ok")}
          </ButtonWithSpinner>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default NewTicketModal;
