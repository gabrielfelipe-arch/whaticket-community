import Contact from "../../models/Contact";
import GetContactService from "../ContactServices/GetContactService";
import CreateTicketService from "./CreateTicketService";
import ValidateDirectPhoneNumberService from "./ValidateDirectPhoneNumberService";

interface Request {
  number: string;
  userId: number;
  status?: string;
  queueId?: number;
}

const CreateTicketByNumberService = async ({
  number,
  userId,
  status = "open",
  queueId
}: Request) => {
  const validNumber = await ValidateDirectPhoneNumberService({ number, userId });

  const existingContact = await Contact.findOne({
    where: { number: validNumber }
  });
  const contact = existingContact || await GetContactService({
    name: `+${validNumber}`,
    number: validNumber
  });

  return CreateTicketService({
    contactId: contact.id,
    status,
    userId,
    queueId
  });
};

export default CreateTicketByNumberService;
