import { toast } from "react-toastify";
import { i18n } from "../translate/i18n";

export const getErrorMessage = err => {
	const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
	if (!errorMsg) {
		return "Nao foi possivel concluir a acao. Tente novamente ou verifique os dados informados.";
	}

	if (errorMsg === "ERR_INVALID_CREDENTIALS") {
		return "CPF ou senha invalidos. Confira os dados e tente novamente.";
	}

	if (i18n.exists(`backendErrors.${errorMsg}`)) {
		return i18n.t(`backendErrors.${errorMsg}`);
	}

	return errorMsg;
};

const toastError = err => {
	const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
	if (
		["ERR_SESSION_EXPIRED", "jwt expired", "jwt malformed"].includes(errorMsg) ||
		String(errorMsg || "").startsWith("Invalid token.")
	) {
		return;
	}

	if (errorMsg) {
		toast.error(getErrorMessage(err), {
			toastId: errorMsg,
		});
	} else {
		toast.error(getErrorMessage(err));
	}
};

export default toastError;
