import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import { logger } from "../../utils/logger";

interface ExtraInfo {
  name: string;
  value: string;
}

interface Request {
  name: string;
  number: string;
  lid?: string;
  isGroup: boolean;
  email?: string;
  profilePicUrl?: string;
  extraInfo?: ExtraInfo[];
}

const emitContact = (action: "update" | "create", contact: Contact) => {
  const io = getIO();

  io.emit("contact", { action, contact });
};

export const isTechnicalContactName = (name: string | null | undefined, number: string): boolean => {
  const currentName = String(name || "").trim();
  if (!currentName) return true;
  return currentName.replace(/\D/g, "") === number;
};

const getIncomingContactName = (
  currentName: string | null | undefined,
  incomingName: string,
  number: string
): string | undefined => {
  const candidate = String(incomingName || "").trim();
  if (!candidate || candidate.replace(/\D/g, "") === number) return undefined;
  return isTechnicalContactName(currentName, number) ? candidate : undefined;
};

const CreateOrUpdateContactService = async ({
  name,
  number: rawNumber,
  lid,
  profilePicUrl,
  isGroup,
  email = "",
  extraInfo = []
}: Request): Promise<Contact> => {
  const number = isGroup ? rawNumber : rawNumber.replace(/[^0-9]/g, "");
  if (!number && !lid) throw new Error("Either number or lid must be provided");

  const [contactByNumber, contactByLid] = await Promise.all([
    number ? Contact.findOne({ where: { number } }) : null,
    lid ? Contact.findOne({ where: { lid } }) : null
  ]);

  const shouldMerge =
    contactByNumber && contactByLid && contactByNumber.id !== contactByLid.id;

  if (shouldMerge) {
    const incomingContactName = getIncomingContactName(contactByNumber.name, name, number);
    await Ticket.update(
      { contactId: contactByNumber.id },
      { where: { contactId: contactByLid.id } }
    );

    await contactByLid.destroy();

    await contactByNumber.update({
      ...(incomingContactName ? { name: incomingContactName } : {}),
      lid: contactByLid.lid,
      profilePicUrl
    });

    logger.info({
      info: "Merged contacts by number and lid",
      primaryContactId: contactByNumber.id,
      mergedContactId: contactByLid.id
    });

    emitContact("update", contactByNumber);

    return contactByNumber;
  }

  if (contactByNumber) {
    const incomingContactName = getIncomingContactName(contactByNumber.name, name, number);
    await contactByNumber.update({
      ...(incomingContactName ? { name: incomingContactName } : {}),
      lid: lid || contactByNumber.lid,
      profilePicUrl
    });

    emitContact("update", contactByNumber);

    return contactByNumber;
  }

  if (contactByLid) {
    const incomingContactName = getIncomingContactName(contactByLid.name, name, number);
    await contactByLid.update({
      ...(incomingContactName ? { name: incomingContactName } : {}),
      number: number || contactByLid.number,
      profilePicUrl
    });

    emitContact("update", contactByLid);
    return contactByLid;
  }

  const created = await Contact.create({
    name,
    number,
    lid,
    profilePicUrl,
    email,
    isGroup,
    extraInfo
  });

  emitContact("create", created);
  return created;
};

export default CreateOrUpdateContactService;
