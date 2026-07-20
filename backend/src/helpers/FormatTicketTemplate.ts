import Setting from "../models/Setting";
import Ticket from "../models/Ticket";
import RenderMessageVariables, { replaceMessageVariables } from "./RenderMessageVariables";

const FormatTicketTemplate = async (body: string, ticket: Ticket): Promise<string> => {
  const brandName = await Setting.findOne({ where: { key: "brandName" } });

  const renderedBase = await RenderMessageVariables(body || "", ticket.contact);

  return replaceMessageVariables(renderedBase, {
    nome_atendente: ticket.user?.name || "",
    fila: ticket.queue?.name || "",
    fila_humana: ticket.queue?.name || "",
    categoria: ticket.category?.name || "",
    motivo_encerramento: ticket.closingReason?.name || "",
    ultima_mensagem: ticket.lastMessage || "",
    data_hora: new Date().toLocaleString("pt-BR"),
    nome_empresa: brandName?.value || "",
    nome_ia: "IA"
  });
};

export default FormatTicketTemplate;
