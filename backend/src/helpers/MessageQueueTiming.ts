export const parseIntervalPattern = (value?: string | null): number[] => {
  return String(value || "")
    .split(":")
    .map(item => Number(item.trim()))
    .filter(item => Number.isFinite(item) && item > 0);
};

export const getNextIntervalSeconds = ({
  intervalPattern,
  fallbackSeconds,
  sentCount
}: {
  intervalPattern?: string | null;
  fallbackSeconds?: number | null;
  sentCount: number;
}): number => {
  const intervals = parseIntervalPattern(intervalPattern);

  if (intervals.length) {
    return intervals[sentCount % intervals.length];
  }

  return Number(fallbackSeconds || 30);
};

export const getPauseSeconds = ({
  pauseSeconds,
  pauseMinutes
}: {
  pauseSeconds?: number | string | null;
  pauseMinutes?: number | string | null;
}): number => {
  if (pauseMinutes !== undefined && pauseMinutes !== null && pauseMinutes !== "") {
    return Number(pauseMinutes) * 60;
  }

  return Number(pauseSeconds || 0);
};
