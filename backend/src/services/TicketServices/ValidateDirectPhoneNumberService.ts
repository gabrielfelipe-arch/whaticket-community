import AppError from "../../errors/AppError";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { whatsappProvider } from "../../providers/WhatsApp";
import NormalizeDirectPhoneNumber from "./NormalizeDirectPhoneNumber";

interface Request {
  number: string;
  userId: number;
}

const ValidateDirectPhoneNumberService = async ({
  number,
  userId
}: Request): Promise<string> => {
  const requestedNumber = NormalizeDirectPhoneNumber(number, {
    applyBrazilDefault: true
  });

  if (requestedNumber.length < 8 || requestedNumber.length > 15) {
    throw new AppError("ERR_WAPP_INVALID_CONTACT", 400);
  }

  const whatsapp = await GetDefaultWhatsApp(userId);
  let providerNumber: string;

  try {
    providerNumber = await whatsappProvider.checkNumber(
      whatsapp.id,
      requestedNumber
    );
  } catch (error) {
    if (
      ["ERR_NUMBER_NOT_ON_WHATSAPP", "ERR_WAPP_NUMBER_NOT_REGISTERED"].includes(
        error?.message
      )
    ) {
      throw new AppError("ERR_WAPP_NUMBER_NOT_REGISTERED", 400);
    }
    throw error;
  }

  const validNumber = NormalizeDirectPhoneNumber(providerNumber);
  if (!validNumber) {
    throw new AppError("ERR_WAPP_NUMBER_NOT_REGISTERED", 400);
  }

  return validNumber;
};

export default ValidateDirectPhoneNumberService;
