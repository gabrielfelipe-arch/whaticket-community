import React, { useState, useEffect, useRef, useContext } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import {
  makeStyles,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  FormControlLabel,
  Switch,
} from "@material-ui/core";
import { green } from "@material-ui/core/colors";
import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import MessageTemplateField from "../MessageTemplateField";

const useStyles = makeStyles((theme) => ({
  root: {
    flexWrap: "wrap",
  },
  textField: {
    marginRight: theme.spacing(1),
    width: "100%",
  },

  btnWrapper: {
    position: "relative",
  },

  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
  textQuickAnswerContainer: {
    width: "100%",
  },
}));

const QuickAnswerSchema = Yup.object().shape({
  shortcut: Yup.string()
    .min(2, "Too Short!")
    .max(15, "Too Long!")
    .required("Required"),
  message: Yup.string()
    .min(8, "Too Short!")
    .max(30000, "Too Long!")
    .required("Required"),
});

const asBoolean = value =>
  value === true || value === "true" || value === "1" || value === 1;

const normalizeQuickAnswer = value => ({
  ...value,
  global: asBoolean(value?.global),
});

const QuickAnswersModal = ({
  open,
  onClose,
  quickAnswerId,
  initialValues,
  onSave,
}) => {
  const classes = useStyles();
  const isMounted = useRef(true);
  const { user } = useContext(AuthContext);
  const canPublishGlobal =
    user?.profile === "admin" ||
    user?.permissions?.["quickAnswers.publish_global"] === true;

  const initialState = {
    shortcut: "",
    message: "",
    global: user?.profile === "admin",
  };

  const [quickAnswer, setQuickAnswer] = useState(initialState);
  const [mediaFile, setMediaFile] = useState(null);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchQuickAnswer = async () => {
      if (!open) return;

      if (initialValues) {
        setQuickAnswer((prevState) => {
          return normalizeQuickAnswer({ ...prevState, ...initialValues });
        });
      }

      if (!quickAnswerId) {
        if (!initialValues) {
          setQuickAnswer({
            shortcut: "",
            message: "",
            global: user?.profile === "admin",
          });
        }
        return;
      }

      try {
        const { data } = await api.get(`/quickAnswers/${quickAnswerId}`);
        if (isMounted.current) {
          setQuickAnswer(normalizeQuickAnswer(data));
        }
      } catch (err) {
        toastError(err);
      }
    };

    fetchQuickAnswer();
  }, [quickAnswerId, open, initialValues, user?.profile]);

  const handleClose = () => {
    onClose();
    setQuickAnswer(initialState);
    setMediaFile(null);
  };

  const handleSaveQuickAnswer = async (values) => {
    try {
      const payload = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        payload.append(key, key === "global" ? String(asBoolean(value)) : value);
      });
      if (mediaFile) payload.append("media", mediaFile);
      const config = { headers: { "Content-Type": "multipart/form-data" } };
      if (quickAnswerId) {
        await api.put(`/quickAnswers/${quickAnswerId}`, payload, config);
        handleClose();
      } else {
        const { data } = await api.post("/quickAnswers", payload, config);
        if (onSave) {
          onSave(data);
        }
        handleClose();
      }
      toast.success(i18n.t("quickAnswersModal.success"));
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <div className={classes.root}>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        scroll="paper"
      >
        <DialogTitle id="form-dialog-title">
          {quickAnswerId
            ? `${i18n.t("quickAnswersModal.title.edit")}`
            : `${i18n.t("quickAnswersModal.title.add")}`}
        </DialogTitle>
        <Formik
          initialValues={quickAnswer}
          enableReinitialize={true}
          validationSchema={QuickAnswerSchema}
          onSubmit={async (values, actions) => {
            await handleSaveQuickAnswer(values);
            actions.setSubmitting(false);
          }}
        >
          {({ values, errors, touched, isSubmitting }) => (
            <Form>
              <DialogContent dividers>
                <div className={classes.textQuickAnswerContainer}>
                  <Field
                    as={TextField}
                    label={i18n.t("quickAnswersModal.form.shortcut")}
                    name="shortcut"
                    autoFocus
                    error={touched.shortcut && Boolean(errors.shortcut)}
                    helperText={touched.shortcut && errors.shortcut}
                    variant="outlined"
                    margin="dense"
                    className={classes.textField}
                    fullWidth
                  />
                </div>
                <div className={classes.textQuickAnswerContainer}>
                  <MessageTemplateField
                    formik
                    label={i18n.t("quickAnswersModal.form.message")}
                    name="message"
                    error={touched.message && Boolean(errors.message)}
                    helperText={touched.message && errors.message}
                    rows={5}
                    onMediaChange={setMediaFile}
                    mediaName={mediaFile?.name || values.mediaName}
                  />
                </div>
                {canPublishGlobal && (
                  <FormControlLabel
                    control={
                      <Field name="global">
                        {({ field, form }) => (
                          <Switch
                            {...field}
                            color="primary"
                            checked={asBoolean(field.value)}
                            onChange={(event, checked) => {
                              form.setFieldValue("global", checked);
                            }}
                            inputProps={{ "aria-label": "Publicar para todos" }}
                          />
                        )}
                      </Field>
                    }
                    label="Publicar para todos"
                  />
                )}
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={handleClose}
                  color="secondary"
                  disabled={isSubmitting}
                  variant="outlined"
                >
                  {i18n.t("quickAnswersModal.buttons.cancel")}
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  disabled={isSubmitting}
                  variant="contained"
                  className={classes.btnWrapper}
                >
                  {quickAnswerId
                    ? `${i18n.t("quickAnswersModal.buttons.okEdit")}`
                    : `${i18n.t("quickAnswersModal.buttons.okAdd")}`}
                  {isSubmitting && (
                    <CircularProgress
                      size={24}
                      className={classes.buttonProgress}
                    />
                  )}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </div>
  );
};

export default QuickAnswersModal;
