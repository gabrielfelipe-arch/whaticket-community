import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";

interface QueueData {
  name: string;
  color: string;
  useAI?: boolean;
  aiSettingId?: number | null;
  businessHoursEnabled?: boolean;
  businessHoursMode?: string | null;
  businessHours?: string | null;
  unavailableMessage?: string | null;
  unavailableMediaUrl?: string | null;
  unavailableMediaType?: string | null;
  unavailableMediaName?: string | null;
  distributionMode?: string;
  maxActiveTicketsPerUser?: number | null;
  balanceAction?: string;
  overflowAction?: string;
  sendQueuePositionMessage?: boolean;
  scheduledReturnWindowHours?: number | null;
  queuePositionMessage?: string | null;
  blockIfUserHasStalledTicket?: boolean;
  stalledTicketMinutes?: number | null;
  stalledTicketAction?: string;
  glpiEnabled?: boolean;
}

const CreateQueueService = async (queueData: QueueData): Promise<Queue> => {
  const { color, name } = queueData;

  const queueSchema = Yup.object().shape({
    name: Yup.string()
      .min(2, "ERR_QUEUE_INVALID_NAME")
      .required("ERR_QUEUE_INVALID_NAME")
      .test(
        "Check-unique-name",
        "ERR_QUEUE_NAME_ALREADY_EXISTS",
        async value => {
          if (value) {
            const queueWithSameName = await Queue.findOne({
              where: { name: value }
            });

            return !queueWithSameName;
          }
          return false;
        }
      ),
    color: Yup.string()
      .required("ERR_QUEUE_INVALID_COLOR")
      .test("Check-color", "ERR_QUEUE_INVALID_COLOR", async value => {
        if (value) {
          const colorTestRegex = /^#[0-9a-f]{3,6}$/i;
          return colorTestRegex.test(value);
        }
        return false;
      })
      .test(
        "Check-color-exists",
        "ERR_QUEUE_COLOR_ALREADY_EXISTS",
        async value => {
          if (value) {
            const queueWithSameColor = await Queue.findOne({
              where: { color: value }
            });
            return !queueWithSameColor;
          }
          return false;
        }
      )
  });

  try {
    await queueSchema.validate({ color, name });
  } catch (err) {
    throw new AppError(err.message);
  }

  if (queueData.useAI && !queueData.aiSettingId) {
    throw new AppError("Escolha a configuracao de IA ou desative o uso de IA nesta fila.", 400);
  }

  const businessHoursMode = queueData.businessHoursMode || (queueData.businessHoursEnabled ? "custom" : "always");
  if (!["always", "company", "custom"].includes(businessHoursMode)) {
    throw new AppError("Escolha uma opcao valida de horario de funcionamento.", 400);
  }

  queueData.businessHoursMode = businessHoursMode;
  queueData.businessHoursEnabled = businessHoursMode !== "always";

  if (businessHoursMode === "custom") {
    if (!queueData.businessHours || !String(queueData.businessHours).trim()) {
      throw new AppError("Informe o horario de funcionamento da fila.", 400);
    }

    if (!queueData.unavailableMessage && !queueData.unavailableMediaUrl) {
      throw new AppError("Informe a mensagem de indisponibilidade da fila.", 400);
    }
  }

  const distributionMode = queueData.distributionMode || "manual_free";
  if (![
    "manual_free",
    "manual_limit",
    "manual_balanced",
    "auto_least_load",
    "round_robin",
    "least_load_round_robin"
  ].includes(distributionMode)) {
    throw new AppError("Escolha um modo de distribuição válido.", 400);
  }

  queueData.distributionMode = distributionMode;
  queueData.balanceAction = queueData.balanceAction || "ignore";
  queueData.overflowAction = queueData.overflowAction || "keep_waiting";
  queueData.stalledTicketAction = queueData.stalledTicketAction || "ignore";
  queueData.scheduledReturnWindowHours = Number(queueData.scheduledReturnWindowHours ?? 24);

  if (queueData.maxActiveTicketsPerUser !== null && queueData.maxActiveTicketsPerUser !== undefined && Number(queueData.maxActiveTicketsPerUser) < 1) {
    throw new AppError("O limite máximo por atendente deve ser maior que zero.", 400);
  }

  if (Number(queueData.scheduledReturnWindowHours) < 1) {
    throw new AppError("A janela de retorno de mensagem agendada deve ser maior que zero.", 400);
  }

  if (queueData.blockIfUserHasStalledTicket && !queueData.stalledTicketMinutes) {
    throw new AppError("Informe o tempo para considerar atendimento parado.", 400);
  }

  if (queueData.sendQueuePositionMessage && !queueData.queuePositionMessage) {
    queueData.queuePositionMessage =
      "Atendimento nº {{ticketId}} criado com sucesso.\n\nVocê foi encaminhado para a fila {{queueName}}.\nSua posição atual é: {{position}}º.\n\nAguarde, em breve um atendente irá te chamar.";
  }

  const queue = await Queue.create(queueData);

  return queue;
};

export default CreateQueueService;
