export type MessageSenderType = "customer" | "ai" | "human" | "system" | "ura";

const automaticSenderTypes = new Set<MessageSenderType>(["ai", "system", "ura"]);

interface ResolveMessageSenderTypeParams {
  requestedSenderType: MessageSenderType;
  existingSenderType?: string | null;
  fromMe?: boolean;
}

const ResolveMessageSenderType = ({
  requestedSenderType,
  existingSenderType,
  fromMe
}: ResolveMessageSenderTypeParams): MessageSenderType => {
  if (
    fromMe &&
    requestedSenderType === "human" &&
    existingSenderType &&
    automaticSenderTypes.has(existingSenderType as MessageSenderType)
  ) {
    return existingSenderType as MessageSenderType;
  }

  return requestedSenderType;
};

export default ResolveMessageSenderType;
