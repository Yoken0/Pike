const minuteLimit = readPositiveInt("AI_REQUESTS_PER_MINUTE", 10);
const dailyLimit = readPositiveInt("AI_REQUESTS_PER_DAY", 50);

type UserQuota = { minuteStartedAt: number; dayKey: string; minuteUsed: number; dailyUsed: number; lastSeenAt: number };
const quotas = new Map<string, UserQuota>();
let identitiesCreated = 0;

function readPositiveInt(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getUserQuota(userId: string, now = Date.now()): UserQuota {
  let state = quotas.get(userId);
  if (!state) {
    state = { minuteStartedAt: now, dayKey: new Date(now).toISOString().slice(0, 10), minuteUsed: 0, dailyUsed: 0, lastSeenAt: now };
    quotas.set(userId, state);
    identitiesCreated += 1;
    if (identitiesCreated % 100 === 0) {
      const staleBefore = now - 2 * 24 * 60 * 60 * 1000;
      quotas.forEach((quota, id) => {
        if (quota.lastSeenAt < staleBefore) quotas.delete(id);
      });
    }
  }
  state.lastSeenAt = now;

  if (now - state.minuteStartedAt >= 60_000) {
    state.minuteStartedAt = now;
    state.minuteUsed = 0;
  }
  const currentDay = new Date(now).toISOString().slice(0, 10);
  if (currentDay !== state.dayKey) {
    state.dayKey = currentDay;
    state.dailyUsed = 0;
  }
  return state;
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

export function getAiQuota(userId: string) {
  const state = getUserQuota(userId);
  const minuteResetAt = new Date(state.minuteStartedAt + 60_000);
  const dailyResetAt = new Date(`${state.dayKey}T00:00:00.000Z`);
  dailyResetAt.setUTCDate(dailyResetAt.getUTCDate() + 1);

  return {
    minute: { used: state.minuteUsed, limit: minuteLimit, remaining: Math.max(0, minuteLimit - state.minuteUsed), resetsAt: minuteResetAt.toISOString() },
    day: { used: state.dailyUsed, limit: dailyLimit, remaining: Math.max(0, dailyLimit - state.dailyUsed), resetsAt: dailyResetAt.toISOString() },
  };
}

export function assertAiQuotaAvailable(userId: string) {
  const quota = getAiQuota(userId);
  if (quota.minute.remaining <= 0 || quota.day.remaining <= 0) {
    const reset = quota.minute.remaining <= 0 ? quota.minute.resetsAt : quota.day.resetsAt;
    throw new AiQuotaError(Math.max(1, Math.ceil((new Date(reset).getTime() - Date.now()) / 1000)));
  }
}

export function consumeAiRequest(userId: string) {
  assertAiQuotaAvailable(userId);
  const state = getUserQuota(userId);
  state.minuteUsed += 1;
  state.dailyUsed += 1;
}
