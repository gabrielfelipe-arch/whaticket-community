import { toast } from "react-toastify";
import { i18n } from "../translate/i18n";

const toastError = err => {
	const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
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
