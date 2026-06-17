import GlpiLog from "../../models/GlpiLog";

type LogPayload = {
  action: string;
  status: string;
  message?: string;
  ticketId?: number;
  userId?: number;
  payload?: unknown;
  response?: unknown;
  error?: unknown;
};

const safeStringify = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch (err) {
    return String(value);
  }
};

const CreateGlpiLogService = async (data: LogPayload): Promise<void> => {
  await GlpiLog.create({
    action: data.action,
    status: data.status,
    message: data.message || null,
    ticketId: data.ticketId || null,
    userId: data.userId || null,
    payload: safeStringify(data.payload),
    response: safeStringify(data.response),
    error: safeStringify(data.error)
  });
};

export default CreateGlpiLogService;
