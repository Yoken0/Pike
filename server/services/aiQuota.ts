const minuteLimit = readPositiveInt("AI_REQUESTS_PER_MINUTE", 10);
const dailyLimit = readPositiveInt("AI_REQUESTS_PER_DAY", 50);

let minuteStartedAt = Date.now();
let dayKey = new Date().toISOString().slice(0, 10);
let minuteUsed = 0;
let dailyUsed = 0;

function readPositiveInt(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function refreshWindows(now = Date.now()) {
  if (now - minuteStartedAt >= 60_000) {
    minuteStartedAt = now;
    minuteUsed = 0;
  }

  const currentDay = new Date(now).toISOString().slice(0, 10);
  if (currentDay !== dayKey) {
    dayKey = currentDay;
    dailyUsed = 0;
  }
}

export class AiQuotaError extends Error {
  statusCode = 429;
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("AI request limit reached. Try again after the quota window resets.");
    this.name = "AiQuotaError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function getAiQuota() {
  refreshWindows();
  const minuteResetAt = new Date(minuteStartedAt + 60_000);
  const dailyResetAt = new Date(`${dayKey}T00:00:00.000Z`);
  dailyResetAt.setUTCDate(dailyResetAt.getUTCDate() + 1);

  return {
    minute: { used: minuteUsed, limit: minuteLimit, remaining: Math.max(0, minuteLimit - minuteUsed), resetsAt: minuteResetAt.toISOString() },
    day: { used: dailyUsed, limit: dailyLimit, remaining: Math.max(0, dailyLimit - dailyUsed), resetsAt: dailyResetAt.toISOString() },
  };
}

export function assertAiQuotaAvailable() {
  const quota = getAiQuota();
  if (quota.minute.remaining <= 0 || quota.day.remaining <= 0) {
    const reset = quota.minute.remaining <= 0 ? quota.minute.resetsAt : quota.day.resetsAt;
    throw new AiQuotaError(Math.max(1, Math.ceil((new Date(reset).getTime() - Date.now()) / 1000)));
  }
}

export function consumeAiRequest() {
  assertAiQuotaAvailable();
  minuteUsed += 1;
  dailyUsed += 1;
}
