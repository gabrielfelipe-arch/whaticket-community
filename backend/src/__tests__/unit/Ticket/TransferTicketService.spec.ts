jest.mock("../../../models/User", () => ({
  __esModule: true,
  default: { findByPk: jest.fn() }
}));
jest.mock("../../../models/Queue", () => ({
  __esModule: true,
  default: { findByPk: jest.fn() }
}));
jest.mock("../../../services/TicketServices/UpdateTicketService", () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock("../../../services/TicketServices/ShowTicketService", () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock("../../../services/WbotServices/SendWhatsAppMessage", () => ({
  __esModule: true,
  default: jest.fn()
}));

import Queue from "../../../models/Queue";
import User from "../../../models/User";
import SendWhatsAppMessage from "../../../services/WbotServices/SendWhatsAppMessage";
import ShowTicketService from "../../../services/TicketServices/ShowTicketService";
import TransferTicketService from "../../../services/TicketServices/TransferTicketService";
import UpdateTicketService from "../../../services/TicketServices/UpdateTicketService";

const mockedUserFind = User.findByPk as jest.Mock;
const mockedQueueFind = Queue.findByPk as jest.Mock;
const mockedUpdate = UpdateTicketService as jest.Mock;
const mockedSend = SendWhatsAppMessage as jest.Mock;
const mockedShow = ShowTicketService as jest.Mock;

describe("TransferTicketService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUpdate.mockResolvedValue({ ticket: { id: 45 } });
    mockedSend.mockResolvedValue(undefined);
    mockedShow.mockResolvedValue({
      id: 45,
      user: { id: 2, name: "Gabriel Felipe", messageSignature: "Gabriel" }
    });
  });

  it("transfers exclusively to a user and notifies the customer", async () => {
    mockedUserFind.mockResolvedValue({
      id: 7,
      name: "Samara Moreira",
      messageSignature: "Samara"
    });

    await TransferTicketService({
      ticketId: 45,
      targetType: "user",
      targetId: 7,
      actorUserId: 2,
      whatsappId: 2
    });

    expect(mockedUpdate).toHaveBeenCalledWith({
      ticketId: 45,
      ticketData: { userId: 7, whatsappId: 2 }
    });
    expect(mockedSend).toHaveBeenCalledWith({
      body: "O atendente *Gabriel* transferiu seu atendimento para *Samara*.",
      ticket: { id: 45 }
    });
  });

  it("transfers exclusively to a queue and notifies the customer", async () => {
    mockedQueueFind.mockResolvedValue({ id: 3, name: "Financeiro" });

    await TransferTicketService({
      ticketId: 45,
      targetType: "queue",
      targetId: 3,
      actorUserId: 2
    });

    expect(mockedUpdate).toHaveBeenCalledWith({
      ticketId: 45,
      ticketData: {
        queueId: 3,
        userId: null,
        status: "pending",
        whatsappId: undefined
      }
    });
    expect(mockedSend).toHaveBeenCalledWith({
      body: "O atendente *Gabriel* transferiu seu atendimento para *Financeiro*.",
      ticket: { id: 45 }
    });
  });

  it("uses the acting user's signature when the ticket has no attendant", async () => {
    mockedShow.mockResolvedValue({ id: 45, user: null });
    mockedUserFind
      .mockResolvedValueOnce({ id: 2, name: "Gabriel Felipe", messageSignature: "Gabriel" })
      .mockResolvedValueOnce({ id: 7, name: "Samara Moreira", messageSignature: "Samara" });

    await TransferTicketService({
      ticketId: 45,
      targetType: "user",
      targetId: 7,
      actorUserId: 2
    });

    expect(mockedSend).toHaveBeenCalledWith({
      body: "O atendente *Gabriel* transferiu seu atendimento para *Samara*.",
      ticket: { id: 45 }
    });
  });

  it("rejects a transfer to the user already handling the ticket", async () => {
    await expect(TransferTicketService({
      ticketId: 45,
      targetType: "user",
      targetId: 2,
      actorUserId: 2
    })).rejects.toMatchObject({ message: "ERR_TRANSFER_SAME_USER", statusCode: 400 });

    expect(mockedUpdate).not.toHaveBeenCalled();
    expect(mockedSend).not.toHaveBeenCalled();
  });
});
