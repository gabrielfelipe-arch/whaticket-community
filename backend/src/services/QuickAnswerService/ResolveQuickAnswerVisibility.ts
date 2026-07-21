import AppError from "../../errors/AppError";

interface Request {
  requestedGlobal?: unknown;
  currentGlobal?: boolean;
  canPublishGlobal: boolean;
}

const toBoolean = (value: unknown): boolean =>
  value === true || value === "true" || value === "1" || value === 1;

const ResolveQuickAnswerVisibility = ({
  requestedGlobal,
  currentGlobal = false,
  canPublishGlobal
}: Request): boolean => {
  const nextGlobal =
    requestedGlobal === undefined
      ? currentGlobal
      : toBoolean(requestedGlobal);

  if (nextGlobal !== currentGlobal && !canPublishGlobal) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  return nextGlobal;
};

export default ResolveQuickAnswerVisibility;
