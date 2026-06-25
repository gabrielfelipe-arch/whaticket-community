import { toast } from "react-toastify";
import { i18n } from "../translate/i18n";

const toastError = err => {
	const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
	if (
		["ERR_SESSION_EXPIRED", "jwt expired", "jwt malformed"].includes(errorMsg) ||
		String(errorMsg || "").startsWith("Invalid token.")
	) {
		return;
	}

	if (errorMsg) {
		if (i18n.exists(`backendErrors.${errorMsg}`)) {
			toast.error(i18n.t(`backendErrors.${errorMsg}`), {
				toastId: errorMsg,
			});
		} else {
			toast.error(errorMsg, {
				toastId: errorMsg,
			});
		}
	} else {
		toast.error("Nao foi possivel concluir a acao. Tente novamente ou verifique os dados informados.");
	}
};

export default toastError;
